import type { AnchorResult, AnchorSession } from "../agent/anchorEngine";

type FocusPanelProps = {
  result: AnchorResult;
  session: AnchorSession;
};

export function FocusPanel({ result, session }: FocusPanelProps) {
  return (
    <section className="focus-card">
      <div className="focus-header">
        <span>Current hold</span>
        <StatusDot active={session.awaitingCheckpoint} />
      </div>

      <h2>{result.actionCard.title}</h2>

      <ol className="focus-steps">
        {result.actionCard.steps.slice(0, 3).map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>

      <div className="focus-foot">
        <span>{humanPolicy(result.responsePolicy)}</span>
      </div>
    </section>
  );
}

function StatusDot({ active }: { active?: boolean }) {
  return (
    <span
      className={active ? "status-dot waiting" : "status-dot"}
      title={active ? "Waiting for your checkpoint" : "Thread held"}
    />
  );
}

function humanPolicy(policy: string) {
  if (policy.includes("agency")) return "Protecting agency";
  if (policy.includes("decision")) return "Choosing with constraints";
  if (policy.includes("entry")) return "Finding the first step";
  if (policy.includes("ground")) return "Grounding first";
  return "Holding context";
}
