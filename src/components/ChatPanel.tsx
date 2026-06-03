import { FormEvent, useState } from "react";
import type { ChatMessage } from "../agent/anchorEngine";

type ChatPanelProps = {
  messages: ChatMessage[];
  onSend: (input: string) => void;
};

const samplePrompts = [
  {
    label: "IAI project",
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
    <section className="chat-panel">
      <div className="chat-scroll">
        {messages.map((message, index) => (
          <article key={index} className={`message ${message.role}`}>
            <p className="message-role">{message.role === "agent" ? "Anchor" : "You"}</p>
            <p>{message.content}</p>
          </article>
        ))}
      </div>

      <div className="composer-zone">
        <form className="composer" onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Bring the thread here. Anchor will help you hold it without taking the wheel."
            rows={3}
          />
          <button type="submit">Anchor</button>
        </form>

        <div className="demo-thread-row">
          <button
            type="button"
            className="demo-thread-toggle"
            onClick={() => setShowSamples((current) => !current)}
          >
            {showSamples ? "Hide demo threads" : "Demo threads"}
          </button>

          {showSamples && (
            <div className="demo-thread-chips">
              {samplePrompts.map((sample) => (
                <button key={sample.label} onClick={() => sendSample(sample.prompt)}>
                  {sample.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
