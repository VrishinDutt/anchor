export type DecisionOption = {
  label: string;
  name: string;
  urgency: number;
  consequence: number;
  importance: number;
  effort: number;
  score: number;
};

export type DecisionLensResult = {
  options: DecisionOption[];
  winner?: DecisionOption;
  reply: string;
};

export function tryRunDecisionLens(input: string): DecisionLensResult | null {
  const options = parseDecisionOptions(input);

  if (options.length < 2) {
    return null;
  }

  const sorted = [...options].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  return {
    options: sorted,
    winner,
    reply: composeDecisionReply(sorted, winner),
  };
}

function parseDecisionOptions(input: string): DecisionOption[] {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const options: DecisionOption[] = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed) options.push(parsed);
  }

  return options;
}

function parseLine(line: string): DecisionOption | null {
  const normalized = line.toLowerCase();

  const labelMatch = line.match(/^([a-zA-Z])\s*[:.)-]\s*(.+)$/);
  if (!labelMatch) return null;

  const label = labelMatch[1].toUpperCase();
  const rest = labelMatch[2];

  const name = rest.split(",")[0]?.trim() || `Option ${label}`;

  const urgency = extractScore(normalized, ["urgency", "urgent", "u"]);
  const consequence = extractScore(normalized, ["consequence", "cost", "impact", "c"]);
  const importance = extractScore(normalized, ["importance", "important", "value", "i"]);
  const effort = extractScore(normalized, ["effort", "difficulty", "hard", "e"]);

  if ([urgency, consequence, importance, effort].some((score) => score === null)) {
    return null;
  }

  const safeUrgency = clampScore(urgency!);
  const safeConsequence = clampScore(consequence!);
  const safeImportance = clampScore(importance!);
  const safeEffort = clampScore(effort!);

  return {
    label,
    name,
    urgency: safeUrgency,
    consequence: safeConsequence,
    importance: safeImportance,
    effort: safeEffort,
    score: safeUrgency + safeConsequence + safeImportance - safeEffort,
  };
}

function extractScore(text: string, keys: string[]): number | null {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`${escaped}\\s*[:=]?\\s*([1-5])`),
      new RegExp(`${escaped}\\s+([1-5])`),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return Number(match[1]);
    }
  }

  return null;
}

function clampScore(score: number) {
  return Math.min(5, Math.max(1, score));
}

function composeDecisionReply(options: DecisionOption[], winner: DecisionOption) {
  const rows = options.map(
    (option) =>
      `${option.label}. ${option.name}: ${option.score} = ${option.urgency} urgency + ${option.consequence} consequence + ${option.importance} importance - ${option.effort} effort`
  );

  const runnerUp = options[1];

  const margin =
    runnerUp && winner.score !== runnerUp.score
      ? `It beats the next option by ${winner.score - runnerUp.score} point(s).`
      : "The top options are close, so use reversibility and available energy as tie-breakers.";

  return [
    "Decision Lens result:",
    "",
    ...rows,
    "",
    `Recommended next action: ${winner.name}`,
    "",
    margin,
    "",
    "Reasoning:",
    "This option has the strongest balance of urgency, consequence, and importance relative to effort. Do this first, but define a small entry action instead of treating it as the entire task.",
    "",
    `Grounded entry action: open or create the first working surface for "${winner.name}" and produce one visible artifact within five minutes.`,
  ].join("\n");
}
