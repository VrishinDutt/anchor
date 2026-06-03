import type { Mode } from "./anchorEngine";

export type TaskDomain =
  | "academic-project"
  | "coding"
  | "writing"
  | "presentation"
  | "study"
  | "decision"
  | "digital-loop"
  | "human-reengagement"
  | "general";

export type TaskArtifact =
  | "app"
  | "code"
  | "report"
  | "ppt"
  | "demo"
  | "viva"
  | "notes"
  | "schedule"
  | "message"
  | "decision";

export type TaskComplexity = "simple" | "moderate" | "loaded";

export type ParsedTask = {
  domain: TaskDomain;
  artifacts: TaskArtifact[];
  complexity: TaskComplexity;
  constraints: string[];
  userGoal: string;
  inferredMode: Mode;
};

export function parseTask(input: string, currentMode: Mode): ParsedTask {
  const text = normalize(input);
  const artifacts = detectArtifacts(text);
  const constraints = detectConstraints(text);
  const domain = detectDomain(text, artifacts);
  const complexity = detectComplexity(text, artifacts, constraints);
  const userGoal = inferUserGoal(text, domain, artifacts);
  const inferredMode = currentMode === "auto" ? inferModeFromTask(domain, artifacts, text) : currentMode;

  return {
    domain,
    artifacts,
    complexity,
    constraints,
    userGoal,
    inferredMode,
  };
}

function normalize(input: string) {
  return input
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();
}

function detectArtifacts(text: string): TaskArtifact[] {
  const artifacts = new Set<TaskArtifact>();

  if (hasAny(text, ["app", "application", "desktop app", "mobile app", "tauri", "react"])) artifacts.add("app");
  if (hasAny(text, ["code", "program", "implementation", "backend", "frontend", "engine"])) artifacts.add("code");
  if (hasAny(text, ["report", "documentation", "writeup", "write-up"])) artifacts.add("report");
  if (hasAny(text, ["ppt", "presentation", "slides", "deck"])) artifacts.add("ppt");
  if (hasAny(text, ["demo", "demonstration", "showcase"])) artifacts.add("demo");
  if (hasAny(text, ["viva", "oral", "explain to professor", "explain to class"])) artifacts.add("viva");
  if (hasAny(text, ["notes", "study", "revision", "learn"])) artifacts.add("notes");
  if (hasAny(text, ["schedule", "plan", "timeline", "roadmap"])) artifacts.add("schedule");
  if (hasAny(text, ["message", "text someone", "email", "reply"])) artifacts.add("message");
  if (hasAny(text, ["decide", "choose", "which one", "priority"])) artifacts.add("decision");

  return Array.from(artifacts);
}

function detectConstraints(text: string): string[] {
  const constraints: string[] = [];

  if (hasAny(text, ["not a wrapper", "don't want a wrapper", "not just gpt", "not just gemini", "glorified chatgpt"])) {
    constraints.push("Must not behave like a generic LLM wrapper.");
  }

  if (hasAny(text, ["not therapy", "not therapist", "not mental healthcare", "not clinical"])) {
    constraints.push("Must avoid therapy, diagnosis, or medical replacement framing.");
  }

  if (hasAny(text, ["not preachy", "without being preachy", "not invasive", "out of the way"])) {
    constraints.push("Must remain non-preachy, non-invasive, and user-invoked.");
  }

  if (hasAny(text, ["future", "post production", "production ready", "build further", "real app"])) {
    constraints.push("Should be architected as a future production product, not a disposable assignment demo.");
  }

  if (hasAny(text, ["solo", "aat", "assignment", "college", "professor", "class"])) {
    constraints.push("Must fit academic evaluation while remaining practically meaningful.");
  }

  if (hasAny(text, ["critical thinking", "agency", "autonomy", "metacognition", "present"])) {
    constraints.push("Must preserve user agency and require active thinking from the user.");
  }

  return constraints;
}

function detectDomain(text: string, artifacts: TaskArtifact[]): TaskDomain {
  if (hasAny(text, ["scroll", "reels", "shorts", "doomscroll", "brain rot", "brainrot"])) return "digital-loop";

  if (hasAny(text, ["talk to people", "human", "lonely", "isolation", "digital cocoon", "real world"])) {
    return "human-reengagement";
  }

  if (hasAny(text, ["aat", "assignment", "professor", "report", "ppt", "viva", "course", "iai"])) {
    return "academic-project";
  }

  if (hasAny(text, ["code", "bug", "build", "implementation", "function", "component", "typescript", "react", "tauri"])) {
    return "coding";
  }

  if (artifacts.includes("ppt")) return "presentation";
  if (artifacts.includes("report")) return "writing";
  if (artifacts.includes("notes")) return "study";
  if (artifacts.includes("decision")) return "decision";

  return "general";
}

function detectComplexity(
  text: string,
  artifacts: TaskArtifact[],
  constraints: string[]
): TaskComplexity {
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (wordCount > 45 || artifacts.length >= 3 || constraints.length >= 2) return "loaded";
  if (wordCount > 20 || artifacts.length >= 2 || constraints.length >= 1) return "moderate";
  return "simple";
}

function inferUserGoal(_text: string, domain: TaskDomain, artifacts: TaskArtifact[]) {
  if (domain === "academic-project") {
    return `Complete an academic project with ${formatList(artifacts)} while preserving the core concept.`;
  }

  if (domain === "coding") {
    return "Build or improve a working software implementation.";
  }

  if (domain === "digital-loop") {
    return "Exit a digital attention loop and return to one grounded action.";
  }

  if (domain === "human-reengagement") {
    return "Move from digital substitution toward one low-pressure real-world action.";
  }

  if (domain === "decision") {
    return "Choose the next action using constraints instead of rumination.";
  }

  return "Clarify the problem and identify the next grounded action.";
}

function inferModeFromTask(domain: TaskDomain, artifacts: TaskArtifact[], text: string): Mode {
  if (domain === "digital-loop") return "unscroll";
  if (domain === "decision" || artifacts.includes("decision")) return "decide";

  if (
    hasAny(text, [
      "just write",
      "do it for me",
      "understand later",
      "copy paste",
      "make the whole",
      "glorified chatgpt",
      "not a wrapper",
    ])
  ) {
    return "agency-check";
  }

  if (domain === "coding" || artifacts.includes("code") || artifacts.includes("app")) return "start";
  return "clarify";
}

function formatList(items: string[]) {
  if (items.length === 0) return "the required deliverables";
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}
