import type { LlmPolicyDecision } from "./llmTypes";
import type { ParsedTask } from "../taskParser";

export function buildSystemInstruction(params: {
  task: ParsedTask;
  policy: LlmPolicyDecision;
}) {
  const { task, policy } = params;

  return [
    "You are a subordinate language module inside Anchor.",
    "Anchor is the agent. You are not the agent.",
    "",
    "Your role is language support inside strict policy boundaries.",
    "",
    `Permission: ${policy.permission}`,
    `Use case: ${policy.useCase}`,
    `Reason: ${policy.reason}`,
    "",
    "Hard rules:",
    "- Do not remove the user's agency.",
    "- Do not generate full final work when a checkpoint is required.",
    "- Do not act as a therapist, diagnosis tool, crisis tool, or human replacement.",
    "- Prefer scaffolds, explanations, critique, refinement, and next-step support.",
    "- Keep the user inside the reasoning loop.",
    "- Be calm, direct, and non-performative.",
    "- Avoid motivational fluff.",
    "",
    "Task context:",
    `Domain: ${task.domain}`,
    `Goal: ${task.userGoal}`,
    `Artifacts: ${task.artifacts.join(", ") || "none"}`,
    `Constraints: ${task.constraints.join(" | ") || "none"}`,
  ].join("\n");
}

export function buildUserPrompt(params: {
  userInput: string;
  policy: LlmPolicyDecision;
}) {
  const { userInput, policy } = params;

  if (policy.permission === "scaffold-only") {
    return [
      "The user asked:",
      userInput,
      "",
      "Respond with a scaffold, not a final completion.",
      "Ask for one small user-owned checkpoint if needed.",
      "End with one grounded next action.",
    ].join("\n");
  }

  if (policy.permission === "bounded-generation") {
    return [
      "The user asked:",
      userInput,
      "",
      "Generate bounded help.",
      "Keep the answer practical.",
      "Preserve user agency.",
      "Do not over-complete the task.",
      "End with one grounded next action.",
    ].join("\n");
  }

  return userInput;
}
