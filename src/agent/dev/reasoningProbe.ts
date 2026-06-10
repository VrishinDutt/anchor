import {
  createInitialSession,
  runAnchorEngine,
  type AnchorSession,
} from "../anchorEngine";
import { parseTask } from "../taskParser";

const prompts = [
  "claude aint working fam",
  "button not working",
  "npm run tauri dev broke",
  "Just make the full report and PPT so I can submit it.",
  "My idea is Anchor helps users use AI without surrendering thinking. Refine it.",
  "I’m confused, I don’t know whether to do code, report, or PPT first.",
  "proceed",
  "done",
  "huh",
  "Generate the PPT",
  "The app works, next",
];

for (const prompt of prompts) {
  const session = seedSession(prompt);
  const { result } = runAnchorEngine(prompt, "auto", session);

  console.log("\n========================================");
  console.log("prompt:", prompt);
  console.log("inputFrame.intentKind:", result.inputFrame.intentKind);
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

function seedSession(prompt: string): AnchorSession {
  const session = createInitialSession();
  const text = prompt.toLowerCase();

  if (["proceed", "done", "huh", "generate the ppt", "the app works, next"].includes(text)) {
    return {
      ...session,
      turnCount: 1,
      activeTask: parseTask(
        "Anchor academic project with app, report, PPT, demo, and viva. It must preserve agency and not be a generic LLM wrapper.",
        "auto"
      ),
    };
  }

  return session;
}
