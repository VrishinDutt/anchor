import type {
  AgencyRisk,
  CognitiveState,
  ResponsePolicy,
} from "../anchorEngine";
import type { ParsedTask } from "../taskParser";

export type LlmPermission =
  | "blocked"
  | "scaffold-only"
  | "bounded-generation"
  | "direct-generation";

export type LlmUseCase =
  | "none"
  | "explain"
  | "refine-writing"
  | "expand-structure"
  | "code-guidance"
  | "summarize"
  | "unsafe-or-out-of-scope";

export type LlmPolicyDecision = {
  permission: LlmPermission;
  useCase: LlmUseCase;
  reason: string;
  requiredUserCheckpoint?: string;
};

export type LlmPolicyInput = {
  userInput: string;
  task: ParsedTask;
  agencyRisk: AgencyRisk;
  cognitiveState: CognitiveState;
  responsePolicy: ResponsePolicy;
  turnCount: number;
};

export type LlmDraftRequest = {
  userInput: string;
  task: ParsedTask;
  policy: LlmPolicyDecision;
};

export type LlmDraftResult = {
  usedLlm: boolean;
  text: string;
  policy: LlmPolicyDecision;
};

export type ProviderStatus = {
  provider: string;
  anthropicKeyPresent: boolean;
  openaiKeyPresent: boolean;
  geminiKeyPresent: boolean;
  tauriRuntime: boolean;
  message: string;
};
