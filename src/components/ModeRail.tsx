import type { Mode } from "../agent/anchorEngine";

type ModeRailProps = {
  activeMode: Mode;
  onModeChange: (mode: Mode) => void;
};

const modes: { id: Mode; label: string; description: string }[] = [
  { id: "auto", label: "Auto", description: "Let Anchor infer the need" },
  { id: "clarify", label: "Clarify", description: "Separate fog from facts" },
  { id: "start", label: "Start", description: "Create a first action" },
  { id: "decide", label: "Decide", description: "Choose with constraints" },
  { id: "unscroll", label: "Unscroll", description: "Exit digital loops" },
  { id: "agency-check", label: "Agency", description: "Prevent false mastery" },
];

export function ModeRail({ activeMode, onModeChange }: ModeRailProps) {
  return (
    <nav className="mode-rail">
      <p className="panel-label">Modes</p>

      {modes.map((mode) => (
        <button
          key={mode.id}
          className={activeMode === mode.id ? "mode-button active" : "mode-button"}
          onClick={() => onModeChange(mode.id)}
        >
          <strong>{mode.label}</strong>
          <span>{mode.description}</span>
        </button>
      ))}
    </nav>
  );
}
