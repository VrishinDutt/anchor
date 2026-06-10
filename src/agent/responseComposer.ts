import type { AgencyRisk } from "./anchorEngine";
import type { ParsedTask } from "./taskParser";
import type { ResponsePlan } from "./responsePlanner";

const artifactLabel = (task: ParsedTask) => {
  if (task.artifacts.includes("report")) return "report";
  if (task.artifacts.includes("ppt")) return "presentation";
  if (task.artifacts.includes("demo")) return "demo";
  if (task.artifacts.includes("viva")) return "viva prep";
  if (task.artifacts.includes("code")) return "code";
  if (task.artifacts.includes("app")) return "app";
  return "task";
};

const constraintLine = (task: ParsedTask) => {
  if (task.constraints.length === 0) return null;

  const strongest = task.constraints[0]
    .replace("Must ", "It still has to ")
    .replace("Should ", "It should ");

  return strongest.endsWith(".") ? strongest : `${strongest}.`;
};

const softNextAction = (action: string) =>
  action
    .replace("Do the next", "Start with the next")
    .replace("Build the", "Build a usable")
    .replace("Write one sentence", "Give me one honest sentence");

export function composePlannedReply(params: {
  input: string;
  task: ParsedTask;
  responsePlan?: ResponsePlan;
  agencyRisk: AgencyRisk;
}): string | null {
  const { task, responsePlan, agencyRisk } = params;
  if (!responsePlan) return null;

  const artifact = artifactLabel(task);
  const constraint = constraintLine(task);
  const nextAction = softNextAction(responsePlan.nextAction);

  switch (responsePlan.hypothesis) {
    case "needs_agency_checkpoint": {
      if (agencyRisk === "low") return null;

      return [
        `I can help with the ${artifact}, but I do not want to turn this into a clean-looking submission that you do not own.`,
        constraint ? `I’ll keep this boundary intact: ${constraint}` : null,
        "",
        "Before I expand anything, give me one sentence:",
        "",
        "What is the core idea you want this work to prove?",
        "",
        "After that, I’ll structure the artifact around your sentence instead of replacing your thinking.",
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "needs_clarification": {
      return [
        "I do not have a stable task boundary yet.",
        "That means any full answer right now would be guesswork.",
        "",
        "Pick one lane:",
        "1. Define the idea",
        "2. Build or patch the code",
        "3. Debug a failure",
        "4. Prepare report content",
        "5. Prepare the presentation/demo",
        "",
        `Smallest next move: ${nextAction}`,
      ].join("\n");
    }

    case "needs_language_refinement": {
      return [
        "Yes — this is a refinement task, not a replacement task.",
        "I’ll keep your original intent fixed and improve the wording around it.",
        constraint ? `Boundary to preserve: ${constraint}` : null,
        "",
        "Use this refinement rule:",
        "Meaning stays yours. Structure and phrasing get sharper.",
        "",
        `Next move: ${nextAction}`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "needs_debugging_help": {
      return [
        "This should be handled as a debugging path, not as a redesign.",
        "The mistake would be changing too many layers before we know what failed.",
        "",
        "Debug order:",
        "1. Reproduce the failure once.",
        "2. Copy the exact error line.",
        "3. Identify whether it is frontend, agent logic, Tauri bridge, or provider/API.",
        "4. Patch only that layer.",
        "",
        `Next move: ${nextAction}`,
      ].join("\n");
    }

    case "needs_decision_support": {
      return [
        "This is not mainly a motivation problem; it is a sequencing problem.",
        "Use a quick decision lens instead of trying to feel certain.",
        "",
        "For each option, score:",
        "- urgency",
        "- consequence",
        "- importance",
        "- effort",
        "",
        "Then use:",
        "priority = urgency + consequence + importance - effort",
        "",
        "Pick the highest score and do only the first 20 minutes of it.",
      ].join("\n");
    }

    case "needs_scaffold": {
      return [
        `Good. There is enough ownership here to build the ${artifact} without overprotecting it.`,
        constraint ? `I’ll preserve this constraint: ${constraint}` : null,
        "",
        "The useful mode is scaffold, not shortcut.",
        "We should make the structure strong enough that you can explain it in viva.",
        "",
        `Next move: ${nextAction}`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "needs_grounded_action": {
      return [
        "The next useful move is concrete.",
        "Do not expand the plan yet.",
        "",
        `Next move: ${nextAction}`,
      ].join("\n");
    }

    case "healthy_progress": {
      return [
        "You are not outsourcing the task here; you are steering it.",
        "So Anchor can assist more directly without forcing a checkpoint.",
        "",
        `Keep the scope bounded: ${nextAction}`,
      ].join("\n");
    }

    default:
      return null;
  }
}
