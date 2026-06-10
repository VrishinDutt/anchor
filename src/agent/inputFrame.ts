export type InputIntentKind =
  | "debugging"
  | "artifact_creation"
  | "language_refinement"
  | "decision"
  | "learning"
  | "project_planning"
  | "status_update"
  | "casual_failure"
  | "unknown";

export type InputFailureTarget =
  | "claude"
  | "tauri"
  | "frontend"
  | "agent_logic"
  | "build"
  | "git"
  | "environment"
  | "unknown"
  | null;

export type InputFrame = {
  raw: string;
  normalized: string;
  tokens: string[];
  isShort: boolean;
  intentKind: InputIntentKind;
  failureTarget: InputFailureTarget;
  urgencyLevel: "low" | "medium" | "high";
  register: "casual" | "academic" | "technical" | "frustrated" | "neutral";
  requestedDepth: "micro" | "medium" | "full";
  userEnergy: "low" | "medium" | "high" | "unknown";
  isCasualFailure: boolean;
  isDebugging: boolean;
  isLlmProviderIssue: boolean;
  isDecisionRequest: boolean;
  isRefinementRequest: boolean;
  isArtifactRequest: boolean;
  isOutsourcingRequest: boolean;
  isContinuation: boolean;
  continuationKind: "none" | "advance" | "complete" | "confirm" | "confused" | "recover";
  previousIntentKind?: InputIntentKind;
  emotionalTone: "neutral" | "frustrated" | "confused" | "urgent" | "casual";
};

export type InputFrameContext = {
  hasActiveTask?: boolean;
  lastFailureTarget?: InputFailureTarget;
  lastIntentKind?: InputIntentKind;
  lastWorkType?: string;
};

const normalize = (input: string) =>
  input
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const hasAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

const isExactlyAny = (text: string, terms: string[]) => terms.includes(text);

export function buildInputFrame(input: string, context: boolean | InputFrameContext = false): InputFrame {
  const frameContext = typeof context === "boolean" ? { hasActiveTask: context } : context;
  const hasActiveTask = Boolean(frameContext.hasActiveTask);
  const hasContinuationMemory = Boolean(
    hasActiveTask ||
      frameContext.lastFailureTarget ||
      frameContext.lastIntentKind ||
      frameContext.lastWorkType
  );
  const normalized = normalize(input);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const isShort = tokens.length <= 7;

  const isLlmProviderIssue = hasAny(normalized, [
    "claude",
    "anthropic",
    "openai",
    "gpt",
    "gemini",
    "api key",
    "api-key",
    "token",
    "provider",
    "llm",
    "deepen",
  ]);

  const isDebugging = hasAny(normalized, [
    "not working",
    "aint working",
    "isn't working",
    "isnt working",
    "doesn't work",
    "doesnt work",
    "broken",
    "broke",
    "bug",
    "error",
    "tsc error",
    "failed",
    "failure",
    "crash",
    "stuck on",
    "button not",
    "button isn't",
    "button isnt",
    "it broke",
    "app broke",
    "build failed",
    "cargo check",
    "npm run tauri dev",
    "vite",
    "blank screen",
    "white screen",
    "terminal says",
    "oops",
    "cannot",
    "can't",
    "cant",
  ]);

  const isCasualFailure =
    isShort &&
    isDebugging &&
    (hasAny(normalized, ["fam", "bro", "mate", "dude", "bruh", "lol", "aint", "oops"]) ||
      hasAny(normalized, ["it broke", "app broke", "button not working", "aint working"]));

  const isDecisionRequest = hasAny(normalized, [
    "should i",
    "which",
    "choose",
    "decide",
    "priority",
    "first",
    "what next",
    "next?",
    "what now",
  ]);

  const isRefinementRequest = hasAny(normalized, [
    "refine",
    "rewrite",
    "polish",
    "wording",
    "make this better",
    "problem statement",
    "abstract",
    "improve this",
  ]);

  const isArtifactRequest = hasAny(normalized, [
    "generate report",
    "generate the report",
    "generate ppt",
    "generate the ppt",
    "generate presentation",
    "generate demo",
    "generate viva",
    "report",
    "ppt",
    "presentation",
    "slides",
    "demo",
    "viva",
    "code",
    "html",
    "pdf",
    "writeup",
    "documentation",
  ]);

  const isOutsourcingRequest = hasAny(normalized, [
    "just make",
    "do it all",
    "give full",
    "make the full",
    "finish everything",
    "submit it",
    "copy paste",
    "do everything",
  ]);

  const continuationKind = detectContinuationKind(normalized);
  const isContinuation =
    continuationKind !== "none" ||
    (hasContinuationMemory &&
      (isShort || hasAny(normalized, ["the app works", "app works", "what now", "next step"])));

  const failureTarget = detectFailureTarget(normalized, isDebugging, isLlmProviderIssue);
  const intentKind = detectIntentKind({
    normalized,
    isCasualFailure,
    isDebugging,
    isDecisionRequest,
    isRefinementRequest,
    isArtifactRequest,
    isContinuation,
  });
  const urgencyLevel = detectUrgency(normalized, isDebugging, isOutsourcingRequest);
  const register = detectRegister(normalized, {
    isCasualFailure,
    isDebugging,
    isArtifactRequest,
  });
  const requestedDepth = detectRequestedDepth(normalized, isShort);
  const userEnergy = detectUserEnergy(normalized, {
    isDebugging,
    isDecisionRequest,
    isArtifactRequest,
    urgencyLevel,
  });

  let emotionalTone: InputFrame["emotionalTone"] = "neutral";

  if (hasAny(normalized, ["huh", "what", "confused", "idk", "don't know", "dont know"])) {
    emotionalTone = "confused";
  } else if (hasAny(normalized, ["not working", "doesnt work", "doesn't work", "broken", "broke", "error", "failed"])) {
    emotionalTone = "frustrated";
  } else if (hasAny(normalized, ["urgent", "quick", "now", "asap", "fast"])) {
    emotionalTone = "urgent";
  } else if (hasAny(normalized, ["fam", "bro", "mate", "dude", "bruh", "lol", "aint"])) {
    emotionalTone = "casual";
  }

  return {
    raw: input,
    normalized,
    tokens,
    isShort,
    intentKind,
    failureTarget,
    urgencyLevel,
    register,
    requestedDepth,
    userEnergy,
    isCasualFailure,
    isDebugging,
    isLlmProviderIssue,
    isDecisionRequest,
    isRefinementRequest,
    isArtifactRequest,
    isOutsourcingRequest,
    isContinuation,
    continuationKind,
    previousIntentKind: frameContext.lastIntentKind,
    emotionalTone,
  };
}

