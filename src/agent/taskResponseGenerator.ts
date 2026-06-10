import { tryRunDecisionLens } from "./decisionLens";
import type {
  AgencyRisk,
  AnchorLoopStage,
  CognitiveState,
  Mode,
  ResponsePolicy,
} from "./anchorEngine";
import type { ParsedTask } from "./taskParser";
import type { ResponsePlan } from "./responsePlanner";
import { composePlannedReply } from "./responseComposer";
import type { InputFrame } from "./inputFrame";
import type { TaskFrame } from "./taskFrame";
import type { CognitiveFrame } from "./cognitiveFrame";

type ArtifactRequest =
  | "code"
  | "report"
  | "ppt"
  | "demo"
  | "viva"
  | "project-definition"
  | "unknown";

export function generateTaskSpecificReply(params: {
  input: string;
  task: ParsedTask;
  mode: Mode;
  cognitiveState: CognitiveState;
  agencyRisk: AgencyRisk;
  policy: ResponsePolicy;
  loopStage: AnchorLoopStage;
  turnCount: number;
  responsePlan?: ResponsePlan;
  inputFrame?: InputFrame;
  taskFrame?: TaskFrame;
  cognitiveFrame?: CognitiveFrame;
}) {
  const { input, task, agencyRisk, policy, turnCount, responsePlan, inputFrame, taskFrame, cognitiveFrame } = params;
  const decisionResult = tryRunDecisionLens(input);
  if (decisionResult) {
    return decisionResult.reply;
  }

  const artifactRequest = detectArtifactRequest(input);
  if (
    turnCount > 0 &&
    artifactRequest !== "unknown" &&
    agencyRisk === "low" &&
    responsePlan &&
    ["needs_scaffold", "healthy_progress", "needs_grounded_action"].includes(responsePlan.hypothesis)
  ) {
    return generateArtifactReply(artifactRequest, input, task);
  }

  const composedReply = composePlannedReply({
    input,
    task,
    responsePlan,
    agencyRisk,
    inputFrame,
    taskFrame,
    cognitiveFrame,
  });
  if (composedReply) {
    return composedReply;
  }

  const plannedReply = generatePlanAwareReply(responsePlan, task, agencyRisk);
  if (plannedReply) {
    return plannedReply;
  }

  if (turnCount > 0 && artifactRequest !== "unknown") {
    return generateArtifactReply(artifactRequest, input, task);
  }

  if (turnCount > 0 && looksLikeCheckpointAnswer(input, task)) {
    return generateContinuationReply(input, task);
  }

  if (agencyRisk === "high" || policy === "agency-check") {
    return generateAgencyProtectedReply(task);
  }

  if (task.complexity === "loaded") {
    return generateLoadedTaskReply(task);
  }

  switch (task.domain) {
    case "academic-project":
      return generateAcademicProjectReply(task);

    case "coding":
      return generateCodingReply(task);

    case "presentation":
      return generatePresentationReply(task);

    case "writing":
      return generateWritingReply(task);

    case "study":
      return generateStudyReply(task);

    case "decision":
      return generateDecisionReply(task);

    case "digital-loop":
      return generateDigitalLoopReply();

    case "human-reengagement":
      return generateHumanReengagementReply();

    default:
      return generateGeneralReply(task);
  }
}


function generatePlanAwareReply(
  responsePlan: ResponsePlan | undefined,
  task: ParsedTask,
  agencyRisk: AgencyRisk
): string | null {
  if (!responsePlan) return null;

  if (responsePlan.hypothesis === "needs_agency_checkpoint" && agencyRisk !== "low") {
    return [
      responsePlan.openingMove,
      "",
      "I can help build the artifact, but Anchor should not erase your ownership of it.",
      "",
      "One-sentence checkpoint:",
      "What is the core idea you want this work to prove?",
      "",
      "Next grounded action:",
      responsePlan.nextAction,
    ].join("\n");
  }

  if (responsePlan.hypothesis === "needs_clarification" && task.artifacts.length === 0) {
    return [
      responsePlan.openingMove,
      "",
      "Choose one:",
      "1. Define the idea",
      "2. Build the code",
      "3. Debug a failure",
      "4. Write the report",
      "5. Prepare the presentation",
      "",
      "Next grounded action:",
      responsePlan.nextAction,
    ].join("\n");
  }

  if (responsePlan.hypothesis === "needs_language_refinement") {
    return [
      responsePlan.openingMove,
      "",
      "Refinement target:",
      "Keep the user's meaning fixed, but improve clarity, precision, and presentation.",
      "",
      "Next grounded action:",
      responsePlan.nextAction,
    ].join("\n");
  }

  if (responsePlan.hypothesis === "needs_debugging_help") {
    return [
      responsePlan.openingMove,
      "",
      "Debugging order:",
      "1. Reproduce the failure once.",
      "2. Read the exact error line.",
      "3. Patch the smallest failing layer.",
      "4. Re-run the build before changing design.",
      "",
      "Next grounded action:",
      responsePlan.nextAction,
    ].join("\n");
  }

  if (responsePlan.hypothesis === "needs_grounded_action" && task.complexity === "simple") {
    return [
      responsePlan.openingMove,
      "",
      "Next grounded action:",
      responsePlan.nextAction,
    ].join("\n");
  }

  return null;
}


