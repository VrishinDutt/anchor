import { FormEvent, useState } from "react";
import type { ChatMessage } from "../agent/anchorEngine";

type ChatPanelProps = {
  messages: ChatMessage[];
  onSend: (input: string) => void;
};

const samplePrompts = [
  {
    label: "Project",
    prompt:
      "For my IAI AAT I need to build a chatbot-esque AI agent app with report, PPT, and demo. I don't want it to be a glorified ChatGPT wrapper. It should preserve user agency, use metacognition, and remain non-therapeutic.",
  },
  {
    label: "False mastery",
    prompt: "Just make the full report and PPT so I can submit it.",
  },
  {
    label: "Unscroll",
    prompt: "I have been watching reels for 40 minutes and need to start my assignment.",
  },
  {
    label: "Decision",
    prompt: "Should I do code, report, or PPT first?",
  },
];

export function ChatPanel({ messages, onSend }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [showSamples, setShowSamples] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setInput("");
  }

  function sendSample(prompt: string) {
    onSend(prompt);
    setShowSamples(false);
  }

  return (
    <section className="thread-card">
      <div className="thread-scroll">
        {messages.map((message, index) => (
          <article key={index} className={`bubble ${message.role}`}>
            <span>{message.role === "agent" ? "Anchor" : "You"}</span>
            <p>{message.content}</p>
          </article>
        ))}
      </div>

      <form className="clean-composer" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="What thread do you want to hold?"
          rows={2}
        />
        <button type="submit">Send</button>
      </form>

      <div className="tiny-demo-row">
        <button type="button" onClick={() => setShowSamples((current) => !current)}>
          {showSamples ? "Hide demos" : "Demo threads"}
        </button>

        {showSamples && (
          <div>
            {samplePrompts.map((sample) => (
              <button key={sample.label} onClick={() => sendSample(sample.prompt)}>
                {sample.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
