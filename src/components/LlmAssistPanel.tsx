import { useState } from "react";
import { runLlmDraft } from "../agent/llm/llmClient";
import type { AnchorResult } from "../agent/anchorEngine";

type LlmAssistPanelProps = {
  latestResult: AnchorResult;
  lastUserInput: string;
};

export function LlmAssistPanel({ latestResult, lastUserInput }: LlmAssistPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const policy = latestResult.llmPolicy;
  const isBlocked = policy.permission === "blocked";
  const canRequest = Boolean(lastUserInput.trim()) && !isBlocked;
  const hasErrorDetail = status === "error" && Boolean(errorDetail);

  async function requestLlmHelp() {
    if (!canRequest) return;

    setStatus("loading");
    setDraft("");
    setErrorDetail("");
    setCopyStatus("");

    try {
      const result = await runLlmDraft({
        userInput: lastUserInput,
        task: latestResult.parsedTask,
        policy,
      });

      setDraft(result.text);
      setStatus("ready");
      setExpanded(true);
    } catch (error) {
      console.error(error);

      const message = formatErrorDetail(error);
      const isRuntimeError = message.includes("Tauri IPC is not available");

      setDraft(
        isRuntimeError
          ? "LLM Assist is available only in the native Tauri app window. Open Anchor through Tauri and click Deepen with LLM there."
          : [
              "Anchor could not reach the LLM layer.",
              "",
              "Likely causes:",
              "- OPENAI_API_KEY is missing from the terminal that launched Tauri.",
              "- The key is invalid or revoked.",
              "- The selected model is unavailable.",
              "- Billing/project access is not enabled.",
              "- The API response shape changed or could not be parsed.",
            ].join("\n")
      );
      setErrorDetail(message);

      setStatus("error");
      setExpanded(true);
    }
  }

  async function copyErrorDetail() {
    if (!errorDetail) return;

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API is not available.");
      }
      await navigator.clipboard.writeText(errorDetail);
      setCopyStatus("Copied.");
    } catch {
      setCopyStatus("Select the error detail to copy.");
    }
  }

  return (
    <section className="glass-card llm-panel">
      <p className="panel-label">LLM Assist</p>

      <div className="llm-policy-card">
        <span>{policy.permission}</span>
        <strong>{policy.useCase}</strong>
        <p>{policy.reason}</p>
      </div>

      {isBlocked ? (
        <div className="quiet-note">
          LLM use is blocked for this thread. Anchor can still help with grounded, non-clinical next steps.
        </div>
      ) : (
        <button
          className="details-toggle"
          onClick={requestLlmHelp}
          disabled={!canRequest || status === "loading"}
        >
          {status === "loading" ? "Holding the boundary..." : "Deepen with LLM"}
        </button>
      )}

      {draft && (
        <>
          <button
            className="details-toggle"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Hide LLM draft" : "Show LLM draft"}
          </button>

          {expanded && (
            <div className={`llm-draft ${status === "error" ? "error" : ""}`}>
              <p>{draft}</p>
              {hasErrorDetail && (
                <div className="llm-error-detail">
                  <div className="llm-error-detail-header">
                    <span>Exact error detail</span>
                    <button className="copy-button subtle compact" onClick={copyErrorDetail}>
                      Copy
                    </button>
                  </div>
                  <textarea
                    aria-label="Exact LLM error detail"
                    readOnly
                    value={errorDetail}
                  />
                  {copyStatus && <p className="export-status">{copyStatus}</p>}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function formatErrorDetail(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}