function detectArtifactRequest(input: string): ArtifactRequest {
  const text = input.toLowerCase().trim();

  if (hasAny(text, ["project definition", "definition", "premise", "concept note"])) {
    return "project-definition";
  }

  if (hasAny(text, ["code", "implementation", "engine", "module", "logic"])) {
    return "code";
  }

  if (hasAny(text, ["report", "writeup", "write-up", "documentation"])) {
    return "report";
  }

  if (hasAny(text, ["ppt", "presentation", "slides", "deck"])) {
    return "ppt";
  }

  if (hasAny(text, ["demo", "demonstration", "showcase", "walkthrough"])) {
    return "demo";
  }

  if (hasAny(text, ["viva", "explain", "oral", "professor asks"])) {
    return "viva";
  }

  if (["1", "one"].includes(text)) return "project-definition";
  if (["2", "two"].includes(text)) return "code";
  if (["3", "three"].includes(text)) return "report";
  if (["4", "four"].includes(text)) return "demo";

  return "unknown";
}

function generateArtifactReply(
  artifact: ArtifactRequest,
  _input: string,
  task: ParsedTask
) {
  switch (artifact) {
    case "project-definition":
      return generateProjectDefinitionArtifact(task);

    case "code":
      return generateCodeArtifact(task);

    case "report":
      return generateReportArtifact(task);

    case "ppt":
      return generatePptArtifact(task);

    case "demo":
      return generateDemoArtifact(task);

    case "viva":
      return generateVivaArtifact(task);

    default:
      return generateGeneralReply(task);
  }
}

function generateProjectDefinitionArtifact(_task: ParsedTask) {
  return [
    "Project definition draft:",
    "",
    "Anchor is a metacognitive AI agent designed to help users interact with AI and digital tools without surrendering their own thinking. Instead of immediately producing complete answers, Anchor uses structured reflection, agency checks, task parsing, and grounded action cards to keep the user actively involved in the reasoning process.",
    "",
    "Core problem:",
    "Modern AI tools reduce effort, but they can also encourage passive dependency, false mastery, and digital isolation when users outsource too much thinking.",
    "",
    "Proposed solution:",
    "Anchor introduces useful friction. It asks the user to clarify intent, name constraints, and take one concrete next action before generating full artifacts.",
    "",
    "What Anchor is not:",
    "- Not a therapy chatbot.",
    "- Not a generic ChatGPT/Gemini wrapper.",
    "- Not an invasive productivity monitor.",
    "- Not an app that claims to fix the user's life.",
    "",
    "What Anchor is:",
    "- A user-invoked cognitive autonomy assistant.",
    "- A task-aware conversational agent.",
    "- A grounding tool for digital overload.",
    "- A practical assistant that helps users return to real-world action.",
    "",
    "Next grounded action:",
    "Use this as the introduction base for the report. Ask for 'report' next if you want the full report structure.",
  ].join("\n");
}

function generateCodeArtifact(_task: ParsedTask) {
  return [
    "Implementation scaffold:",
    "",
    "The code should prove that Anchor has agent behavior beyond a wrapper.",
    "",
    "Core modules:",
    "1. taskParser.ts",
    "   - Detects domain, artifacts, constraints, and complexity.",
    "",
    "2. anchorEngine.ts",
    "   - Maintains session state.",
    "   - Selects cognitive state, agency risk, response policy, and Anchor Loop stage.",
    "",
    "3. taskResponseGenerator.ts",
    "   - Produces domain-specific responses.",
    "   - Handles project, code, report, PPT, demo, study, decision, and digital-loop prompts.",
    "",
    "4. AgencyPanel.tsx",
    "   - Makes the agent's internal reasoning visible.",
    "",
    "5. ActionCard.tsx",
    "   - Converts chat into one grounded next action.",
    "",
    "Next code upgrade:",
    "Add a Decision Lens parser that can score options numerically when the user provides urgency, consequence, importance, and effort.",
    "",
    "Suggested next file to create:",
    "src/agent/decisionLens.ts",
  ].join("\n");
}