function detectContinuationKind(text: string): InputFrame["continuationKind"] {
  if (isExactlyAny(text, ["next", "proceed", "continue", "what now", "next step"])) {
    return "advance";
  }

  if (isExactlyAny(text, ["done", "finished", "completed"]) || hasAny(text, ["i finished", "i completed"])) {
    return "complete";
  }

  if (
    isExactlyAny(text, ["works", "it works", "app works", "cool"]) ||
    hasAny(text, ["the app works", "provider works", "claude works"])
  ) {
    return "confirm";
  }

  if (isExactlyAny(text, ["huh", "what"]) || hasAny(text, ["i'm confused", "im confused", "confused"])) {
    return "confused";
  }

  if (isExactlyAny(text, ["oops"]) || hasAny(text, ["oops", "broke again", "it broke"])) {
    return "recover";
  }

  return "none";
}

function detectFailureTarget(
  text: string,
  isDebugging: boolean,
  isLlmProviderIssue: boolean
): InputFrame["failureTarget"] {
  if (!isDebugging && !isLlmProviderIssue) return null;

  if (hasAny(text, ["claude", "anthropic", "deepen", "provider"])) return "claude";

  if (hasAny(text, ["api key", "api-key", "token"])) {
    return hasAny(text, ["anthropic", "claude"]) ? "claude" : "environment";
  }

  if (hasAny(text, ["cargo check", "npm run build", "build failed", "tsc error", "compile", "compiler"])) {
    return "build";
  }

  if (hasAny(text, ["npm run tauri dev", "tauri", "ipc", "rust terminal", "tauri dev"])) {
    return "tauri";
  }

  if (hasAny(text, ["vite", "react", "frontend", "button", "blank screen", "white screen", "drawer", "ui"])) {
    return "frontend";
  }

  if (hasAny(text, ["reasoning", "agent logic", "anchor engine", "inputframe", "response planner", "hypothesis"])) {
    return "agent_logic";
  }

  if (hasAny(text, ["git", "branch", "commit", "merge", "rebase"])) {
    return "git";
  }

  if (hasAny(text, ["env", "environment", "terminal", "path", "permission", "port"])) {
    return "environment";
  }

  return "unknown";
}

