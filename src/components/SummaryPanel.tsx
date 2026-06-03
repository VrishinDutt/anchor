import { useState } from "react";
import { generateSessionSummary } from "../agent/sessionSummary";
import { exportTextFile } from "../agent/exportSession";
import type { AnchorResult, ChatMessage } from "../agent/anchorEngine";

type SummaryPanelProps = {
  messages: ChatMessage[];
  latestResult: AnchorResult;
};

export function SummaryPanel({ messages, latestResult }: SummaryPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const summary = generateSessionSummary(messages, latestResult);

  async function copySummary() {
    await navigator.clipboard.writeText(summary.summaryText);
    setExportStatus("Copied.");
  }

  async function exportSummary() {
    try {
      const didExport = await exportTextFile(summary.summaryText);
      setExportStatus(didExport ? "Exported." : "Export cancelled.");
    } catch (error) {
      console.error(error);
      setExportStatus("Export failed.");
    }
  }

  return (
    <section className="glass-card summary-panel">
      <p className="panel-label">Session</p>

      <div className="summary-box">
        <strong>Held context</strong>
        <p>{summary.nextAction}</p>
      </div>

      <button
        className="details-toggle"
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? "Hide summary" : "Show summary"}
      </button>

      {expanded && (
        <>
          <div className="summary-grid">
            <SummaryItem label="Domain" value={latestResult.parsedTask.domain} />
            <SummaryItem label="Complexity" value={latestResult.parsedTask.complexity} />
            <SummaryItem label="Policy" value={latestResult.responsePolicy} />
          </div>

          <div className="summary-actions">
            <button className="copy-button" onClick={copySummary}>
              Copy
            </button>

            <button className="copy-button subtle" onClick={exportSummary}>
              Export .txt
            </button>
          </div>

          {exportStatus && <p className="export-status">{exportStatus}</p>}
        </>
      )}
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
