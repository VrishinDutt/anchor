import { useMemo, useState } from "react";
import "./styles/app.css";
import {
  createInitialResult,
  createInitialSession,
  runAnchorEngine,
  type AnchorResult,
  type AnchorSession,
  type ChatMessage,
  type Mode,
} from "./agent/anchorEngine";
import { ModeRail } from "./components/ModeRail";
import { ChatPanel } from "./components/ChatPanel";
import { AgencyPanel } from "./components/AgencyPanel";
import { ActionCard } from "./components/ActionCard";
import { SummaryPanel } from "./components/SummaryPanel";

const initialMessages: ChatMessage[] = [
  {
    role: "agent",
    content:
      "I am Anchor. Bring me the thing that feels scattered, heavy, or too easy to outsource. I will help you hold the thread without taking the wheel.",
  },
];

function App() {
  const [mode, setMode] = useState<Mode>("auto");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [session, setSession] = useState<AnchorSession>(createInitialSession());
  const [latestResult, setLatestResult] = useState<AnchorResult>(createInitialResult());

  const conversationCount = useMemo(
    () => messages.filter((message) => message.role === "user").length,
    [messages]
  );

  function handleSend(input: string) {
    const { result, session: updatedSession } = runAnchorEngine(input, mode, session);

    setMessages((current) => [
      ...current,
      { role: "user", content: input },
      { role: "agent", content: result.reply },
    ]);

    setLatestResult(result);
    setSession(updatedSession);
  }

  function handleReset() {
    setMode("auto");
    setMessages(initialMessages);
    setSession(createInitialSession());
    setLatestResult(createInitialResult());
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Metacognitive AI Agent</p>
          <h1>Anchor</h1>
          <p className="tagline">
            A quiet place to hold the thread.
          </p>
        </div>

        <div className="hero-actions">
          <div className="session-pill">
            <span>{conversationCount}</span>
            <p>user turns</p>
          </div>

          <button className="reset-button" onClick={handleReset}>
            Reset
          </button>
        </div>
      </section>

      <section className="workspace">
        <ModeRail activeMode={mode} onModeChange={setMode} />

        <ChatPanel messages={messages} onSend={handleSend} />

        <aside className="side-stack">
          <AgencyPanel result={latestResult} session={session} />
          <ActionCard action={latestResult.actionCard} />
          <SummaryPanel messages={messages} latestResult={latestResult} />
        </aside>
      </section>
    </main>
  );
}

export default App;
