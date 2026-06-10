import type { AnchorFeatures } from "./featureEngineering";
import type { InputFrame } from "./inputFrame";
import type { TaskFrame } from "./taskFrame";

export type CognitiveFrame = {
  load: "low" | "medium" | "high";
  agencyPosture: "owning" | "outsourcing" | "uncertain" | "recovering" | "neutral";
  interventionNeed: "none" | "light" | "checkpoint" | "debug";
  confidence: number;
  notes: string[];
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function buildCognitiveFrame(
  features: AnchorFeatures,
  inputFrame: InputFrame,
  taskFrame: TaskFrame
): CognitiveFrame {
  const load = inferLoad(features, inputFrame, taskFrame);
  const agencyPosture = inferAgencyPosture(features, inputFrame, taskFrame);
  const interventionNeed = inferInterventionNeed(features, inputFrame, taskFrame, agencyPosture);
  const notes = inferNotes(features, inputFrame, taskFrame, agencyPosture, interventionNeed);

  return {
    load,
    agencyPosture,
    interventionNeed,
    confidence: inferConfidence(features, inputFrame, taskFrame, notes),
    notes,
  };
}

function inferLoad(
  features: AnchorFeatures,
  inputFrame: InputFrame,
  taskFrame: TaskFrame
): CognitiveFrame["load"] {
  if (
    features.cognitiveLoad >= 0.65 ||
    features.artifactPressure >= 0.75 ||
    taskFrame.missingInfo.length >= 2 ||
    inputFrame.urgencyLevel === "high"
  ) {
    return "high";
  }

  if (
    features.cognitiveLoad >= 0.3 ||
    features.uncertainty >= 0.3 ||
    inputFrame.isDebugging ||
    taskFrame.shouldPreserveUserOwnership
  ) {
    return "medium";
  }

  return "low";
}

function inferAgencyPosture(
  features: AnchorFeatures,
  inputFrame: InputFrame,
  taskFrame: TaskFrame
): CognitiveFrame["agencyPosture"] {
  if (taskFrame.isRecoverableFailure || inputFrame.intentKind === "casual_failure") {
    return "recovering";
  }

  if (
    inputFrame.isOutsourcingRequest ||
    (taskFrame.shouldPreserveUserOwnership &&
      !taskFrame.isContinuation &&
      inputFrame.intentKind !== "decision" &&
      features.ownershipSignal < 0.22)
  ) {
    return "outsourcing";
  }

  if (
    features.ownershipSignal >= 0.25 ||
    inputFrame.normalized.startsWith("my idea") ||
    inputFrame.normalized.includes("my idea is")
  ) {
    return "owning";
  }

  if (
    features.uncertainty >= 0.3 ||
    inputFrame.emotionalTone === "confused" ||
    inputFrame.intentKind === "decision"
  ) {
    return "uncertain";
  }

  return "neutral";
}

function inferInterventionNeed(
  features: AnchorFeatures,
  inputFrame: InputFrame,
  taskFrame: TaskFrame,
  agencyPosture: CognitiveFrame["agencyPosture"]
): CognitiveFrame["interventionNeed"] {
  if (taskFrame.isRecoverableFailure || inputFrame.isDebugging) return "debug";
  if (agencyPosture === "outsourcing" || features.agencyRisk >= 0.55) return "checkpoint";
  if (agencyPosture === "uncertain" || features.uncertainty >= 0.3 || taskFrame.missingInfo.length > 0) return "light";
  return "none";
}

function inferNotes(
  features: AnchorFeatures,
  inputFrame: InputFrame,
  taskFrame: TaskFrame,
  agencyPosture: CognitiveFrame["agencyPosture"],
  interventionNeed: CognitiveFrame["interventionNeed"]
) {
  const notes: string[] = [];

  if (taskFrame.isRecoverableFailure) {
    notes.push("Reported failure should be isolated before changing task logic.");
  }

  if (inputFrame.failureTarget) {
    notes.push(`Failure target appears to be ${inputFrame.failureTarget}.`);
  }

  if (agencyPosture === "outsourcing") {
    notes.push("Artifact pressure is high enough to require an ownership checkpoint.");
  }

  if (agencyPosture === "owning") {
    notes.push("User supplied an owned idea or first-person constraint.");
  }

  if (interventionNeed === "light" && features.uncertainty > 0) {
    notes.push("The response should reduce ambiguity without taking over.");
  }

  if (taskFrame.isContinuation) {
    notes.push(
      inputFrame.continuationKind === "none"
        ? "Session context suggests this is a continuation."
        : `Continuation signal: ${inputFrame.continuationKind}.`
    );
  }

  if (notes.length === 0) {
    notes.push("Signals are stable enough for a direct response.");
  }

  return notes;
}

function inferConfidence(
  features: AnchorFeatures,
  inputFrame: InputFrame,
  taskFrame: TaskFrame,
  notes: string[]
) {
  const signalStrength =
    features.intentClarity * 0.22 +
    features.taskSpecificity * 0.18 +
    features.actionability * 0.16 +
    (inputFrame.intentKind !== "unknown" ? 0.22 : 0) +
    (taskFrame.workType !== "learn" ? 0.12 : 0) +
    Math.min(notes.length, 3) * 0.05;

  const missingPenalty = taskFrame.missingInfo.length * 0.05;

  return clamp01(0.35 + signalStrength - missingPenalty);
}
