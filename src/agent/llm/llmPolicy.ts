import type { LlmPolicyDecision, LlmPolicyInput } from "./llmTypes";

export function decideLlmUse(input: LlmPolicyInput): LlmPolicyDecision {
  const text = input.userInput.toLowerCase();

  if (looksClinicalOrCrisisLike(text)) {
    return {
      permission: "blocked",
      useCase: "unsafe-or-out-of-scope",
      reason:
        "This request may require clinical, crisis, or mental-health support. Anchor must not simulate therapy, diagnosis, or emergency care.",
      requiredUserCheckpoint:
        "Anchor can help structure a grounded next step, but not provide therapy, diagnosis, or crisis support.",
    };
  }

  if (input.agencyRisk === "high" || looksLikeFalseMastery(text)) {
    return {
      permission: "scaffold-only",
      useCase: "expand-structure",
      reason:
        "The user appears to be outsourcing too much thinking. The LLM may scaffold but must not complete the work wholesale.",
      requiredUserCheckpoint:
        "Ask the user to state their understanding before generating a full artifact.",
    };
  }

  if (looksLikeCodeHelp(text)) {
    return {
      permission: "bounded-generation",
      useCase: "code-guidance",
      reason:
        "Code help is allowed only when it preserves explanation, constraints, and user understanding.",
    };
  }

  if (looksLikeWritingRefinement(text)) {
    return {
      permission: "bounded-generation",
      useCase: "refine-writing",
      reason:
        "Writing refinement is allowed when it improves the user's draft rather than replacing their thinking.",
    };
  }

  if (looksLikeExplanation(text)) {
    return {
      permission: "scaffold-only",
      useCase: "explain",
      reason:
        "Explanations should start from the user's current understanding before becoming comprehensive.",
    };
  }

  if (input.task.complexity === "loaded") {
    return {
      permission: "bounded-generation",
      useCase: "expand-structure",
      reason:
        "Loaded tasks may use LLM expansion only after Anchor preserves the task structure and boundaries.",
    };
  }

  return {
    permission: "scaffold-only",
    useCase: "summarize",
    reason:
      "Default behavior should preserve user agency and avoid over-answering.",
  };
}

function looksClinicalOrCrisisLike(text: string) {
  return includesAny(text, [
    "diagnose me",
    "am i depressed",
    "am i bipolar",
    "suicide",
    "kill myself",
    "self harm",
    "panic attack",
    "therapy",
    "therapist",
    "medical advice",
    "medication",
  ]);
}

function looksLikeFalseMastery(text: string) {
  return includesAny(text, [
    "just write",
    "do it for me",
    "make the whole",
    "i'll understand later",
    "copy paste",
    "make it sound like i know",
    "complete report",
    "complete ppt",
    "full code",
  ]);
}

function looksLikeCodeHelp(text: string) {
  return includesAny(text, [
    "code",
    "function",
    "component",
    "typescript",
    "react",
    "tauri",
    "bug",
    "implementation",
    "refactor",
  ]);
}

function looksLikeWritingRefinement(text: string) {
  return includesAny(text, [
    "refine",
    "polish",
    "rewrite",
    "paragraph",
    "introduction",
    "problem statement",
    "report section",
  ]);
}

function looksLikeExplanation(text: string) {
  return includesAny(text, [
    "explain",
    "teach",
    "understand",
    "why",
    "how does",
    "what is",
  ]);
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}
