import type { ParsedTask } from "./taskParser";
import type { AnchorFeatures } from "./featureEngineering";
import type { AnchorHypothesis, HypothesisScore } from "./reasoningModel";
import type { InputFrame } from "./inputFrame";
import type { TaskFrame } from "./taskFrame";
import type { CognitiveFrame } from "./cognitiveFrame";

export type ResponseStance =
  | "direct"
  | "reflective"
  | "scaffold"
  | "checkpoint"
  | "decision";

export type AllowedDepth = "micro" | "medium" | "full";

export type UserWorkRequired = "none" | "small" | "moderate";

export type ResponseTone = "calm" | "technical" | "casual-direct" | "academic" | "firm";

export type ExplanationLevel = "none" | "brief" | "visible";

export type ResponsePlan = {
  hypothesis: AnchorHypothesis;
  stance: ResponseStance;
  shouldAskQuestion: boolean;
  allowedDepth: AllowedDepth;
  userWorkRequired: UserWorkRequired;
  openingMove: string;
  nextAction: string;
  reasons: string[];
  tone?: ResponseTone;
  explanationLevel?: ExplanationLevel;
  needsUserInput?: boolean;
  nextPrompt?: string;
  blockedBehaviors?: string[];
};

const taskLabel = (parsedTask: ParsedTask, inputFrame?: InputFrame) => {
  try {
    const directText = inputFrame?.normalized ?? "";

    if (directText.includes("ppt") || directText.includes("presentation") || directText.includes("slides")) {
      return "presentation flow";
    }

    if (directText.includes("report")) return "report structure";
    if (directText.includes("demo")) return "demo flow";
    if (directText.includes("viva")) return "viva explanation";
    if (directText.includes("code") || directText.includes("debug") || directText.includes("error")) {
      return "code/debugging step";
    }

    const text = JSON.stringify(parsedTask).toLowerCase();

    if (text.includes("report")) return "report structure";
    if (text.includes("ppt") || text.includes("presentation") || text.includes("slides")) return "presentation flow";
    if (text.includes("code") || text.includes("debug") || text.includes("error")) return "code/debugging step";
    if (text.includes("demo")) return "demo flow";
    if (text.includes("viva")) return "viva explanation";

    return "task";
  } catch {
    return "task";
  }
};

