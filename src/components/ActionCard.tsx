import type { ActionCard as ActionCardType } from "../agent/anchorEngine";

type ActionCardProps = {
  action: ActionCardType;
};

export function ActionCard({ action }: ActionCardProps) {
  return (
    <section className="glass-card action-card">
      <p className="panel-label">Next Grounded Step</p>

      <h2>{action.title}</h2>

      <ol>
        {action.steps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>

      <div className="quiet-note">
        This is not a command. It is a handle. Pick it up only if it still feels true.
      </div>
    </section>
  );
}
