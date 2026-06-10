import type { ParsedTask } from "./taskParser";
import type { AnchorFeatures } from "./featureEngineering";
import type { AnchorHypothesis, HypothesisScore } from "./reasoningModel";

export type ResponseStance =
  | "direct"
  | "reflective"
  | "scaffold"
  | "checkpoint"
  | "decision";

export type AllowedDepth = "micro" | "medium" | "full";

export type UserWorkRequired = "none" | "small" | "moderate";

export type ResponsePlan = {
  hypothesis: AnchorHypothesis;
  stance: ResponseStance;
  shouldAskQuestion: boolean;
  allowedDepth: AllowedDepth;
  userWorkRequired: UserWorkRequired;
  openingMove: string;
  nextAction: string;
  reasons: string[];
};

const taskLabel = (parsedTask: ParsedTask) => {
  try {
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
  parsedTask: ParsedTask
): ResponsePlan {
  const label = taskLabel(parsedTask);

  switch (bestHypothesis.hypothesis) {
    case "needs_agency_checkpoint":
      return {
        hypothesis: bestHypothesis.hypothesis,
        stance: "checkpoint",
        shouldAskQuestion: true,
        allowedDepth: "micro",
        userWorkRequired: "small",
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
        shouldAskQuestion: true,
        allowedDepth: "micro",
        userWorkRequired: "small",
        openingMove:
          "I’m missing the task boundary. Choose one direction so I can hold the thread properly.",
        nextAction: "Choose one: define, build, debug, report, present.",
        reasons: bestHypothesis.reasons,
      };

    case "needs_scaffold":
      return {
        hypothesis: bestHypothesis.hypothesis,
        stance: "scaffold",
        shouldAskQuestion: false,
        allowedDepth: features.taskSpecificity > 0.7 ? "full" : "medium",
        userWorkRequired: "small",
        openingMove:
          "Good, this is enough to build from. I’ll preserve your constraint and give you the next usable structure.",
        nextAction: `Build the ${label} as a scaffold, not a blind final answer.`,
        reasons: bestHypothesis.reasons,
      };

    case "needs_decision_support":
      return {
        hypothesis: bestHypothesis.hypothesis,
        stance: "decision",
        shouldAskQuestion: false,
        allowedDepth: "medium",
        userWorkRequired: "small",
        openingMove:
          "This is a decision problem. I’ll reduce it to priority, consequence, and effort.",
        nextAction: "Score each option using: priority = urgency + consequence + importance - effort.",
        reasons: bestHypothesis.reasons,
      };

    case "needs_grounded_action":
      return {
        hypothesis: bestHypothesis.hypothesis,
        stance: "direct",
        shouldAskQuestion: false,
        allowedDepth: "micro",
        userWorkRequired: "none",
        openingMove: "The next useful move is concrete.",
        nextAction: `Do the next ${label} action now, then reassess.`,
        reasons: bestHypothesis.reasons,
      };

    case "needs_language_refinement":
      return {
        hypothesis: bestHypothesis.hypothesis,
        stance: "scaffold",
        shouldAskQuestion: false,
        allowedDepth: "medium",
        userWorkRequired: "small",
        openingMove:
          "I’ll refine the wording while preserving your original intent.",
        nextAction: "Keep the meaning fixed; improve clarity, precision, and presentation.",
        reasons: bestHypothesis.reasons,
      };

    case "needs_debugging_help":
      return {
        hypothesis: bestHypothesis.hypothesis,
        stance: "direct",
        shouldAskQuestion: false,
        allowedDepth: "medium",
        userWorkRequired: "small",
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
        shouldAskQuestion: false,
        allowedDepth: "medium",
        userWorkRequired: "none",
        openingMove:
          "You have enough ownership and clarity to move forward.",
        nextAction: `Continue with the ${label} and keep the next step bounded.`,
        reasons: bestHypothesis.reasons,
      };
  }
}