function generateReportArtifact(_task: ParsedTask) {
  return [
    "Report structure:",
    "",
    "Title:",
    "Anchor: A Metacognitive AI Agent for Digital Autonomy and Grounded Action",
    "",
    "1. Introduction",
    "- Explain the rise of AI assistants, short-form digital loops, and passive cognitive outsourcing.",
    "- State that Anchor is not anti-AI; it is anti-dependency.",
    "",
    "2. Problem Statement",
    "- Users increasingly rely on AI and digital systems for answers, emotional dumping, code generation, and decision-making.",
    "- This can create false mastery, reduced critical thinking, and digital cocooning.",
    "",
    "3. Objectives",
    "- Build a chatbot-esque AI agent with visible reasoning.",
    "- Preserve user agency through metacognitive checkpoints.",
    "- Generate grounded next actions.",
    "- Avoid therapy, diagnosis, and invasive monitoring.",
    "",
    "4. PEAS Analysis",
    "- Performance: clarity, agency preservation, useful next action, reduced passive dependence.",
    "- Environment: user's digital task context and self-reported cognitive state.",
    "- Actuators: chat responses, prompts, action cards, decision scaffolds.",
    "- Sensors: user text input, selected mode, session state, detected constraints.",
    "",
    "5. Agent Type",
    "- Model-based: maintains session and active task.",
    "- Goal-based: moves user toward clarity and action.",
    "- Utility-aware: decision lens scores options.",
    "- Rule-based: response policies guide behavior.",
    "",
    "6. System Architecture",
    "- User input",
    "- Task parser",
    "- Cognitive state mapper",
    "- Agency risk detector",
    "- Response policy engine",
    "- Task-specific generator",
    "- Action card generator",
    "- UI reasoning panel",
    "",
    "7. Implementation",
    "- Tauri + React + TypeScript desktop app.",
    "- Local-first rule-based engine.",
    "- No LLM dependency in MVP.",
    "",
    "8. Demo Scenarios",
    "- False mastery prompt.",
    "- Doomscroll loop prompt.",
    "- Academic project planning prompt.",
    "- Decision prioritization prompt.",
    "",
    "9. Ethics and Limitations",
    "- Not a therapist.",
    "- Not a crisis tool.",
    "- Does not diagnose.",
    "- Avoids emotional dependency.",
    "- Encourages real-world action.",
    "",
    "10. Future Scope",
    "- Local LLM integration.",
    "- Mobile version.",
    "- Privacy-preserving context awareness.",
    "- Optional user-owned memory.",
    "- Better task planning and reflection analytics.",
    "",
    "Next grounded action:",
    "Start writing section 1 and 2 first. Do not polish formatting yet.",
  ].join("\n");
}

function generatePptArtifact(_task: ParsedTask) {
  return [
    "PPT flow:",
    "",
    "Slide 1: Title",
    "Anchor: A Metacognitive AI Agent for Digital Autonomy and Grounded Action",
    "",
    "Slide 2: The Problem",
    "AI tools and digital platforms reduce friction, but they can also reduce agency.",
    "",
    "Slide 3: Why Generic Chatbots Are Not Enough",
    "They often answer immediately, which may encourage passive dependence and false mastery.",
    "",
    "Slide 4: Proposed Solution",
    "Anchor introduces useful friction through checkpoints, structured reflection, and grounded next actions.",
    "",
    "Slide 5: PEAS Analysis",
    "Show performance, environment, actuators, and sensors.",
    "",
    "Slide 6: Agent Architecture",
    "Input → parser → cognitive state → agency risk → policy → response → action card.",
    "",
    "Slide 7: The Anchor Loop",
    "Notice → Name → Narrow → Choose → Act → Return.",
    "",
    "Slide 8: Implementation",
    "Tauri + React + TypeScript, local-first, rule-based MVP.",
    "",
    "Slide 9: Demo Scenarios",
    "False mastery, doomscrolling, loaded academic task, decision lens.",
    "",
    "Slide 10: Ethics",
    "Not therapy, not diagnosis, not invasive monitoring, not a human replacement.",
    "",
    "Slide 11: Future Scope",
    "Local LLM, mobile app, privacy-preserving context awareness, better planning engine.",
    "",
    "Slide 12: Conclusion",
    "Anchor helps users use AI without surrendering their own thinking.",
    "",
    "Next grounded action:",
    "Build slides from architecture first, visuals second.",
  ].join("\n");
}

