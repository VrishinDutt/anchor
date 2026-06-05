import { invoke, isTauri } from "@tauri-apps/api/core";
import type { LlmDraftRequest, LlmDraftResult } from "./llmTypes";
import { buildSystemInstruction, buildUserPrompt } from "./llmPromptBuilder";

type TauriGlobal = typeof globalThis & {
  __TAURI_INTERNALS__?: {
    invoke?: unknown;
  };
};

const NON_TAURI_RUNTIME_MESSAGE = [
  "Anchor LLM Assist can only run inside the native Tauri app window.",
  "Open Anchor with `npm run tauri dev` or the installed native app, then click Deepen with LLM there.",
  "The browser/Vite URL cannot call the Rust command `run_anchor_llm` because Tauri IPC is not available.",
].join("\n");

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

  if (!hasTauriInvokeRuntime()) {
    throw new Error(NON_TAURI_RUNTIME_MESSAGE);
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

function hasTauriInvokeRuntime() {
  const tauriGlobal = globalThis as TauriGlobal;
  return isTauri() && typeof tauriGlobal.__TAURI_INTERNALS__?.invoke === "function";
}
