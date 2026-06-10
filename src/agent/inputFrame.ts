export type InputFrame = {
  raw: string;
  normalized: string;
  tokens: string[];
  isShort: boolean;
  isCasualFailure: boolean;
  isDebugging: boolean;
  isLlmProviderIssue: boolean;
  isDecisionRequest: boolean;
  isRefinementRequest: boolean;
  isArtifactRequest: boolean;
  isOutsourcingRequest: boolean;
  isContinuation: boolean;
  emotionalTone: "neutral" | "frustrated" | "confused" | "urgent" | "casual";
};

const normalize = (input: string) =>
  input
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const hasAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

export function buildInputFrame(input: string, hasActiveTask = false): InputFrame {
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
    "failed",
    "failure",
    "crash",
    "stuck on",
    "button not",
    "cannot",
    "can't",
    "cant",
  ]);

  const isCasualFailure =
    isShort &&
    isDebugging &&
    hasAny(normalized, ["fam", "bro", "mate", "dude", "bruh", "lol", "aint"]);

  const isDecisionRequest = hasAny(normalized, [
    "should i",
    "which",
    "choose",
    "decide",
    "priority",
    "first",
    "what next",
    "next?",
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

  const isContinuation = isShort && hasActiveTask;

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
    isCasualFailure,
    isDebugging,
    isLlmProviderIssue,
    isDecisionRequest,
    isRefinementRequest,
    isArtifactRequest,
    isOutsourcingRequest,
    isContinuation,
    emotionalTone,
  };
}