function generateDemoArtifact(_task: ParsedTask) {
  return [
    "Demo script:",
    "",
    "Opening line:",
    "Anchor is not designed to give users more passive answers. It is designed to help users preserve agency while using AI.",
    "",
    "Demo 1: False Mastery",
    "Prompt:",
    "Can you just make the full report and PPT so I can submit it?",
    "",
    "Expected behavior:",
    "Anchor detects agency risk and asks for an understanding checkpoint instead of blindly generating everything.",
    "",
    "Demo 2: Loaded Academic Task",
    "Prompt:",
    "For my IAI AAT I need an AI agent app with report, PPT, and demo. It should not be a GPT wrapper.",
    "",
    "Expected behavior:",
    "Anchor detects academic project, app/report/PPT/demo artifacts, and non-wrapper constraints.",
    "",
    "Demo 3: Checkpoint Continuation",
    "Prompt:",
    "It helps users use AI without surrendering their own thinking.",
    "",
    "Expected behavior:",
    "Anchor continues the active task and generates a project structure.",
    "",
    "Demo 4: Doomscroll Loop",
    "Prompt:",
    "I have been watching reels for 40 minutes and need to start my assignment.",
    "",
    "Expected behavior:",
    "Anchor identifies a digital loop and gives a grounded interruption.",
    "",
    "Demo 5: Decision Lens",
    "Prompt:",
    "Should I do the code, report, or PPT first?",
    "",
    "Expected behavior:",
    "Anchor introduces a priority scoring model.",
    "",
    "Closing line:",
    "The goal is not to replace the user's mind. The goal is to help the user return to it.",
  ].join("\n");
}

function generateVivaArtifact(_task: ParsedTask) {
  return [
    "Viva explanation:",
    "",
    "What is Anchor?",
    "Anchor is a metacognitive AI agent that helps users preserve autonomy while using digital tools and AI systems.",
    "",
    "Why is it an AI agent?",
    "It perceives user input, maintains session state, detects task domain and cognitive patterns, selects a response policy, and acts through structured chat responses and action cards.",
    "",
    "Why is it not a GPT wrapper?",
    "The MVP does not depend on an LLM. It uses a custom rule-based agent engine with task parsing, agency risk detection, response policy selection, and session continuity.",
    "",
    "What AI concepts are used?",
    "- Intelligent agents",
    "- PEAS",
    "- Model-based agents",
    "- Goal-based behavior",
    "- Utility-aware decision support",
    "- Knowledge representation through rules",
    "- Human-centered AI ethics",
    "",
    "What is the ethical boundary?",
    "Anchor is not a therapist, crisis tool, diagnosis system, or emotional replacement. It is a user-invoked assistant for clarity, autonomy, and grounded action.",
    "",
    "One-line answer:",
    "Anchor helps users use AI without surrendering their own thinking.",
  ].join("\n");
}

function looksLikeCheckpointAnswer(input: string, task: ParsedTask) {
  const text = input.toLowerCase().trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (task.complexity === "loaded" && wordCount >= 5) return true;

  if (
    task.constraints.length > 0 &&
    hasAny(text, ["it helps", "the goal", "problem", "agent", "user", "agency", "autonomy"])
  ) {
    return true;
  }

  return false;
}

