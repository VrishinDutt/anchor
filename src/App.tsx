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
import { ChatPanel } from "./components/ChatPanel";
import { FocusPanel } from "./components/FocusPanel";
import { DetailDrawer } from "./components/DetailDrawer";

const initialMessages: ChatMessage[] = [
  {
    role: "agent",
    content:
      "Bring me the thing that feels scattered, heavy, or too easy to outsource. I’ll help you hold the thread without taking the wheel.",
  },
];

function App() {
  const [mode] = useState<Mode>("auto");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [session, setSession] = useState<AnchorSession>(createInitialSession());
  const [latestResult, setLatestResult] = useState<AnchorResult>(createInitialResult());

  const conversationCount = useMemo(
    () => messages.filter((message) => message.role === "user").length,
    [messages]
  );

  const lastUserInput = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  }, [messages]);

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
    setMessages(initialMessages);
    setSession(createInitialSession());
    setLatestResult(createInitialResult());
  }

  return (
    <main className="app-shell minimal-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Anchor</p>
          <h1>Hold the thread.</h1>
        </div>

        <div className="topbar-actions">
          <span className="version-pill">v0.2 Claude</span>
          <span>{conversationCount} turns</span>
          <button onClick={handleReset}>Reset</button>
        </div>
      </section>

      <section className="minimal-workspace">
        <ChatPanel messages={messages} onSend={handleSend} />

        <aside className="right-rail">
          <FocusPanel result={latestResult} session={session} />

          <DetailDrawer
            latestResult={latestResult}
            session={session}
            messages={messages}
            lastUserInput={lastUserInput}
          />
        </aside>
      </section>
    </main>
  );
}

export default App;
