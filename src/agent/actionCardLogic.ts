import type { ActionCard } from "./anchorEngine";
import type { ResponsePlan } from "./responsePlanner";


export function inferActionCardFromPlan(responsePlan: ResponsePlan): ActionCard {
  switch (responsePlan.hypothesis) {
    case "needs_agency_checkpoint":
      return {
        title: "Protect ownership first",
        steps: [
          "Write one sentence of your current understanding.",
          "Name what you want the artifact to prove.",
          "Then generate the structure without outsourcing the thinking.",
        ],
      };

    case "needs_clarification":
      return {
        title: "Choose the task boundary",
        steps: [
          "Pick one direction: define, build, debug, report, or present.",
          "State the expected output in one line.",
          "Then continue with the smallest useful step.",
        ],
      };

    case "needs_scaffold":
      return {
        title: "Use a scaffold, not a shortcut",
        steps: [
          "Keep your original idea fixed.",
          "Build the structure around it.",
          "Fill one section or module before polishing.",
        ],
      };

    case "needs_decision_support":
      return {
        title: "Score the options",
        steps: [
          "List the options.",
          "Score urgency, consequence, importance, and effort.",
          "Pick the highest-priority next move.",
        ],
      };

    case "needs_language_refinement":
      return {
        title: "Refine without replacing intent",
        steps: [
          "Keep the original meaning fixed.",
          "Improve clarity and precision.",
          "Check whether the final wording still sounds like your project.",
        ],
      };

    case "needs_debugging_help":
      return {
        title: "Debug the smallest failing layer",
        steps: [
          "Reproduce the error once.",
          "Read the exact failing line.",
          "Patch only the smallest broken layer first.",
        ],
      };

    case "needs_grounded_action":
      return {
        title: "Take the concrete next step",
        steps: [
          responsePlan.nextAction,
          "Run or verify the result.",
          "Then reassess before expanding scope.",
        ],
      };

    case "healthy_progress":
    default:
      return {
        title: "Continue with control",
        steps: [
          "Keep the next step bounded.",
          "Avoid expanding the task too early.",
          "Use Anchor only to hold the thread.",
        ],
      };
  }
}


export function inferActionCardFromReply(reply: string): ActionCard | null {
  const text = reply.toLowerCase();

  if (text.includes("report structure")) {
    return {
      title: "Start the report",
      steps: [
        "Write section 1: Introduction.",
        "Write section 2: Problem Statement.",
        "Do not polish formatting until the argument is complete.",
      ],
    };
  }

  if (text.includes("ppt flow") || text.includes("slide 1")) {
    return {
      title: "Build the slide skeleton",
      steps: [
        "Create the title slide.",
        "Create slides for problem, solution, architecture, demo, and ethics.",
        "Add visuals only after the slide order is clear.",
      ],
    };
  }

  if (text.includes("demo script")) {
    return {
      title: "Prepare the demo path",
      steps: [
        "Test the false mastery prompt.",
        "Test the checkpoint continuation flow.",
        "Test report, PPT, demo, and decision lens artifact routing.",
      ],
    };
  }

  if (text.includes("implementation scaffold") || text.includes("core modules")) {
    return {
      title: "Build the next module",
      steps: [
        "Choose one module to improve.",
        "Patch behavior before polishing UI.",
        "Run the app and test with one realistic prompt.",
      ],
    };
  }

  if (text.includes("viva explanation")) {
    return {
      title: "Prepare viva answers",
      steps: [
        "Memorize the one-line definition.",
        "Explain why Anchor is an agent, not a wrapper.",
        "Prepare PEAS, agent type, architecture, and ethics answers.",
      ],
    };
  }

  if (text.includes("project definition draft")) {
    return {
      title: "Lock the concept",
      steps: [
        "Use the project definition as the report introduction base.",
        "Preserve the non-wrapper and non-therapy boundaries.",
        "Move next to report, PPT, demo, or code.",
      ],
    };
  }

  return null;
}
