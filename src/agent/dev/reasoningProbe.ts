import {
  createInitialSession,
  runAnchorEngine,
  type AnchorSession,
} from "../anchorEngine";
import { parseTask } from "../taskParser";

const scenarios = [
  { name: "Claude/provider debugging", prompt: "claude aint working fam" },
  { name: "Frontend debugging", prompt: "button not working" },
  { name: "Tauri debugging", prompt: "npm run tauri dev broke" },
  { name: "False mastery", prompt: "Just make the full report and PPT so I can submit it." },
  { name: "Owned refinement", prompt: "My idea is Anchor helps users use AI without surrendering thinking. Refine it." },
  { name: "Decision uncertainty", prompt: "I’m confused, I don’t know whether to do code, report, or PPT first." },
  { name: "Proceed with active task", prompt: "proceed", session: seedActiveProjectSession() },
  { name: "Next with active task", prompt: "next", session: seedActiveProjectSession() },
  { name: "Done with active task", prompt: "done", session: seedActiveProjectSession() },
  { name: "Works with active task", prompt: "works", session: seedActiveProjectSession() },
  { name: "Cool with active task", prompt: "cool", session: seedActiveProjectSession() },
  { name: "Huh with active task", prompt: "huh", session: seedActiveProjectSession() },
  { name: "Oops with active task", prompt: "oops", session: seedActiveProjectSession() },
  { name: "Proceed with no active task", prompt: "proceed" },
  { name: "Works after Claude/provider debugging", prompt: "works", session: seedProviderDebugSession() },
  { name: "Done after report/presentation task", prompt: "done", session: seedReportPresentationSession() },
  { name: "Generate PPT follow-up", prompt: "Generate the PPT", session: seedActiveProjectSession() },
  { name: "Compound continuation", prompt: "The app works, next", session: seedProviderDebugSession() },
];

for (const scenario of scenarios) {
  const session = scenario.session ?? createInitialSession();
  const { result } = runAnchorEngine(scenario.prompt, "auto", session);

  console.log("\n========================================");
  console.log("scenario:", scenario.name);
  console.log("prompt:", scenario.prompt);
  console.log("inputFrame.intentKind:", result.inputFrame.intentKind);
  console.log("continuation:", {
    isContinuation: result.inputFrame.isContinuation,
    continuationKind: result.inputFrame.continuationKind,
  });
  console.log("failureTarget:", result.inputFrame.failureTarget);
  console.log("feature summary:", {
    intentClarity: result.features.intentClarity,
    artifactPressure: result.features.artifactPressure,
    agencyRisk: result.features.agencyRisk,
    ownershipSignal: result.features.ownershipSignal,
    actionability: result.features.actionability,
    uncertainty: result.features.uncertainty,
  });
  console.log("cognitiveFrame:", result.cognitiveFrame);
  console.log("top 3 hypotheses:", result.hypothesisScores.slice(0, 3));
  console.log("responsePlan:", result.responsePlan);
  console.log("composed reply:");
  console.log(result.reply);
}

function seedActiveProjectSession(): AnchorSession {
  const session = createInitialSession();

  return {
    ...session,
    turnCount: 1,
    activeTask: parseTask(
      "Anchor academic project with app, report, PPT, demo, and viva. It must preserve agency and not be a generic LLM wrapper.",
      "auto"
    ),
    lastActionCardTitle: "Build the next module",
    lastIntentKind: "project_planning",
    lastNextPrompt: "Choose the next product behavior to implement.",
    lastWorkType: "build",
  };
}

function seedProviderDebugSession(): AnchorSession {
  return {
    ...createInitialSession(),
    turnCount: 1,
    lastActionCardTitle: "Debug the smallest failing layer",
    lastFailureTarget: "claude",
    lastIntentKind: "casual_failure",
    lastNextPrompt: "Use Provider Health Check, then test one real Claude assist prompt.",
    lastWorkType: "debug",
  };
}

function seedReportPresentationSession(): AnchorSession {
  const session = seedActiveProjectSession();

  return {
    ...session,
    activeTask: parseTask(
      "Build the Anchor report and presentation flow while preserving agency checkpoints.",
      "auto"
    ),
    lastActionCardTitle: "Build the slide skeleton",
    lastIntentKind: "artifact_creation",
    lastNextPrompt: "Draft the slide skeleton before visual polish.",
    lastWorkType: "present",
  };
}
