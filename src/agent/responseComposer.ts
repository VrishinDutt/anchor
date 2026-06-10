import type { AgencyRisk, AnchorSession } from "./anchorEngine";
import type { ParsedTask } from "./taskParser";
import type { ResponsePlan } from "./responsePlanner";
import type { InputFrame } from "./inputFrame";
import type { TaskFrame } from "./taskFrame";
import type { CognitiveFrame } from "./cognitiveFrame";

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
  inputFrame?: InputFrame;
  taskFrame?: TaskFrame;
  cognitiveFrame?: CognitiveFrame;
  session?: AnchorSession;
}): string | null {
  const { input, task, responsePlan, agencyRisk, inputFrame, taskFrame, session } = params;
  if (!responsePlan) return null;

  const artifact = artifactLabel(task);
  const constraint = constraintLine(task);
  const nextAction = softNextAction(responsePlan.nextAction);
  const continuationReply = composeContinuationReply({
    inputFrame,
    taskFrame,
    responsePlan,
    session,
    nextAction,
  });

  if (continuationReply) return continuationReply;

  switch (responsePlan.hypothesis) {
    case "needs_agency_checkpoint": {
      if (agencyRisk === "low" && params.cognitiveFrame?.agencyPosture !== "outsourcing") return null;

      const artifactPhrase = describeArtifacts(task);

      return [
        `I can help build ${artifactPhrase}, but not as a blind submission pack.`,
        constraint ? `I will keep this boundary intact: ${constraint}` : null,
        "Give me one sentence first: what is Anchor trying to prove?",
        "After that I will structure the work around your own statement.",
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "needs_clarification": {
      if (isTaskBoundaryMissing(inputFrame, taskFrame)) {
        return "I need a task boundary first: build, debug, report, present, or decide?";
      }

      if (inputFrame?.isShort && inputFrame.emotionalTone === "confused") {
        return [
          "I do not have enough context yet.",
          "Choose the lane first: build, debug, report, present, or decide.",
        ].join("\n");
      }

      return [
        "I do not have a stable task boundary yet.",
        "Pick one lane so I do not invent the wrong work:",
        "",
        "1. Build",
        "2. Debug",
        "3. Report",
        "4. Present",
        "5. Decide",
      ].join("\n");
    }

    case "needs_language_refinement": {
      const refined = refineUserIdea(input);

      if (refined) {
        return [
          "Good - you already own the core idea.",
          `Refined version: ${refined}`,
        ].join("\n");
      }

      return [
        "Yes - this is a refinement task, not a replacement task.",
        "I will keep your intent fixed and sharpen the wording.",
        constraint ? `Boundary to preserve: ${constraint}` : null,
        "",
        "Meaning stays yours. Structure and phrasing get sharper.",
        "",
        `Use this next: ${nextAction}`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "needs_debugging_help": {
      const text = input.toLowerCase();

      if (
        inputFrame?.failureTarget === "claude" ||
        text.includes("claude") ||
        text.includes("llm") ||
        text.includes("deepen") ||
        text.includes("anthropic")
      ) {
        return [
          "Got it - this is a Claude/provider failure, not a decision problem.",
          "Don't change the agent logic yet. First isolate the failing layer:",
          "1. Is the app running through `npm run tauri dev`?",
          "2. Is `ANTHROPIC_API_KEY` set in this same Terminal session?",
          "3. What exact error appears in the Claude drawer or Rust terminal?",
          "Paste that error and I will patch the smallest layer.",
        ].join("\n");
      }

      if (inputFrame?.failureTarget === "frontend") {
        return [
          "This is a frontend/debugging failure, not a reason to redesign the agent.",
          "First isolate the UI symptom:",
          "1. Which button or screen failed?",
          "2. What changed on click: nothing, blank screen, drawer error, or terminal error?",
          "3. If the terminal says anything, paste the exact line.",
          "Then patch only the smallest failing layer.",
        ].join("\n");
      }

      if (inputFrame?.failureTarget === "build") {
        return [
          "This is a build failure. Treat the compiler as the source of truth.",
          "Run the failing command once, copy the first TypeScript/Rust error, and patch from the topmost local file mentioned.",
          "",
          "Useful next diagnostic:",
          responsePlan.nextPrompt ?? "Paste the exact build error text.",
        ].join("\n");
      }

      return [
        "This should be handled as a debugging path, not as a redesign.",
        "Changing several layers now would make the failure harder to locate.",
        "",
        "Debug order:",
        "1. Reproduce the failure once.",
        "2. Copy the exact error line.",
        "3. Identify whether it is frontend, agent logic, Tauri bridge, or provider/API.",
        "4. Patch only that layer.",
        "",
        responsePlan.nextPrompt ?? `Use this diagnostic: ${nextAction}`,
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
      const scaffold = artifactScaffold(task, nextAction);

      if (scaffold) {
        return [
          "Good. There is enough ownership here to build from.",
          constraint ? `Constraint to preserve: ${constraint}` : null,
          "",
          scaffold,
        ]
          .filter(Boolean)
          .join("\n");
      }

      return [
        `Good. There is enough ownership here to build the ${artifact} without overprotecting it.`,
        constraint ? `I’ll preserve this constraint: ${constraint}` : null,
        "",
        "The useful mode is scaffold, not shortcut.",
        "We should make the structure strong enough that you can explain it in viva.",
        "",
        `Use this next: ${nextAction}`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "needs_grounded_action": {
      if (isTaskBoundaryMissing(inputFrame, taskFrame)) {
        return "I need a task boundary first: build, debug, report, present, or decide?";
      }

      if (taskFrame?.isContinuation || inputFrame?.isContinuation) {
        return [
          "Continuing the current thread.",
          `The next useful step is: ${nextAction}`,
        ].join("\n");
      }

      return [
        "The next useful move is concrete.",
        `Start here: ${nextAction}`,
      ].join("\n");
    }

    case "healthy_progress": {
      if (inputFrame?.intentKind === "status_update") {
        return [
          "Good. That means the current layer is stable.",
          `Continue with the next bounded step: ${nextAction}`,
        ].join("\n");
      }

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

function composeContinuationReply(params: {
  inputFrame?: InputFrame;
  taskFrame?: TaskFrame;
  responsePlan: ResponsePlan;
  session?: AnchorSession;
  nextAction: string;
}) {
  const { inputFrame, taskFrame, responsePlan, session, nextAction } = params;
  const kind = inputFrame?.continuationKind ?? "none";

  if (kind === "none") return null;

  if (kind === "recover") {
    return "Something broke or changed. Send the exact failure, or tell me what action happened just before this.";
  }

  if (isTaskBoundaryMissing(inputFrame, taskFrame)) {
    return "I need a task boundary first: build, debug, report, present, or decide?";
  }

  if (
    kind === "confirm" &&
    session?.lastFailureTarget === "claude" &&
    (session.lastWorkType === "debug" || session.lastWorkType === "recover")
  ) {
    return "Good. That means the provider path is alive. Test one real Claude assist prompt before changing code.";
  }

  if (kind === "confirm" && (session?.lastWorkType === "debug" || session?.lastWorkType === "recover")) {
    return "Good. That means the failing path recovered. Re-run the same check once before expanding scope.";
  }

  if (kind === "advance") {
    return [
      "Continuing the current thread.",
      `The next useful step is: ${nextAction}`,
    ].join("\n");
  }

  if (kind === "complete") {
    return [
      "Good. Lock that checkpoint.",
      `Now the next bounded move is: ${nextAction}`,
    ].join("\n");
  }

  if (kind === "confirm") {
    return [
      "Good. Lock that checkpoint.",
      `Now the next bounded move is: ${nextAction}`,
    ].join("\n");
  }

  if (kind === "confused") {
    const simplerStep =
      session?.lastNextPrompt ||
      session?.lastResponsePlan?.nextAction ||
      responsePlan.nextPrompt ||
      responsePlan.nextAction;

    return [
      `Simplifying: ${softNextAction(simplerStep)}`,
      "Do only that, then come back with what changed.",
    ].join("\n");
  }

  return null;
}

function describeArtifacts(task: ParsedTask) {
  if (task.artifacts.includes("report") && task.artifacts.includes("ppt")) return "both";
  if (task.artifacts.length === 0) return "the artifact";
  if (task.artifacts.length === 1) return `the ${artifactLabel(task)}`;
  return `the ${task.artifacts.join(" and ")}`;
}

function isTaskBoundaryMissing(inputFrame?: InputFrame, taskFrame?: TaskFrame) {
  return Boolean(
    (inputFrame?.isContinuation || inputFrame?.intentKind === "project_planning") &&
      taskFrame?.missingInfo.includes("task boundary")
  );
}

function refineUserIdea(input: string) {
  const cleaned = input
    .trim()
    .replace(/^my idea is that\s*/i, "")
    .replace(/^my idea is\s*/i, "")
    .replace(/\b(help me\s*)?refine it\.?$/i, "")
    .replace(/\brefine this\.?$/i, "")
    .trim()
    .replace(/[.?!]+$/, "");

  const lower = cleaned.toLowerCase();

  if (lower.includes("anchor") && lower.includes("surrendering")) {
    return "Anchor is a metacognitive AI agent that helps users benefit from AI while preserving their own agency, critical thinking, and connection to grounded action.";
  }

  if (!cleaned) return null;

  const sentence = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

function artifactScaffold(task: ParsedTask, nextAction: string) {
  if (task.artifacts.includes("ppt")) {
    return [
      "PPT scaffold:",
      "1. Problem: AI convenience can weaken user agency.",
      "2. Solution: Anchor adds useful friction through visible reasoning and action cards.",
      "3. Architecture: input frame, task frame, cognitive frame, hypothesis scoring, response planning.",
      "4. Demo: provider failure, agency checkpoint, refinement, and continuation.",
      "5. Ethics: optional LLM use, no clinical claims, user remains responsible.",
      "",
      `Build from this: ${nextAction}`,
    ].join("\n");
  }

  if (task.artifacts.includes("report")) {
    return [
      "Report scaffold:",
      "1. Problem statement",
      "2. Agent goal and PEAS framing",
      "3. Reasoning pipeline",
      "4. Response policy and agency preservation",
      "5. Demo scenarios",
      "6. Ethics and limitations",
      "",
      `Build from this: ${nextAction}`,
    ].join("\n");
  }

  if (task.artifacts.includes("demo")) {
    return [
      "Demo scaffold:",
      "1. Show an agency-risk prompt.",
      "2. Show a debugging prompt.",
      "3. Show an owned refinement prompt.",
      "4. Open the reasoning drawer and explain the top hypothesis.",
      "",
      `Build from this: ${nextAction}`,
    ].join("\n");
  }

  return null;
}
