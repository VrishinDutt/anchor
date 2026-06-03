import type { ActionCard } from "./anchorEngine";

export function inferActionCardFromReply(reply: string): ActionCard | null {
  const text = reply.toLowerCase();

  if (text.includes("report structure")) {
    return {
      title: "Start the report",
      steps: [
        "Write section 1: Introduction.",
        "Write section 2: Problem Statement.",
        "Do not polish formatting until the argument is complete.",
      ],
    };
  }

  if (text.includes("ppt flow") || text.includes("slide 1")) {
    return {
      title: "Build the slide skeleton",
      steps: [
        "Create the title slide.",
        "Create slides for problem, solution, architecture, demo, and ethics.",
        "Add visuals only after the slide order is clear.",
      ],
    };
  }

  if (text.includes("demo script")) {
    return {
      title: "Prepare the demo path",
      steps: [
        "Test the false mastery prompt.",
        "Test the checkpoint continuation flow.",
        "Test report, PPT, demo, and decision lens artifact routing.",
      ],
    };
  }

  if (text.includes("implementation scaffold") || text.includes("core modules")) {
    return {
      title: "Build the next module",
      steps: [
        "Choose one module to improve.",
        "Patch behavior before polishing UI.",
        "Run the app and test with one realistic prompt.",
      ],
    };
  }

  if (text.includes("viva explanation")) {
    return {
      title: "Prepare viva answers",
      steps: [
        "Memorize the one-line definition.",
        "Explain why Anchor is an agent, not a wrapper.",
        "Prepare PEAS, agent type, architecture, and ethics answers.",
      ],
    };
  }

  if (text.includes("project definition draft")) {
    return {
      title: "Lock the concept",
      steps: [
        "Use the project definition as the report introduction base.",
        "Preserve the non-wrapper and non-therapy boundaries.",
        "Move next to report, PPT, demo, or code.",
      ],
    };
  }

  return null;
}
