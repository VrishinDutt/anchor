import { useState } from "react";
import type { AnchorResult, AnchorSession } from "../agent/anchorEngine";

type AgencyPanelProps = {
  result: AnchorResult;
  session: AnchorSession;
};

const loopOrder = ["notice", "name", "narrow", "choose", "act", "return"];

export function AgencyPanel({ result, session }: AgencyPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <section className="glass-card agency-panel">
      <p className="panel-label">Anchor State</p>

      <div className="human-state-card">
        <h2>You are still driving.</h2>
        <p>
          Anchor is holding the goal, the boundaries, and the next grounded step.
          It is not here to take the work away from you.
        </p>
      </div>

      <div className="loop-strip human-loop">
        {loopOrder.map((stage) => (
          <span
            key={stage}
            className={result.loopStage === stage ? "loop-stage active" : "loop-stage"}
          >
            {stage}
          </span>
        ))}
      </div>

      {session.awaitingCheckpoint && (
        <div className="checkpoint-banner">
          Waiting for your checkpoint. One honest sentence is enough.
        </div>
      )}

      <div className="quiet-goal">
        <span>Current thread</span>
        <strong>{summarizeGoal(result.parsedTask.userGoal)}</strong>
      </div>

      <button
        className="details-toggle"
        onClick={() => setShowDetails((current) => !current)}
      >
        {showDetails ? "Hide reasoning" : "Show reasoning"}
      </button>

      {showDetails && (
        <div className="technical-details">
          <Metric label="Detected mode" value={result.detectedMode} />
          <Metric label="Task domain" value={result.parsedTask.domain} />
          <Metric label="Complexity" value={result.parsedTask.complexity} />
          <Metric label="Cognitive state" value={result.cognitiveState} />
          <Metric label="Agency risk" value={result.agencyRisk} />
          <Metric label="Response policy" value={result.responsePolicy} />

          <div className="trace-box">
            <p className="panel-label">Parsed Goal</p>
            <p>{result.parsedTask.userGoal}</p>

            {result.parsedTask.artifacts.length > 0 && (
              <>
                <p className="panel-label spaced">Artifacts</p>
                <p>{result.parsedTask.artifacts.join(", ")}</p>
              </>
            )}

            {result.parsedTask.constraints.length > 0 && (
              <>
                <p className="panel-label spaced">Boundaries</p>
                <ul className="mini-list">
                  {result.parsedTask.constraints.map((constraint, index) => (
                    <li key={index}>{constraint}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="trace-box">
            <p className="panel-label">Agent Trace</p>
            <p><strong>Signal:</strong> {result.trace.signal}</p>
            <p><strong>Interpretation:</strong> {result.trace.interpretation}</p>
            <p><strong>Policy:</strong> {result.trace.policyReason}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function summarizeGoal(goal: string) {
  if (goal.length <= 92) return goal;
  return `${goal.slice(0, 92)}...`;
}
