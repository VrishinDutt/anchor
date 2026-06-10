import type { ParsedTask } from "./taskParser";
import type { AnchorFeatures } from "./featureEngineering";

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
  parsedTask: ParsedTask
): HypothesisScore[] {
  const text = taskText(parsedTask);

  const hasDecisionSignal = includesAny(text, [
    "decide",
    "decision",
    "choose",
    "priority",
    "first",
    "which",
    "or",
  ]);

  const hasLanguageSignal = includesAny(text, [
    "refine",
    "rewrite",
    "wording",
    "problem statement",
    "abstract",
    "improve",
    "polish",
  ]);

  const hasDebugSignal = includesAny(text, [
    "error",
    "bug",
    "traceback",
    "not working",
    "failed",
    "fix",
    "crash",
  ]);

  const scores: HypothesisScore[] = [
    {
      hypothesis: "needs_agency_checkpoint",
      score: clamp01(features.agencyRisk * 0.65 + features.artifactPressure * 0.35),
      reasons: [
        "High artifact pressure can indicate a risk of passive outsourcing.",
        "Agency checkpoint protects user ownership before generating large artifacts.",
      ],
    },
    {
      hypothesis: "needs_clarification",
      score: clamp01(features.uncertainty * 0.6 + (1 - features.intentClarity) * 0.4),
      reasons: [
        "The request has uncertainty or low intent clarity.",
        "Clarifying the task boundary prevents a wrong response.",
      ],
    },
    {
      hypothesis: "needs_scaffold",
      score: clamp01(
        features.artifactPressure * 0.35 +
          features.ownershipSignal * 0.35 +
          features.taskSpecificity * 0.3
      ),
      reasons: [
        "The user appears to have enough ownership to receive structure.",
        "A scaffold supports progress without replacing thinking.",
      ],
    },
    {
      hypothesis: "needs_decision_support",
      score: clamp01((hasDecisionSignal ? 0.55 : 0) + features.uncertainty * 0.25 + features.cognitiveLoad * 0.2),
      reasons: [
        "The request appears to involve choosing between options.",
        "A transparent decision lens is more useful than a generic answer.",
      ],
    },
    {
      hypothesis: "needs_grounded_action",
      score: clamp01(features.actionability * 0.65 + features.intentClarity * 0.35),
      reasons: [
        "The request contains action-oriented signals.",
        "The best response is a concrete next step.",
      ],
    },
    {
      hypothesis: "needs_language_refinement",
      score: clamp01((hasLanguageSignal ? 0.65 : 0) + features.ownershipSignal * 0.25 + features.taskSpecificity * 0.1),
      reasons: [
        "The request appears to ask for refinement rather than full replacement.",
        "Language support can preserve the user's original intent.",
      ],
    },
    {
      hypothesis: "needs_debugging_help",
      score: clamp01((hasDebugSignal ? 0.75 : 0) + features.actionability * 0.15 + features.uncertainty * 0.1),
      reasons: [
        "The request appears to involve an error, bug, or broken behavior.",
        "Debugging should proceed through concrete checks.",
      ],
    },
    {
      hypothesis: "healthy_progress",
      score: clamp01(
        features.ownershipSignal * 0.4 +
          features.intentClarity * 0.35 +
          (1 - features.agencyRisk) * 0.25
      ),
      reasons: [
        "The user shows ownership and usable task clarity.",
        "A direct response is appropriate when agency risk is low.",
      ],
    },
  ];

  return scores.sort((a, b) => b.score - a.score);
}

export function selectBestHypothesis(scores: HypothesisScore[]): HypothesisScore {
  return scores[0];
}