function detectIntentKind(params: {
  normalized: string;
  isCasualFailure: boolean;
  isDebugging: boolean;
  isDecisionRequest: boolean;
  isRefinementRequest: boolean;
  isArtifactRequest: boolean;
  isContinuation: boolean;
}): InputFrame["intentKind"] {
  const {
    normalized,
    isCasualFailure,
    isDebugging,
    isDecisionRequest,
    isRefinementRequest,
    isArtifactRequest,
    isContinuation,
  } = params;

  if (isCasualFailure) return "casual_failure";
  if (isDebugging) return "debugging";
  if (isRefinementRequest) return "language_refinement";

  if (
    isContinuation &&
    hasAny(normalized, ["next", "proceed", "continue", "what now"])
  ) {
    return "project_planning";
  }

  if (isDecisionRequest) return "decision";

  if (
    isArtifactRequest ||
    hasAny(normalized, ["generate report", "generate ppt", "generate demo", "generate viva"])
  ) {
    return "artifact_creation";
  }

  if (hasAny(normalized, ["learn", "teach", "explain", "understand", "study", "why does", "how does"])) {
    return "learning";
  }

  if (
    hasAny(normalized, ["plan", "roadmap", "timeline", "order", "sequence", "what now"])
  ) {
    return "project_planning";
  }

  if (
    isExactlyAny(normalized, ["done", "works", "cool"]) ||
    hasAny(normalized, ["it works", "app works", "finished", "completed"])
  ) {
    return "status_update";
  }

  return "unknown";
}

function detectUrgency(
  text: string,
  isDebugging: boolean,
  isOutsourcingRequest: boolean
): InputFrame["urgencyLevel"] {
  if (hasAny(text, ["urgent", "asap", "right now", "deadline", "today", "submit it", "due"])) {
    return "high";
  }

  if (isDebugging || isOutsourcingRequest || hasAny(text, ["blocked", "stuck", "failed"])) {
    return "medium";
  }

  return "low";
}

function detectRegister(
  text: string,
  flags: {
    isCasualFailure: boolean;
    isDebugging: boolean;
    isArtifactRequest: boolean;
  }
): InputFrame["register"] {
  if (flags.isCasualFailure || hasAny(text, ["fam", "bro", "mate", "dude", "bruh", "lol", "cool"])) {
    return "casual";
  }

  if (flags.isDebugging && hasAny(text, ["broke", "broken", "not working", "failed", "ugh", "annoying"])) {
    return "frustrated";
  }

  if (
    hasAny(text, [
      "npm",
      "cargo",
      "tsc",
      "vite",
      "tauri",
      "react",
      "typescript",
      "api key",
      "anthropic",
      "claude",
      "terminal",
    ])
  ) {
    return "technical";
  }

  if (
    flags.isArtifactRequest ||
    hasAny(text, ["report", "ppt", "viva", "assignment", "professor", "academic", "project"])
  ) {
    return "academic";
  }

  return "neutral";
}

function detectRequestedDepth(text: string, isShort: boolean): InputFrame["requestedDepth"] {
  if (
    hasAny(text, [
      "full",
      "complete",
      "detailed",
      "entire",
      "everything",
      "report and ppt",
      "step by step",
    ])
  ) {
    return "full";
  }

  if (isShort || isExactlyAny(text, ["next", "proceed", "done", "cool", "huh", "oops"])) {
    return "micro";
  }

  return "medium";
}

function detectUserEnergy(
  text: string,
  flags: {
    isDebugging: boolean;
    isDecisionRequest: boolean;
    isArtifactRequest: boolean;
    urgencyLevel: InputFrame["urgencyLevel"];
  }
): InputFrame["userEnergy"] {
  if (
    hasAny(text, ["tired", "exhausted", "confused", "huh", "idk", "don't know", "dont know"]) ||
    (flags.isDebugging && text.split(/\s+/).filter(Boolean).length <= 5)
  ) {
    return "low";
  }

  if (flags.urgencyLevel === "high" || hasAny(text, ["proceed", "generate", "build", "fix", "run"])) {
    return "high";
  }

  if (flags.isDecisionRequest || flags.isArtifactRequest || flags.isDebugging) {
    return "medium";
  }

  return "unknown";
}