function generateContinuationReply(input: string, task: ParsedTask) {
  const checkpoint = input.trim();

  if (task.domain === "academic-project") {
    return [
      "Good. That is enough ownership to continue.",
      "",
      "I will now convert your checkpoint into a buildable project structure.",
      "",
      "Working premise:",
      `"${checkpoint}"`,
      "",
      "Project definition:",
      "Anchor is a metacognitive AI agent that helps users use AI and digital tools without surrendering their own agency. It introduces useful friction through checkpoints, structured reflection, and grounded next-action planning.",
      "",
      "Immediate implementation modules:",
      "1. Task parser: detects domain, deliverables, constraints, and complexity.",
      "2. Agency risk detector: identifies false mastery and over-outsourcing patterns.",
      "3. Response policy engine: decides whether to answer, scaffold, challenge, or redirect.",
      "4. Task-specific generator: produces project, coding, writing, study, and decision scaffolds.",
      "5. Action card system: converts conversation into one grounded next move.",
      "",
      "Next options:",
      "1. project definition",
      "2. code",
      "3. report",
      "4. demo",
      "5. ppt",
      "6. viva",
      "",
      "Reply with one option. I will generate that artifact next.",
    ].join("\n");
  }

  if (task.domain === "coding") {
    return [
      "Good. Now we can move from vague build pressure to a concrete implementation step.",
      "",
      "Your checkpoint:",
      `"${checkpoint}"`,
      "",
      "Next code target:",
      "Build continuity-aware session memory so Anchor can recognize when the user is answering a previous checkpoint.",
      "",
      "Implementation order:",
      "1. Store activeTask in session.",
      "2. Store awaitingCheckpoint flag.",
      "3. Detect checkpoint continuation.",
      "4. Generate a continuation response instead of restarting detection.",
      "5. Show active task in the Agency Panel.",
      "",
      "Next grounded action:",
      "Patch the engine first. UI polish comes after behavior is real.",
    ].join("\n");
  }

  if (task.domain === "writing") {
    return [
      "Good. I will turn your rough claim into a usable writing scaffold.",
      "",
      "Your claim:",
      `"${checkpoint}"`,
      "",
      "Polished argument structure:",
      "1. The modern digital environment creates convenience, but also passive dependence.",
      "2. Generic AI assistants often answer too quickly, reducing user participation.",
      "3. Anchor proposes a different model: assistive friction.",
      "4. The system helps users clarify, choose, act, and return to the real world.",
      "5. It avoids clinical claims and does not position itself as a substitute for human support.",
      "",
      "Next grounded action:",
      "Ask for one section at a time. Start with the problem statement.",
    ].join("\n");
  }

  return [
    "Good. That gives us a real starting point.",
    "",
    "Your checkpoint:",
    `"${checkpoint}"`,
    "",
    "I will use this as the anchor for the next artifact instead of replacing your reasoning.",
    "",
    "Next options:",
    "1. Convert this into a project definition.",
    "2. Convert this into an implementation plan.",
    "3. Convert this into a report outline.",
    "4. Convert this into a demo script.",
    "",
    "Choose one.",
  ].join("\n");
}

function generateLoadedTaskReply(task: ParsedTask) {
  return [
    "This is a loaded task, so I am going to structure it instead of giving a generic answer.",
    "",
    `Task domain: ${task.domain}`,
    `User goal: ${task.userGoal}`,
    `Artifacts detected: ${task.artifacts.length ? task.artifacts.join(", ") : "none explicitly detected"}`,
    "",
    "Constraints I need to preserve:",
    ...formatBullets(task.constraints.length ? task.constraints : ["Keep the solution practical, grounded, and user-driven."]),
    "",
    "Recommended build order:",
    "1. Define the agent behavior before polishing the interface.",
    "2. Build the smallest working task-specific response engine.",
    "3. Add the UI panels that expose the agent's reasoning.",
    "4. Create demo scenarios that prove it is not a generic wrapper.",
    "5. Extract the report and PPT from the actual architecture.",
    "",
    "Agency checkpoint:",
    "Before generating a full artifact, state the project in one sentence. Then I can expand it into code, report structure, demo flow, or presentation flow.",
  ].join("\n");
}

function generateAcademicProjectReply(task: ParsedTask) {
  return [
    "This is an academic project task. We should treat it as a deliverable system, not just a write-up.",
    "",
    "Project structure:",
    "1. Problem statement",
    "2. Agent concept",
    "3. PEAS analysis",
    "4. Agent architecture",
    "5. Implementation modules",
    "6. Demo scenarios",
    "7. Ethics and limitations",
    "8. Future scope",
    "",
    "Detected deliverables:",
    ...formatBullets(task.artifacts.length ? task.artifacts : ["app", "report", "presentation", "demo"]),
    "",
    "Next grounded action:",
    "Write the one-line premise of the agent. I will then turn it into the report skeleton or app module plan.",
  ].join("\n");
}

function generateCodingReply(_task: ParsedTask) {
  return [
    "This is a build task. We should not jump straight into code without deciding what the code must prove.",
    "",
    "Implementation plan:",
    "1. Identify the user intent.",
    "2. Extract task details and constraints.",
    "3. Select a response policy.",
    "4. Generate a task-specific scaffold.",
    "5. Produce an action card.",
    "",
    "Minimum viable code artifact:",
    "A parser + response generator that can handle academic, coding, writing, decision, and digital-loop prompts.",
    "",
    "Next grounded action:",
    "Implement one parser layer first. Do not add an LLM until the local agent behavior is clear.",
  ].join("\n");
}

