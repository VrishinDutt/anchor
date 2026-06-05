import { useState } from "react";
import { generateSessionSummary } from "../agent/sessionSummary";
import { exportTextFile } from "../agent/exportSession";
import { runLlmDraft } from "../agent/llm/llmClient";
import type { AnchorResult, AnchorSession, ChatMessage } from "../agent/anchorEngine";

type DetailDrawerProps = {
  latestResult: AnchorResult;
  session: AnchorSession;
  messages: ChatMessage[];
  lastUserInput: string;
};

type DrawerKey = "claude" | "reasoning" | "session" | "ethics" | null;

export function DetailDrawer({
  latestResult,
  messages,
  lastUserInput,
}: DetailDrawerProps) {
  const [open, setOpen] = useState<DrawerKey>("claude");
  const [llmDraft, setLlmDraft] = useState("");
  const [llmStatus, setLlmStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [exportStatus, setExportStatus] = useState("");

  const summary = generateSessionSummary(messages, latestResult);
  const policy = latestResult.llmPolicy;

  function toggle(key: DrawerKey) {
    setOpen((current) => (current === key ? null : key));
  }

  async function deepenWithClaude() {
    if (!lastUserInput.trim() || policy.permission === "blocked") return;

    setLlmStatus("loading");
    setLlmDraft("");

    try {
      const result = await runLlmDraft({
        userInput: lastUserInput,
        task: latestResult.parsedTask,
        policy,
      });

      setLlmDraft(result.text);
      setLlmStatus("ready");
      setOpen("claude");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : JSON.stringify(error, null, 2);

      setLlmDraft(
        [
          "Claude could not be reached.",
          "",
          "Detail:",
          message,
        ].join("\n")
      );

      setLlmStatus("error");
      setOpen("claude");
    }
  }

  async function copySummary() {
    await navigator.clipboard.writeText(summary.summaryText);
    setExportStatus("Copied.");
  }

  async function exportSummary() {
    try {
      const didExport = await exportTextFile(summary.summaryText);
      setExportStatus(didExport ? "Exported." : "Export cancelled.");
    } catch {
      setExportStatus("Export failed.");
    }
  }

  return (
    <section className="drawer-stack">
      <DrawerButton
        title="Claude assist"
        subtitle={`${policy.permission} · ${policy.useCase}`}
        active={open === "claude"}
        onClick={() => toggle("claude")}
      />

      {open === "claude" && (
        <div className="drawer-panel">
          <p className="drawer-muted">{policy.reason}</p>

          {policy.permission === "blocked" ? (
            <p className="drawer-muted">
              Claude is blocked for this thread. Anchor can still help with grounded next steps.
            </p>
          ) : (
            <button
              className="primary-soft-button"
              onClick={deepenWithClaude}
              disabled={llmStatus === "loading" || !lastUserInput.trim()}
            >
              {llmStatus === "loading" ? "Holding boundary..." : "Deepen with Claude"}
            </button>
          )}

          {llmDraft && (
            <div className={`llm-output ${llmStatus === "error" ? "error" : ""}`}>
              {llmDraft}
            </div>
          )}
        </div>
      )}

      <DrawerButton
        title="Reasoning"
        subtitle={latestResult.responsePolicy}
        active={open === "reasoning"}
        onClick={() => toggle("reasoning")}
      />

      {open === "reasoning" && (
        <div className="drawer-panel compact-facts">
          <Fact label="Domain" value={latestResult.parsedTask.domain} />
          <Fact label="Complexity" value={latestResult.parsedTask.complexity} />
          <Fact label="State" value={latestResult.cognitiveState} />
          <Fact label="Agency" value={latestResult.agencyRisk} />
          <Fact label="Loop" value={latestResult.loopStage} />
        </div>
      )}

      <DrawerButton
        title="Session"
        subtitle={summary.nextAction}
        active={open === "session"}
        onClick={() => toggle("session")}
      />

      {open === "session" && (
        <div className="drawer-panel">
          <p className="drawer-muted">{summary.nextAction}</p>

          <div className="button-row">
            <button onClick={copySummary}>Copy</button>
            <button onClick={exportSummary}>Export</button>
          </div>

          {exportStatus && <p className="drawer-muted">{exportStatus}</p>}
        </div>
      )}

      <DrawerButton
        title="Ethics"
        subtitle="Non-clinical, non-replacement"
        active={open === "ethics"}
        onClick={() => toggle("ethics")}
      />

      {open === "ethics" && (
        <div className="drawer-panel">
          <p className="drawer-muted">
            Anchor is not a therapist, diagnosis tool, crisis system, or replacement
            for human support. Its job is narrower: preserve agency, clarify the
            thread, and help you take one grounded step.
          </p>
        </div>
      )}
    </section>
  );
}

function DrawerButton({
  title,
  subtitle,
  active,
  onClick,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={active ? "drawer-button active" : "drawer-button"} onClick={onClick}>
      <span>{title}</span>
      <small>{subtitle}</small>
    </button>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
