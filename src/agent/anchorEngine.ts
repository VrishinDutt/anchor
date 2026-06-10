import { parseTask, type ParsedTask } from "./taskParser";
import { generateTaskSpecificReply } from "./taskResponseGenerator";
import { inferActionCardFromPlan, inferActionCardFromReply } from "./actionCardLogic";
import { decideLlmUse } from "./llm/llmPolicy";
import { extractAnchorFeatures, type AnchorFeatures } from "./featureEngineering";
import { scoreHypotheses, selectBestHypothesis, type HypothesisScore } from "./reasoningModel";
import { createResponsePlan, type ResponsePlan } from "./responsePlanner";
import { buildInputFrame } from "./inputFrame";
import type { LlmPolicyDecision } from "./llm/llmTypes";
export type Mode =
  | "auto"
  | "clarify"
  | "start"
  | "decide"
  | "unscroll"
  | "agency-check";

export type ChatMessage = {
  role: "user" | "agent";
  content: string;
};

export type CognitiveState =
  | "steady"
  | "scattered"
  | "overstimulated"
  | "task-paralyzed"
  | "decision-stuck"
  | "outsourcing-thinking"
  | "unclear"
  | "avoidant"
  | "digitally-cocooned";

export type AgencyRisk = "low" | "medium" | "high";

export type ResponsePolicy =
  | "clarify-then-assist"
  | "socratic-scaffold"
  | "ground-then-narrow"
  | "decision-lens"
  | "entry-action"
  | "agency-check"
  | "human-world-redirect";

export type AnchorLoopStage =
  | "notice"
  | "name"
  | "narrow"
  | "choose"
  | "act"
  | "return";

export type ActionCard = {
  title: string;
  steps: string[];
};

export type AgentTrace = {
  signal: string;
  interpretation: string;
  policyReason: string;
};

export type AnchorSession = {
  turnCount: number;
  lastMode?: Mode;
  lastState?: CognitiveState;
  lastAgencyRisk?: AgencyRisk;
  activeTask?: ParsedTask;
  awaitingCheckpoint?: boolean;
  lastUserCheckpoint?: string;
};

export type AnchorResult = {
  detectedMode: Mode;
  cognitiveState: CognitiveState;
  agencyRisk: AgencyRisk;
  responsePolicy: ResponsePolicy;
  loopStage: AnchorLoopStage;
  reply: string;
  actionCard: ActionCard;
  trace: AgentTrace;
  parsedTask: ParsedTask;
  features: AnchorFeatures;
  hypothesis: HypothesisScore;
  hypothesisScores: HypothesisScore[];
  responsePlan: ResponsePlan;
  llmPolicy: LlmPolicyDecision;
};

export function createInitialSession(): AnchorSession {
  return {
    turnCount: 0,
    lastMode: "auto",
    lastState: "steady",
    lastAgencyRisk: "low",
    activeTask: undefined,
    awaitingCheckpoint: false,
    lastUserCheckpoint: undefined,
  };
}

export function createInitialResult(): AnchorResult {
  return {
    detectedMode: "auto",
    cognitiveState: "steady",
    agencyRisk: "low",
    responsePolicy: "clarify-then-assist",
    loopStage: "notice",
    reply:
      "I am Anchor. Bring me the thing that feels scattered, heavy, or too easy to outsource. I will help you hold the thread without taking the wheel.",
    actionCard: {
      title: "Start with one honest sentence",
      steps: [
        "Write what you are trying to do.",
        "Name what feels unclear.",
        "Choose one next physical action.",
      ],
    },
    trace: {
      signal: "Initial state",
      interpretation: "No user pattern detected yet.",
      policyReason: "Start by inviting self-description instead of over-assisting.",
    },
    parsedTask: {
      domain: "general",
      artifacts: [],
      complexity: "simple",
      constraints: [],
      userGoal: "Clarify the problem and identify the next grounded action.",
      inferredMode: "auto",
    },
    features: {
      intentClarity: 0,
      artifactPressure: 0,
      agencyRisk: 0,
      cognitiveLoad: 0,
      taskSpecificity: 0,
      ownershipSignal: 0,
      continuationSignal: 0,
      reflectionNeed: 0,
      actionability: 0,
      uncertainty: 0,
    },
    hypothesis: {
      hypothesis: "healthy_progress",
      score: 0,
      reasons: ["Initial state before user input."],
    },
    hypothesisScores: [],
    responsePlan: {
      hypothesis: "healthy_progress",
      stance: "direct",
      shouldAskQuestion: false,
      allowedDepth: "micro",
      userWorkRequired: "small",
      openingMove: "Start with one honest sentence.",
      nextAction: "Name the task and one unclear part.",
      reasons: ["Initial state before user input."],
    },
    llmPolicy: {
      permission: "scaffold-only",
      useCase: "summarize",
      reason: "No user input yet.",
    },
  };
}