function generatePresentationReply(_task: ParsedTask) {
  return [
    "This is a presentation task. The presentation should not start with features. It should start with the problem.",
    "",
    "Slide flow:",
    "1. The modern problem: digital tools reduce friction but can reduce agency.",
    "2. Why generic AI assistants are not enough.",
    "3. Anchor's principle: useful friction protects autonomy.",
    "4. Agent architecture.",
    "5. Anchor Loop.",
    "6. Demo scenarios.",
    "7. Ethics and limitations.",
    "8. Future production roadmap.",
    "",
    "Next grounded action:",
    "Write the opening 20-second explanation in your own words. I will refine it after you attempt it.",
  ].join("\n");
}

function generateWritingReply(_task: ParsedTask) {
  return [
    "This is a writing task. I will help structure the document without replacing your ownership of the argument.",
    "",
    "Writing scaffold:",
    "1. Claim: what are you arguing or proposing?",
    "2. Need: why does this matter?",
    "3. Mechanism: how does the system work?",
    "4. Evidence: what does the demo prove?",
    "5. Boundary: what does it not claim to solve?",
    "",
    "Next grounded action:",
    "Write a rough claim in one sentence. I will then convert it into a polished paragraph.",
  ].join("\n");
}

function generateStudyReply(_task: ParsedTask) {
  return [
    "This is a study task. I will not dump notes first; we need to build recall.",
    "",
    "Study scaffold:",
    "1. Name the topic.",
    "2. State what you already know.",
    "3. Identify the first gap.",
    "4. Solve one example.",
    "5. Summarize without looking.",
    "",
    "Next grounded action:",
    "Tell me the topic and your current rough understanding. I will correct and expand it.",
  ].join("\n");
}

function generateDecisionReply(_task: ParsedTask) {
  return [
    "This is a decision task. We will use constraints instead of mood.",
    "",
    "Decision Lens formula:",
    "Priority = urgency + consequence + importance - effort",
    "",
    "Send at least two options in this exact format:",
    "A: code demo, urgency 5, consequence 5, importance 5, effort 4",
    "B: report, urgency 4, consequence 5, importance 4, effort 3",
    "C: PPT, urgency 3, consequence 3, importance 3, effort 2",
    "",
    "I will calculate the scores and recommend the next move.",
  ].join("\n");
}

function generateDigitalLoopReply() {
  return [
    "This looks like a digital loop, not a character flaw.",
    "",
    "Do this first:",
    "1. Look away from the screen.",
    "2. Name what you were avoiding.",
    "3. Make the next action physical and visible.",
    "",
    "Example:",
    "Open the file, write the title, or put the phone across the room.",
    "",
    "The goal is not discipline theatre. The goal is one clean interruption.",
  ].join("\n");
}

function generateHumanReengagementReply() {
  return [
    "This looks like a digital-cocoon pattern. The safe interaction is becoming easier than real contact or real action.",
    "",
    "We keep this small:",
    "1. Pick one low-pressure human-world action.",
    "2. Make it practical, not emotionally dramatic.",
    "3. Return only after trying the action.",
    "",
    "Example:",
    "Message a classmate to cross-check a format, sit in a library, or ask one practical question.",
    "",
    "The point is not to become social on command. The point is to keep the world larger than the chat window.",
  ].join("\n");
}

function generateAgencyProtectedReply(task: ParsedTask) {
  return [
    "Detected pattern: this may become false mastery if I simply produce the final output.",
    "",
    "I can help, but Anchor will preserve one layer of useful friction.",
    "",
    `Task goal: ${task.userGoal}`,
    "",
    "Understanding checkpoint:",
    "1. What is the core problem?",
    "2. What should the final artifact prove?",
    "3. What part do you want help with first: structure, code, report, PPT, or demo?",
    "",
    "After you answer, I will generate the next artifact in a way you can explain.",
  ].join("\n");
}

function generateGeneralReply(task: ParsedTask) {
  return [
    "I need to convert this into a clearer working shape.",
    "",
    `Current goal: ${task.userGoal}`,
    "",
    "Answer these:",
    "1. What are you trying to finish?",
    "2. What is blocking you?",
    "3. What would count as the smallest real progress?",
    "",
    "Then I will build a practical next-step plan.",
  ].join("\n");
}

function formatBullets(items: string[]) {
  return items.map((item) => `- ${item}`);
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}
