import type { ParsedTask } from "./taskParser";

export type AnchorFeatures = {
  intentClarity: number;
  artifactPressure: number;
  agencyRisk: number;
  cognitiveLoad: number;
  taskSpecificity: number;
  ownershipSignal: number;
  continuationSignal: number;
  reflectionNeed: number;
  actionability: number;
  uncertainty: number;
};

type SessionLike = {
  activeTask?: unknown;
  lastFailureTarget?: unknown;
  lastIntentKind?: unknown;
  lastWorkType?: unknown;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const countMatches = (text: string, terms: string[]) =>
  terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);

const hasAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

const isContinuationPhrase = (text: string) =>
  [
    "next",
    "proceed",
    "continue",
    "what now",
    "next step",
    "done",
    "finished",
    "completed",
    "works",
    "it works",
    "app works",
    "cool",
    "huh",
    "what",
    "oops",
  ].includes(text) ||
  hasAny(text, ["the app works", "provider works", "claude works", "i finished", "i completed"]);

export function extractAnchorFeatures(
  input: string,
  parsedTask: ParsedTask,
  session?: SessionLike
): AnchorFeatures {
  const text = input.toLowerCase().trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const artifactTerms = [
    "report",
    "ppt",
    "presentation",
    "slides",
    "code",
    "demo",
    "viva",
    "full",
    "submit",
    "make everything",
    "finish everything",
  ];

  const ownershipTerms = [
    "i think",
    "my idea",
    "i want",
    "i need to understand",
    "help me refine",
    "i have",
    "i built",
    "i finished",
  ];

  const outsourcingTerms = [
    "just make",
    "do it all",
    "give full",
    "submit",
    "shortcut",
    "finish everything",
    "make the full",
  ];

  const uncertaintyTerms = [
    "confused",
    "stuck",
    "huh",
    "what",
    "idk",
    "unclear",
    "not sure",
    "don't know",
    "dont know",
  ];

  const actionTerms = [
    "build",
    "run",
    "test",
    "open",
    "fix",
    "commit",
    "explain",
    "present",
    "debug",
    "generate",
  ];

  const artifactHits = countMatches(text, artifactTerms);
  const ownershipHits = countMatches(text, ownershipTerms);
  const outsourcingHits = countMatches(text, outsourcingTerms);
  const uncertaintyHits = countMatches(text, uncertaintyTerms);
  const actionHits = countMatches(text, actionTerms);

  const hasContinuationMemory = Boolean(
    session?.activeTask ||
      session?.lastFailureTarget ||
      session?.lastIntentKind ||
      session?.lastWorkType
  );
  const explicitContinuation = isContinuationPhrase(text);
  const shortContinuation = wordCount <= 8 && hasContinuationMemory;

  const intentClarity = clamp01(
    (wordCount >= 8 ? 0.35 : 0.1) +
      (artifactHits > 0 ? 0.25 : 0) +
      (actionHits > 0 ? 0.25 : 0) +
      (ownershipHits > 0 ? 0.15 : 0) -
      (uncertaintyHits > 0 ? 0.25 : 0)
  );

  const artifactPressure = clamp01(artifactHits / 4);
  const agencyRisk = clamp01(outsourcingHits * 0.35 + artifactPressure * 0.35 - ownershipHits * 0.12);
  const cognitiveLoad = clamp01(uncertaintyHits * 0.25 + artifactPressure * 0.2 + (wordCount > 40 ? 0.25 : 0));
  const taskSpecificity = clamp01(intentClarity + artifactHits * 0.08 + actionHits * 0.08);
  const ownershipSignal = clamp01(ownershipHits * 0.25 + (hasAny(text, ["my", "i "]) ? 0.15 : 0));
  const continuationSignal = explicitContinuation
    ? hasContinuationMemory
      ? 0.95
      : 0.55
    : shortContinuation
      ? 0.8
      : 0;
  const reflectionNeed = clamp01(agencyRisk * 0.55 + cognitiveLoad * 0.25 + uncertaintyHits * 0.12);
  const actionability = clamp01(actionHits * 0.2 + taskSpecificity * 0.35 + ownershipSignal * 0.15);
  const uncertainty = clamp01(uncertaintyHits * 0.3 + (intentClarity < 0.3 ? 0.25 : 0));

  void parsedTask;

  return {
    intentClarity,
    artifactPressure,
    agencyRisk,
    cognitiveLoad,
    taskSpecificity,
    ownershipSignal,
    continuationSignal,
    reflectionNeed,
    actionability,
    uncertainty,
  };
}