export function runAnchorEngine(
  input: string,
  selectedMode: Mode,
  session: AnchorSession
): { result: AnchorResult; session: AnchorSession } {
  const normalized = normalize(input);
  const parsedTask = parseTask(input, selectedMode);
  const frame = buildInputFrame(input, Boolean(session.activeTask));
  const isCheckpointContinuation =
    Boolean(session.awaitingCheckpoint && session.activeTask && normalized.length > 0);
  const isActiveTaskFollowUp =
    Boolean(session.activeTask && !isClearlyNewTask(normalized, parsedTask));
  const effectiveTask =
    isCheckpointContinuation || isActiveTaskFollowUp ? session.activeTask! : parsedTask;
  const features = extractAnchorFeatures(input, effectiveTask, session);
  const hypothesisScores = scoreHypotheses(features, effectiveTask, frame);
  const hypothesis = selectBestHypothesis(hypothesisScores);
  const responsePlan = createResponsePlan(hypothesis, features, effectiveTask);
  const detectedMode = selectedMode === "auto" ? effectiveTask.inferredMode : selectedMode;
  const cognitiveState = mapCognitiveState(normalized, detectedMode);
  const agencyRisk = detectAgencyRisk(normalized);
  const responsePolicy = choosePolicy(detectedMode, cognitiveState, agencyRisk, normalized);
  const loopStage = chooseLoopStage(responsePolicy, cognitiveState, agencyRisk, session);
  const trace = buildTrace(normalized, detectedMode, cognitiveState, agencyRisk, responsePolicy);
  const llmPolicy = decideLlmUse({
    userInput: input,
    task: effectiveTask,
    agencyRisk,
    cognitiveState,
    responsePolicy,
    turnCount: session.turnCount,
  });

  const reply = generateTaskSpecificReply({
    input,
    task: effectiveTask,
    mode: detectedMode,
    cognitiveState,
    agencyRisk,
    policy: responsePolicy,
    loopStage,
    turnCount: session.turnCount,
    responsePlan,
  });

  const result: AnchorResult = {
    detectedMode,
    cognitiveState,
    agencyRisk: normalizeAgencyRiskAfterCheckpoint(agencyRisk, responsePolicy, session),
    responsePolicy: normalizePolicyLabel(responsePolicy, reply),
    loopStage,
    reply,
    actionCard:
      inferActionCardFromReply(reply) ??
      inferActionCardFromPlan(responsePlan) ??
      generateActionCard(detectedMode, cognitiveState, agencyRisk, loopStage),
    trace,
    parsedTask: effectiveTask,
    features,
    hypothesis,
    hypothesisScores,
    responsePlan,
    llmPolicy,
  };

  return {
    result,
    session: {
      turnCount: session.turnCount + 1,
      lastMode: detectedMode,
      lastState: cognitiveState,
      lastAgencyRisk: agencyRisk,
      activeTask: chooseActiveTask(session.activeTask, effectiveTask),
      awaitingCheckpoint: shouldAwaitCheckpoint(agencyRisk, responsePolicy, effectiveTask, isCheckpointContinuation),
      lastUserCheckpoint: isCheckpointContinuation ? input : session.lastUserCheckpoint,
    },
  };
}

function normalize(input: string) {
  return input
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();
}

function mapCognitiveState(text: string, mode: Mode): CognitiveState {
  if (
    includesAny(text, [
      "ai is easier",
      "talking to ai",
      "rather ask ai",
      "don't want to talk to anyone",
      "digital cocoon",
      "lonely",
    ])
  ) {
    return "digitally-cocooned";
  }

  if (mode === "agency-check") return "outsourcing-thinking";
  if (mode === "unscroll") return "overstimulated";
  if (mode === "decide") return "decision-stuck";
  if (mode === "start") {
    if (includesAny(text, ["avoiding", "avoid", "escape"])) return "avoidant";
    return "task-paralyzed";
  }

  if (includesAny(text, ["scattered", "too many", "overwhelmed", "switching"])) {
    return "scattered";
  }

  if (includesAny(text, ["confused", "unclear", "fog", "don't know", "can't think"])) {
    return "unclear";
  }

  return "steady";
}

function detectAgencyRisk(text: string): AgencyRisk {
  if (
    includesAny(text, [
      "just write",
      "do it for me",
      "i'll understand later",
      "understand later",
      "copy paste",
      "make it sound like",
      "vibe code",
      "vibecode",
      "don't want to think",
    ])
  ) {
    return "high";
  }

  if (
    includesAny(text, [
      "give answer",
      "full code",
      "complete report",
      "complete ppt",
      "talking to ai is easier",
      "rather ask ai",
      "ai is easier",
    ])
  ) {
    return "medium";
  }

  return "low";
}

function choosePolicy(
  mode: Mode,
  cognitiveState: CognitiveState,
  agencyRisk: AgencyRisk,
  text: string
): ResponsePolicy {
  if (cognitiveState === "digitally-cocooned") return "human-world-redirect";
  if (agencyRisk === "high") return "agency-check";
  if (mode === "agency-check") return "agency-check";
  if (mode === "decide") return "decision-lens";
  if (mode === "unscroll") return "ground-then-narrow";
  if (mode === "start") return "entry-action";

  if (
    includesAny(text, [
      "explain",
      "teach",
      "how does",
      "why does",
      "what is",
      "help me understand",
    ])
  ) {
    return "socratic-scaffold";
  }

  return "clarify-then-assist";
}

