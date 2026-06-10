import type { ParsedTask } from "./taskParser";
import type { AnchorFeatures } from "./featureEngineering";
import type { InputFrame } from "./inputFrame";
import type { TaskFrame } from "./taskFrame";
import type { CognitiveFrame } from "./cognitiveFrame";

export type AnchorHypothesis =
  | "needs_clarification"
  | "needs_scaffold"
  | "needs_agency_checkpoint"
  | "needs_decision_support"
  | "needs_grounded_action"
  | "needs_language_refinement"
  | "needs_debugging_help"
  | "healthy_progress";

export type HypothesisScore = {
  hypothesis: AnchorHypothesis;
  score: number;
  reasons: string[];
  evidence: string[];
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const taskText = (parsedTask: ParsedTask) => {
  try {
    return JSON.stringify(parsedTask).toLowerCase();
  } catch {
    return "";
  }
};

const includesAny = (text: string, terms: string[]) =>
  terms.some((term) => text.includes(term));

export function scoreHypotheses(
  features: AnchorFeatures,
  parsedTask: ParsedTask,
  frame?: InputFrame,
  taskFrame?: TaskFrame,
  cognitiveFrame?: CognitiveFrame
): HypothesisScore[] {
  const text = taskText(parsedTask);
  const inputText = frame?.normalized ?? "";

  const hasDecisionSignal =
    (Boolean(frame?.isDecisionRequest) ||
      taskFrame?.workType === "decide" ||
      includesAny(text, ["decide", "decision", "choose", "priority", "first", "which"]) ||
      includesAny(inputText, ["whether", "which", "choose", "priority", "first", "or ppt", "or report"])) &&
    !Boolean(frame?.isDebugging) &&
    !Boolean(taskFrame?.isRecoverableFailure);

  const hasLanguageSignal =
    Boolean(frame?.isRefinementRequest) ||
    frame?.intentKind === "language_refinement" ||
    taskFrame?.workType === "refine" ||
    includesAny(text, [
      "refine",
      "rewrite",
      "wording",
      "problem statement",
      "abstract",
      "improve",
      "polish",
    ]);

  const hasDebugSignal =
    Boolean(frame?.isDebugging) ||
    taskFrame?.workType === "debug" ||
    taskFrame?.workType === "recover" ||
    cognitiveFrame?.interventionNeed === "debug" ||
    includesAny(text, [
      "error",
      "bug",
      "traceback",
      "not working",
      "failed",
      "fix",
      "crash",
    ]);

  const hasLlmProviderSignal = Boolean(frame?.isLlmProviderIssue || frame?.failureTarget === "claude");
  const hasCasualFailureSignal = Boolean(frame?.isCasualFailure || frame?.intentKind === "casual_failure");
  const isRecoverableFailure = Boolean(taskFrame?.isRecoverableFailure || cognitiveFrame?.agencyPosture === "recovering");
  const hasDirectArtifactSignal =
    Boolean(frame?.isArtifactRequest) ||
    frame?.intentKind === "artifact_creation";
  const hasArtifactSignal =
    hasDirectArtifactSignal ||
    Boolean(taskFrame?.artifactFocus.length) ||
    parsedTask.artifacts.length > 0;
  const hasOutsourcingSignal =
    Boolean(frame?.isOutsourcingRequest) ||
    cognitiveFrame?.agencyPosture === "outsourcing";
  const hasOwnershipSignal =
    cognitiveFrame?.agencyPosture === "owning" ||
    features.ownershipSignal >= 0.25;
  const hasActiveContinuation =
    Boolean(taskFrame?.isContinuation) ||
    Boolean(frame?.isContinuation) ||
    features.continuationSignal >= 0.75;
  const vagueContinuation = Boolean(
    frame?.isShort &&
      includesAny(inputText, ["next", "proceed", "continue", "done", "works", "cool"])
  );
  const shortConfusion = Boolean(
    frame?.isShort &&
      includesAny(inputText, ["huh", "what", "oops", "confused"])
  );
  const noActiveTaskBoundary = Boolean(taskFrame?.missingInfo.includes("task boundary"));

  const scores: HypothesisScore[] = [
    {
      hypothesis: "needs_agency_checkpoint",
      score: clamp01(
        features.agencyRisk * 0.45 +
          features.artifactPressure * 0.2 +
          (hasOutsourcingSignal ? 0.55 : 0) +
          (taskFrame?.shouldPreserveUserOwnership ? 0.16 : 0) -
          (hasDecisionSignal ? 0.35 : 0) -
          (hasDebugSignal ? 0.65 : 0) -
          (hasOwnershipSignal ? 0.18 : 0)
      ),
      reasons: [
        hasOutsourcingSignal
          ? "The request asks Anchor to produce a submission-scale artifact without enough user-owned claim."
          : "High artifact pressure can indicate a risk of passive outsourcing.",
        "Agency checkpoint protects user ownership before generating large artifacts.",
      ],
      evidence: compactEvidence([
        hasOutsourcingSignal ? "outsourcing language" : null,
        taskFrame?.shouldPreserveUserOwnership ? "ownership preservation required" : null,
        features.artifactPressure > 0 ? `artifactPressure=${features.artifactPressure.toFixed(2)}` : null,
      ]),
    },
    {
      hypothesis: "needs_clarification",
      score: clamp01(
        features.uncertainty * 0.45 +
          (1 - features.intentClarity) * 0.28 +
          (shortConfusion ? 0.26 : 0) +
          (noActiveTaskBoundary ? 0.35 : 0) -
          (hasDebugSignal ? 0.35 : 0) -
          (hasActiveContinuation ? 0.18 : 0)
      ),
      reasons: [
        noActiveTaskBoundary
          ? "The user is asking to continue, but there is no active task boundary."
          : "The request has uncertainty or low intent clarity.",
        shortConfusion
          ? "A short confusion signal needs a small clarification rather than a full answer."
          : "Clarifying the task boundary prevents a wrong response.",
      ],
      evidence: compactEvidence([
        shortConfusion ? "short confusion signal" : null,
        noActiveTaskBoundary ? "missing task boundary" : null,
        `uncertainty=${features.uncertainty.toFixed(2)}`,
      ]),
    },
    {
      hypothesis: "needs_scaffold",
      score: clamp01(
        features.artifactPressure * 0.24 +
          features.ownershipSignal * 0.34 +
          features.taskSpecificity * 0.18 +
          (hasArtifactSignal && hasOwnershipSignal ? 0.38 : 0) +
          (hasDirectArtifactSignal && hasActiveContinuation ? 0.35 : 0) -
          (hasDebugSignal ? 0.5 : 0) -
          (hasOutsourcingSignal ? 0.25 : 0)
      ),
      reasons: [
        hasOwnershipSignal
          ? "The user appears to have enough ownership to receive structure."
          : "A scaffold is useful when artifact work needs structure without a blind final answer.",
        "A scaffold supports progress without replacing thinking.",
      ],
      evidence: compactEvidence([
        hasDirectArtifactSignal ? "artifact request" : null,
        !hasDirectArtifactSignal && hasArtifactSignal ? "artifact context" : null,
        hasOwnershipSignal ? "ownership signal" : null,
        hasActiveContinuation ? "active task continuation" : null,
      ]),
    },
    {
      hypothesis: "needs_decision_support",
      score: clamp01(
        (hasDecisionSignal ? 0.62 : 0) +
          features.uncertainty * 0.18 +
          features.cognitiveLoad * 0.12 -
          (hasDebugSignal ? 0.75 : 0) -
          (isRecoverableFailure ? 0.55 : 0)
      ),
      reasons: [
        "The request appears to involve choosing between options.",
        "A transparent decision lens is more useful than a generic answer.",
      ],
      evidence: compactEvidence([
        hasDecisionSignal ? "choice or sequencing language" : null,
        hasDebugSignal ? "debug signal suppresses decision support" : null,
      ]),
    },
    {
      hypothesis: "needs_grounded_action",
      score: clamp01(
        features.actionability * 0.42 +
          features.intentClarity * 0.22 +
          (hasActiveContinuation && vagueContinuation ? 0.55 : 0) +
          (hasActiveContinuation && frame?.intentKind === "status_update" ? 0.38 : 0) -
          (hasDebugSignal ? 0.3 : 0) -
          (hasOutsourcingSignal ? 0.22 : 0)
      ),
      reasons: [
        hasActiveContinuation
          ? "The user is continuing an active task and needs the next grounded move."
          : "The request contains action-oriented signals.",
        "The best response is a concrete next step.",
      ],
      evidence: compactEvidence([
        hasActiveContinuation ? "active task" : null,
        vagueContinuation ? "vague continuation command" : null,
        `actionability=${features.actionability.toFixed(2)}`,
      ]),
    },
    {
      hypothesis: "needs_language_refinement",
      score: clamp01(
        (hasLanguageSignal ? 0.68 : 0) +
          features.ownershipSignal * 0.22 +
          features.taskSpecificity * 0.1 +
          (hasOwnershipSignal ? 0.14 : 0) -
          (hasDebugSignal ? 0.55 : 0)
      ),
      reasons: [
        "The request appears to ask for refinement rather than full replacement.",
        "Language support can preserve the user's original intent.",
      ],
      evidence: compactEvidence([
        hasLanguageSignal ? "refinement language" : null,
        hasOwnershipSignal ? "owned idea present" : null,
      ]),
    },
    {
      hypothesis: "needs_debugging_help",
      score: clamp01(
        (hasDebugSignal ? 0.76 : 0) +
          (hasLlmProviderSignal ? 0.22 : 0) +
          (hasCasualFailureSignal ? 0.1 : 0) +
          (isRecoverableFailure ? 0.08 : 0) +
          (frame?.failureTarget ? 0.06 : 0) +
          features.actionability * 0.05 +
          features.uncertainty * 0.05
      ),
      reasons: [
        hasLlmProviderSignal
          ? "The request points to an LLM/provider integration issue, so debugging should dominate decision support."
          : "The request appears to involve an error, bug, or broken behavior.",
        hasCasualFailureSignal
          ? "The user is reporting failure casually, so respond directly without over-formal scaffolding."
          : "Debugging should proceed through concrete checks.",
      ],
      evidence: compactEvidence([
        frame?.failureTarget ? `failureTarget=${frame.failureTarget}` : null,
        hasLlmProviderSignal ? "provider signal" : null,
        hasCasualFailureSignal ? "casual failure signal" : null,
        taskFrame?.missingInfo.length ? `missing=${taskFrame.missingInfo.join(", ")}` : null,
      ]),
    },
    {
      hypothesis: "healthy_progress",
      score: clamp01(
        features.ownershipSignal * 0.4 +
          features.intentClarity * 0.35 +
          (1 - features.agencyRisk) * 0.18 +
          (frame?.intentKind === "status_update" ? 0.32 : 0) +
          (hasActiveContinuation && !shortConfusion ? 0.12 : 0) -
          (hasDirectArtifactSignal ? 0.15 : 0) -
          (hasDebugSignal ? 0.45 : 0) -
          (hasOutsourcingSignal ? 0.35 : 0)
      ),
      reasons: [
        "The user shows ownership and usable task clarity.",
        "A direct response is appropriate when agency risk is low.",
      ],
      evidence: compactEvidence([
        frame?.intentKind === "status_update" ? "status update" : null,
        features.ownershipSignal > 0 ? `ownership=${features.ownershipSignal.toFixed(2)}` : null,
        hasDebugSignal ? "debug signal suppresses progress" : null,
      ]),
    },
  ];

  return scores.sort((a, b) => b.score - a.score);
}

export function selectBestHypothesis(scores: HypothesisScore[]): HypothesisScore {
  return scores[0];
}

function compactEvidence(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value));
}
