import { parseTask } from "../taskParser";
import { extractAnchorFeatures } from "../featureEngineering";
import { scoreHypotheses, selectBestHypothesis } from "../reasoningModel";
import { createResponsePlan } from "../responsePlanner";

const prompts = [
  "Just make the full report and PPT so I can submit it.",
  "My idea is that Anchor helps users use AI without surrendering their own thinking. Help me refine the problem statement.",
  "I’m confused, I don’t know whether to do code, report, or PPT first.",
  "The Claude button is not working after I run npm run tauri dev.",
  "I’ve finished the app. Now help me prepare the presentation flow.",
];

for (const prompt of prompts) {
  const parsedTask = parseTask(prompt, "build" as any);
  const features = extractAnchorFeatures(prompt, parsedTask, {
    activeTask: { title: "Anchor IAI AAT project" },
  });
  const scores = scoreHypotheses(features, parsedTask);
  const best = selectBestHypothesis(scores);
  const plan = createResponsePlan(best, features, parsedTask);

  console.log("\n========================================");
  console.log("PROMPT:", prompt);
  console.log("FEATURES:", features);
  console.log("TOP HYPOTHESIS:", best);
  console.log("PLAN:", plan);
}