export function createResponsePlan(
  bestHypothesis: HypothesisScore,
  features: AnchorFeatures,
  parsedTask: ParsedTask,
  inputFrame?: InputFrame,
  taskFrame?: TaskFrame,
  cognitiveFrame?: CognitiveFrame
): ResponsePlan {
  const label = taskLabel(parsedTask, inputFrame);
  const requestedDepth = inputFrame?.requestedDepth ?? "medium";
  const providerDebugging =
    bestHypothesis.hypothesis === "needs_debugging_help" &&
    (inputFrame?.failureTarget === "claude" || inputFrame?.isLlmProviderIssue);
  const casualDebugging =
    inputFrame?.register === "casual" || inputFrame?.intentKind === "casual_failure";
  const academicTone =
    inputFrame?.register === "academic" || parsedTask.domain === "academic-project";

  switch (bestHypothesis.hypothesis) {
    case "needs_agency_checkpoint":
      return {
        hypothesis: bestHypothesis.hypothesis,
        stance: "checkpoint",
        tone: "firm",
        explanationLevel: "brief",
        shouldAskQuestion: true,
        allowedDepth: "micro",
        userWorkRequired: "small",
        needsUserInput: true,
        nextPrompt: "What is Anchor trying to prove in one sentence?",
        blockedBehaviors: [
          "blind submission pack",
          "full artifact generation before ownership checkpoint",
        ],
        openingMove:
          "Before I generate the full artifact, give me one sentence of your current understanding.",
        nextAction:
          "Write one sentence of what you think the project is trying to prove; then Anchor can structure it without taking the thinking away.",
        reasons: bestHypothesis.reasons,
      };

    case "needs_clarification":
      return {
        hypothesis: bestHypothesis.hypothesis,
        stance: "reflective",
        tone: "calm",
        explanationLevel: "brief",
        shouldAskQuestion: true,
        allowedDepth: "micro",
        userWorkRequired: "small",
        needsUserInput: true,
        nextPrompt: taskFrame?.missingInfo.includes("task boundary")
          ? "Choose one boundary: build, debug, report, present, or decide."
          : "What output do you want Anchor to help with?",
        openingMove:
          "I’m missing the task boundary. Choose one direction so I can hold the thread properly.",
        nextAction: "Choose one: define, build, debug, report, present.",
        reasons: bestHypothesis.reasons,
      };

    case "needs_scaffold":
      return {
        hypothesis: bestHypothesis.hypothesis,
        stance: "scaffold",
        tone: academicTone ? "academic" : "calm",
        explanationLevel: requestedDepth === "full" ? "visible" : "brief",
        shouldAskQuestion: false,
        allowedDepth: requestedDepth === "full" || features.taskSpecificity > 0.7 ? "full" : "medium",
        userWorkRequired: "small",
        needsUserInput: false,
        openingMove:
          "Good, this is enough to build from. I’ll preserve your constraint and give you the next usable structure.",
        nextAction: `Build the ${label} as a scaffold, not a blind final answer.`,
        reasons: bestHypothesis.reasons,
      };

    case "needs_decision_support":
      return {
        hypothesis: bestHypothesis.hypothesis,
        stance: "decision",
        tone: "calm",
        explanationLevel: "visible",
        shouldAskQuestion: false,
        allowedDepth: "medium",
        userWorkRequired: "small",
        needsUserInput: false,
        openingMove:
          "This is a decision problem. I’ll reduce it to priority, consequence, and effort.",
        nextAction: "Score each option using: priority = urgency + consequence + importance - effort.",
        reasons: bestHypothesis.reasons,
      };

    case "needs_grounded_action":
      return {
        hypothesis: bestHypothesis.hypothesis,
        stance: "direct",
        tone: "calm",
        explanationLevel: "none",
        shouldAskQuestion: false,
        allowedDepth: "micro",
        userWorkRequired: "none",
        needsUserInput: Boolean(taskFrame?.missingInfo.includes("task boundary")),
        nextPrompt: taskFrame?.missingInfo.includes("task boundary")
          ? "Choose one boundary: build, debug, report, present, or decide."
          : undefined,
        openingMove: "The next useful move is concrete.",
        nextAction: `Do the next ${label} action now, then reassess.`,
        reasons: bestHypothesis.reasons,
      };

    case "needs_language_refinement":
      return {
        hypothesis: bestHypothesis.hypothesis,
        stance: "scaffold",
        tone: academicTone ? "academic" : "calm",
        explanationLevel: "brief",
        shouldAskQuestion: false,
        allowedDepth: "medium",
        userWorkRequired: "small",
        needsUserInput: false,
        openingMove:
          "I’ll refine the wording while preserving your original intent.",
        nextAction: "Keep the meaning fixed; improve clarity, precision, and presentation.",
        reasons: bestHypothesis.reasons,
      };

    case "needs_debugging_help":
      return {
        hypothesis: bestHypothesis.hypothesis,
        stance: "direct",
        tone: providerDebugging
          ? casualDebugging
            ? "casual-direct"
            : "technical"
          : casualDebugging
            ? "casual-direct"
            : "technical",
        explanationLevel: "visible",
        shouldAskQuestion: false,
        allowedDepth: "medium",
        userWorkRequired: "small",
        needsUserInput: true,
        nextPrompt: providerDebugging
          ? "Paste the exact Claude error text."
          : taskFrame?.missingInfo.includes("exact error text")
            ? "Paste the exact error text."
            : "Tell me the smallest reproduction step.",
        blockedBehaviors: [
          "redesigning before reproducing the failure",
          "changing agent logic before isolating the failing layer",
        ],
        openingMove:
          "This is a debugging path. We should inspect the failure before changing architecture.",
        nextAction: "Check the exact error, reproduce it once, then patch the smallest failing layer.",
        reasons: bestHypothesis.reasons,
      };

    case "healthy_progress":
    default:
      return {
        hypothesis: bestHypothesis.hypothesis,
        stance: "direct",
        tone: "calm",
        explanationLevel: cognitiveFrame?.interventionNeed === "none" ? "none" : "brief",
        shouldAskQuestion: false,
        allowedDepth: inputFrame?.intentKind === "status_update" ? "micro" : "medium",
        userWorkRequired: "none",
        needsUserInput: false,
        openingMove:
          "You have enough ownership and clarity to move forward.",
        nextAction: `Continue with the ${label} and keep the next step bounded.`,
        reasons: bestHypothesis.reasons,
      };
  }
}