function chooseLoopStage(
  policy: ResponsePolicy,
  cognitiveState: CognitiveState,
  agencyRisk: AgencyRisk,
  session: AnchorSession
): AnchorLoopStage {
  if (agencyRisk === "high") return "name";
  if (policy === "ground-then-narrow") return "notice";
  if (policy === "decision-lens") return "choose";
  if (policy === "entry-action") return "act";
  if (policy === "human-world-redirect") return "return";
  if (session.turnCount === 0) return "name";
  if (cognitiveState === "unclear" || cognitiveState === "scattered") return "narrow";
  return "choose";
}

function generateActionCard(
  mode: Mode,
  cognitiveState: CognitiveState,
  agencyRisk: AgencyRisk,
  loopStage: AnchorLoopStage
): ActionCard {
  if (agencyRisk === "high") {
    return {
      title: "Understanding checkpoint",
      steps: [
        "State the real problem in one sentence.",
        "Name the part you understand.",
        "Name the part you are outsourcing.",
      ],
    };
  }

  if (cognitiveState === "digitally-cocooned") {
    return {
      title: "Keep the world larger than chat",
      steps: [
        "Choose one low-pressure real-world action.",
        "Make it practical, not emotionally performative.",
        "Return only after the action is attempted.",
      ],
    };
  }

  if (mode === "unscroll") {
    return {
      title: "Exit the loop",
      steps: [
        "Look away from the feed.",
        "Put the device down or switch tabs.",
        "Write the task you were avoiding in one line.",
      ],
    };
  }

  if (mode === "start") {
    return {
      title: "Five-minute entry",
      steps: [
        "Open the work surface.",
        "Create the smallest visible artifact.",
        "Stop judging quality until the first block exists.",
      ],
    };
  }

  if (mode === "decide") {
    return {
      title: "Decision lens",
      steps: [
        "List options.",
        "Score urgency, consequence, importance, and effort.",
        "Pick the best next action, not the perfect life plan.",
      ],
    };
  }

  return {
    title: `Anchor Loop: ${loopStage}`,
    steps: [
      "Write what is known.",
      "Write what is unclear.",
      "Choose the next question or action.",
    ],
  };
}




function normalizeAgencyRiskAfterCheckpoint(
  agencyRisk: AgencyRisk,
  responsePolicy: ResponsePolicy,
  session: AnchorSession
): AgencyRisk {
  if (session.awaitingCheckpoint && responsePolicy === "agency-check") {
    return "medium";
  }

  return agencyRisk;
}

function normalizePolicyLabel(policy: ResponsePolicy, reply: string): ResponsePolicy {
  const text = reply.toLowerCase();

  if (
    text.includes("report structure") ||
    text.includes("ppt flow") ||
    text.includes("demo script") ||
    text.includes("implementation scaffold") ||
    text.includes("viva explanation") ||
    text.includes("project definition draft")
  ) {
    return "clarify-then-assist";
  }

  return policy;
}

function isClearlyNewTask(text: string, parsedTask: ParsedTask) {
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (includesAny(text, ["new task", "different task", "reset topic", "forget this", "start over"])) {
    return true;
  }

  if (
    wordCount > 25 &&
    parsedTask.complexity === "loaded" &&
    parsedTask.constraints.length > 0
  ) {
    return true;
  }

  return false;
}


function chooseActiveTask(currentTask: ParsedTask | undefined, nextTask: ParsedTask) {
  if (!currentTask) {
    return shouldStoreActiveTask(nextTask) ? nextTask : undefined;
  }

  const currentWeight = taskWeight(currentTask);
  const nextWeight = taskWeight(nextTask);

  if (nextWeight > currentWeight) {
    return nextTask;
  }

  return currentTask;
}

function taskWeight(task: ParsedTask) {
  return (
    task.artifacts.length * 2 +
    task.constraints.length * 3 +
    (task.complexity === "loaded" ? 6 : task.complexity === "moderate" ? 3 : 1)
  );
}

function shouldStoreActiveTask(task: ParsedTask) {
  return task.complexity === "loaded" || task.constraints.length > 0 || task.artifacts.length >= 2;
}

function shouldAwaitCheckpoint(
  agencyRisk: AgencyRisk,
  policy: ResponsePolicy,
  task: ParsedTask,
  isCheckpointContinuation: boolean
) {
  if (isCheckpointContinuation) return false;
  return agencyRisk === "high" || policy === "agency-check" || task.complexity === "loaded";
}

function buildTrace(
  text: string,
  mode: Mode,
  cognitiveState: CognitiveState,
  agencyRisk: AgencyRisk,
  policy: ResponsePolicy
): AgentTrace {
  return {
    signal: text.length > 0 ? summarizeSignal(text) : "No user input yet.",
    interpretation: `Detected ${mode} mode with ${cognitiveState} state and ${agencyRisk} agency risk.`,
    policyReason: `Selected ${policy} because the agent should preserve user participation before giving output.`,
  };
}

function summarizeSignal(text: string) {
  if (text.length <= 80) return text;
  return `${text.slice(0, 80)}...`;
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}
