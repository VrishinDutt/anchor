import { invoke } from "@tauri-apps/api/core";
import type { LlmDraftRequest, LlmDraftResult } from "./llmTypes";
import { buildSystemInstruction, buildUserPrompt } from "./llmPromptBuilder";

export async function runLlmDraft(request: LlmDraftRequest): Promise<LlmDraftResult> {
  if (request.policy.permission === "blocked") {
    return {
      usedLlm: false,
      policy: request.policy,
      text: [
        "Anchor will not use the LLM for this request.",
        "",
        request.policy.reason,
        "",
        "I can still help you make one grounded, non-clinical next step.",
      ].join("\n"),
    };
  }

  const systemInstruction = buildSystemInstruction({
    task: request.task,
    policy: request.policy,
  });

  const userPrompt = buildUserPrompt({
    userInput: request.userInput,
    policy: request.policy,
  });

  const text = await invoke<string>("run_anchor_llm", {
    systemInstruction,
    userPrompt,
    permission: request.policy.permission,
  });

  return {
    usedLlm: true,
    policy: request.policy,
    text,
  };
}
