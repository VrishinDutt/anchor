import type { InputFrame } from "./inputFrame";
import type { ParsedTask } from "./taskParser";

type SessionLike = {
  activeTask?: ParsedTask;
  awaitingCheckpoint?: boolean;
  lastFailureTarget?: InputFrame["failureTarget"];
  lastIntentKind?: InputFrame["intentKind"];
  lastWorkType?: TaskFrame["workType"];
};

export type TaskFrame = {
  primaryGoal: string;
  workType:
    | "build"
    | "debug"
    | "write"
    | "present"
    | "decide"
    | "learn"
    | "refine"
    | "recover"
    | "continue";
  artifactFocus: string[];
  constraints: string[];
  missingInfo: string[];
  isContinuation: boolean;
  isRecoverableFailure: boolean;
  shouldPreserveUserOwnership: boolean;
};

const hasAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

export function buildTaskFrame(
  inputFrame: InputFrame,
  parsedTask: ParsedTask,
  session?: SessionLike
): TaskFrame {
  const hasContinuationMemory = Boolean(
    session?.activeTask ||
      session?.lastFailureTarget ||
      session?.lastIntentKind ||
      session?.lastWorkType
  );
  const isContinuation =
    inputFrame.isContinuation ||
    (hasContinuationMemory &&
      (inputFrame.intentKind === "status_update" ||
        hasAny(inputFrame.normalized, ["proceed", "continue", "next"])));

  const artifactFocus = inferArtifactFocus(inputFrame, parsedTask);
  const workType = inferWorkType(inputFrame, parsedTask, isContinuation);
  const isRecoverableFailure =
    inputFrame.isDebugging ||
    inputFrame.intentKind === "casual_failure" ||
    workType === "debug" ||
    workType === "recover";
  const shouldPreserveUserOwnership =
    inputFrame.isOutsourcingRequest ||
    (inputFrame.intentKind !== "decision" &&
      inputFrame.isArtifactRequest &&
      (inputFrame.requestedDepth === "full" || parsedTask.artifacts.length >= 1)) ||
    parsedTask.inferredMode === "agency-check";
  const constraints = inferConstraints(inputFrame, parsedTask, shouldPreserveUserOwnership);
  const missingInfo = inferMissingInfo(inputFrame, parsedTask, session, workType, hasContinuationMemory);

  return {
    primaryGoal: inferPrimaryGoal(inputFrame, parsedTask, workType, artifactFocus, isContinuation),
    workType,
    artifactFocus,
    constraints,
    missingInfo,
    isContinuation,
    isRecoverableFailure,
    shouldPreserveUserOwnership,
  };
}

function inferArtifactFocus(inputFrame: InputFrame, parsedTask: ParsedTask) {
  const focus = new Set<string>(parsedTask.artifacts);

  if (inputFrame.failureTarget) focus.add(inputFrame.failureTarget);
  if (inputFrame.intentKind === "debugging" || inputFrame.intentKind === "casual_failure") {
    focus.add("failure");
  }

  return Array.from(focus);
}

function inferWorkType(
  inputFrame: InputFrame,
  parsedTask: ParsedTask,
  isContinuation: boolean
): TaskFrame["workType"] {
  if (inputFrame.continuationKind === "recover") return "recover";
  if (inputFrame.intentKind === "casual_failure") return "recover";
  if (inputFrame.intentKind === "debugging" || inputFrame.failureTarget) return "debug";
  if (isContinuation) return "continue";
  if (inputFrame.intentKind === "language_refinement") return "refine";
  if (inputFrame.intentKind === "decision" || parsedTask.artifacts.includes("decision")) return "decide";
  if (inputFrame.intentKind === "learning") return "learn";
  if (parsedTask.artifacts.includes("ppt") || parsedTask.artifacts.includes("demo") || parsedTask.artifacts.includes("viva")) {
    return "present";
  }
  if (parsedTask.artifacts.includes("report") || parsedTask.artifacts.includes("message") || parsedTask.artifacts.includes("notes")) {
    return "write";
  }
  if (parsedTask.domain === "coding" || parsedTask.artifacts.includes("app") || parsedTask.artifacts.includes("code")) {
    return "build";
  }
  if (inputFrame.intentKind === "project_planning") return "continue";

  return "learn";
}

function inferConstraints(
  inputFrame: InputFrame,
  parsedTask: ParsedTask,
  shouldPreserveUserOwnership: boolean
) {
  const constraints = [...parsedTask.constraints];

  if (shouldPreserveUserOwnership) {
    constraints.push("Preserve the user's own claim before expanding artifacts.");
  }

  if (inputFrame.failureTarget === "claude") {
    constraints.push("Keep Claude optional and subordinate to the local Anchor engine.");
  }

  if (inputFrame.failureTarget) {
    constraints.push("Patch the smallest failing layer before redesigning adjacent systems.");
  }

  return Array.from(new Set(constraints));
}

function inferMissingInfo(
  inputFrame: InputFrame,
  parsedTask: ParsedTask,
  session: SessionLike | undefined,
  workType: TaskFrame["workType"],
  hasContinuationMemory: boolean
) {
  const missing = new Set<string>();
  const text = inputFrame.normalized;

  if (workType === "debug" || workType === "recover") {
    if (!hasErrorDetail(text)) {
      missing.add("exact error text");
    }

    if (!hasAny(text, ["npm run tauri dev", "vite", "cargo check", "npm run build", "browser", "terminal"])) {
      missing.add("runtime context");
    }

    if (!inputFrame.failureTarget || inputFrame.failureTarget === "unknown") {
      missing.add("failing layer");
    }
  }

  if ((workType === "continue" || inputFrame.isContinuation) && !session?.activeTask && !hasContinuationMemory) {
    missing.add("task boundary");
  }

  if (workType === "decide" && parsedTask.artifacts.length <= 1 && !hasAny(text, [" or ", "versus", "vs"])) {
    missing.add("options to compare");
  }

  return Array.from(missing);
}

function hasErrorDetail(text: string) {
  return (
    hasAny(text, ["error:", "failed:", "traceback", "panic", "exception", "stack trace"]) ||
    /[a-z]+error\b/i.test(text) ||
    /\b(eperm|enoent|eaddrinuse|econnrefused|401|403|404|500)\b/i.test(text)
  );
}

function inferPrimaryGoal(
  inputFrame: InputFrame,
  parsedTask: ParsedTask,
  workType: TaskFrame["workType"],
  artifactFocus: string[],
  isContinuation: boolean
) {
  if (isContinuation) {
    return `Continue the current ${parsedTask.domain} thread with one grounded next step.`;
  }

  if (workType === "debug" || workType === "recover") {
    const target = inputFrame.failureTarget && inputFrame.failureTarget !== "unknown"
      ? inputFrame.failureTarget
      : "reported";
    return `Debug the ${target} failure without changing unrelated layers.`;
  }

  if (workType === "refine") {
    return "Refine the user's wording while preserving their original idea.";
  }

  if (workType === "decide") {
    return "Help the user choose the next action using explicit constraints.";
  }

  if (artifactFocus.length > 0) {
    return `Create a usable ${formatList(artifactFocus)} scaffold that the user can explain.`;
  }

  return parsedTask.userGoal;
}

function formatList(items: string[]) {
  if (items.length === 0) return "task";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
