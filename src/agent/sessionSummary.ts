import type { AnchorResult, ChatMessage } from "./anchorEngine";

export type SessionSummary = {
  title: string;
  detectedPatterns: string[];
  artifacts: string[];
  constraints: string[];
  nextAction: string;
  summaryText: string;
};

export function generateSessionSummary(
  messages: ChatMessage[],
  latestResult: AnchorResult
): SessionSummary {
  const userMessages = messages.filter((message) => message.role === "user");
  const agentMessages = messages.filter((message) => message.role === "agent");
  const transcriptText = messages.map((message) => message.content).join(" ").toLowerCase();
  const latestAgentText = [...messages].reverse().find((message) => message.role === "agent")?.content ?? "";

  const detectedPatterns = unique([
    latestResult.cognitiveState,
    latestResult.agencyRisk !== "low" ? `agency-risk-${latestResult.agencyRisk}` : "",
    latestResult.responsePolicy,
    latestResult.loopStage,
    inferGeneratedArtifactLabel(latestAgentText),
  ].filter(Boolean));

  const artifacts = unique([
    ...latestResult.parsedTask.artifacts,
    ...inferArtifactsFromTranscript(transcriptText),
  ]);

  const constraints = unique([
    ...latestResult.parsedTask.constraints,
    ...inferConstraintsFromTranscript(transcriptText),
  ]);

  const nextAction =
    inferNextActionFromLatestAgent(latestAgentText) ??
    latestResult.actionCard.steps[0] ??
    "Choose one grounded next action.";

  const agencyStatus =
    latestResult.agencyRisk === "low" && transcriptText.includes("understanding checkpoint")
      ? "managed after checkpoint"
      : latestResult.agencyRisk;

  const summaryText = [
    "Anchor Session Summary",
    "",
    `User turns: ${userMessages.length}`,
    `Agent turns: ${agentMessages.length}`,
    `Detected task domain: ${latestResult.parsedTask.domain}`,
    `Detected complexity: ${latestResult.parsedTask.complexity}`,
    `Current cognitive state: ${latestResult.cognitiveState}`,
    `Agency risk: ${agencyStatus}`,
    `Current response policy: ${latestResult.responsePolicy}`,
    "",
    "User goal:",
    latestResult.parsedTask.userGoal,
    "",
    "Artifacts detected:",
    artifacts.length ? artifacts.map((item) => `- ${item}`).join("\n") : "- None explicitly detected",
    "",
    "Constraints preserved:",
    constraints.length
      ? constraints.map((item) => `- ${item}`).join("\n")
      : "- No explicit constraints detected",
    "",
    "Grounded next action:",
    `- ${nextAction}`,
    "",
    "Recent conversation:",
    ...messages.slice(-8).map((message) => {
      const label = message.role === "agent" ? "Anchor" : "User";
      return `${label}: ${message.content}`;
    }),
  ].join("\n");

  return {
    title: "Anchor Session Summary",
    detectedPatterns,
    artifacts,
    constraints,
    nextAction,
    summaryText,
  };
}

function inferGeneratedArtifactLabel(text: string) {
  const lower = text.toLowerCase();

  if (lower.includes("report structure")) return "artifact-report";
  if (lower.includes("ppt flow")) return "artifact-ppt";
  if (lower.includes("demo script")) return "artifact-demo";
  if (lower.includes("implementation scaffold")) return "artifact-code";
  if (lower.includes("viva explanation")) return "artifact-viva";
  if (lower.includes("project definition draft")) return "artifact-definition";

  return "";
}

function inferNextActionFromLatestAgent(text: string) {
  const lower = text.toLowerCase();

  if (lower.includes("report structure")) {
    return "Start writing report sections 1 and 2: Introduction and Problem Statement.";
  }

  if (lower.includes("ppt flow")) {
    return "Create the slide skeleton before adding visuals.";
  }

  if (lower.includes("demo script")) {
    return "Run the five demo prompts and confirm each expected behavior.";
  }

  if (lower.includes("implementation scaffold")) {
    return "Improve one code module and test it with a realistic prompt.";
  }

  if (lower.includes("viva explanation")) {
    return "Prepare the one-line definition, PEAS explanation, agent type, architecture, and ethics answers.";
  }

  if (lower.includes("project definition draft")) {
    return "Use the project definition as the report introduction base.";
  }

  return null;
}

function inferArtifactsFromTranscript(text: string) {
  const artifacts: string[] = [];

  if (hasAny(text, ["app", "application", "desktop app"])) artifacts.push("app");
  if (hasAny(text, ["code", "implementation", "engine", "module"])) artifacts.push("code");
  if (hasAny(text, ["report", "writeup", "documentation"])) artifacts.push("report");
  if (hasAny(text, ["ppt", "presentation", "slides", "deck"])) artifacts.push("ppt");
  if (hasAny(text, ["demo", "demonstration", "showcase"])) artifacts.push("demo");
  if (hasAny(text, ["viva", "oral"])) artifacts.push("viva");

  return artifacts;
}

function inferConstraintsFromTranscript(text: string) {
  const constraints: string[] = [];

  if (hasAny(text, ["glorified chatgpt", "not a wrapper", "gpt wrapper", "gemini wrapper"])) {
    constraints.push("Must not behave like a generic LLM wrapper.");
  }

  if (hasAny(text, ["non-therapeutic", "not therapy", "not therapist", "mental healthcare"])) {
    constraints.push("Must avoid therapy, diagnosis, or medical replacement framing.");
  }

  if (hasAny(text, ["preserve user agency", "surrendering their own thinking", "autonomy", "agency"])) {
    constraints.push("Must preserve user agency and require active thinking from the user.");
  }

  if (hasAny(text, ["metacognition", "metacognitive"])) {
    constraints.push("Must use metacognitive scaffolding instead of passive answer generation.");
  }

  if (hasAny(text, ["iai aat", "aat", "assignment", "professor", "academic"])) {
    constraints.push("Must fit academic evaluation while remaining practically meaningful.");
  }

  return constraints;
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}
