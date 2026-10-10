import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "../supabase";
import { api } from "../api";

export default function Chat({ user }) {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const bottomRef = useRef(null);

  const refreshList = useCallback(async () => {
    const { conversations: rows } = await api.listConversations();
    setConversations(rows);
    return rows;
  }, []);

  // First load: open the latest conversation, or start a new one
  useEffect(() => {
    (async () => {
      try {
        const rows = await refreshList();
        if (rows.length) setActiveId(rows[0].id);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [refreshList]);

  // Load messages when the active conversation changes
  useEffect(() => {
    if (!activeId) return setMessages([]);
    api.getMessages(activeId).then((r) => setMessages(r.messages)).catch((e) => setError(e.message));
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function newChat() {
    setError("");
    try {
      const { conversation } = await api.createConversation();
      setConversations((c) => [conversation, ...c]);
      setActiveId(conversation.id);
      setMenuOpen(false);
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeChat(id) {
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await api.deleteConversation(id);
      const rows = await refreshList();
      if (id === activeId) setActiveId(rows[0]?.id ?? null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setError("");

    let convId = activeId;
    try {
      if (!convId) {
        const { conversation } = await api.createConversation();
        setConversations((c) => [conversation, ...c]);
        setActiveId(conversation.id);
        convId = conversation.id;
      }
      setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content: text }]);
      setInput("");
      setSending(true);
      const { answer, title } = await api.chat(convId, text);
      setMessages((m) => [...m, { id: `ai-${Date.now()}`, role: "assistant", content: answer }]);
      setConversations((c) => c.map((x) => (x.id === convId ? { ...x, title } : x)));
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) send(e);
  }

  return (
    <div className="app">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <button className="primary" onClick={newChat}>New chat</button>
        <nav aria-label="Conversations">
          {conversations.length === 0 && <p className="muted small">No conversations yet.</p>}
          {conversations.map((c) => (
            <div key={c.id} className={`conv ${c.id === activeId ? "active" : ""}`}>
              <button className="conv-title" onClick={() => { setActiveId(c.id); setMenuOpen(false); }}>
                {c.title}
              </button>
              <button className="icon" aria-label={`Delete ${c.title}`} onClick={() => removeChat(c.id)}>
                &times;
              </button>
            </div>
          ))}
        </nav>
        <div className="account">
          <span className="small muted" title={user.email}>{user.email}</span>
          <button className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon menu" aria-label="Toggle conversations" onClick={() => setMenuOpen((o) => !o)}>
            &#9776;
          </button>
          <strong>Ask anything</strong>
        </header>

        <div className="messages" role="log" aria-live="polite">
          {messages.length === 0 && !sending && (
            <div className="empty">
              <h2>What can I help you with?</h2>
              <p className="muted">Type a question below. Your conversation is saved to your account.</p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.role}`}>
              {m.role === "assistant" ? <ReactMarkdown>{m.content}</ReactMarkdown> : <p>{m.content}</p>}
            </div>
          ))}
          {sending && <div className="msg assistant typing" aria-label="Assistant is typing"><span /><span /><span /></div>}
          <div ref={bottomRef} />
        </div>

        {error && <p className="error banner" role="alert">{error}</p>}

        <form className="composer" onSubmit={send}>
          <textarea rows={1} placeholder="Type your message" value={input}
                    onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown}
                    aria-label="Message" />
          <button className="primary" disabled={sending || !input.trim()}>Send</button>
        </form>
      </main>
    </div>
  );
}
