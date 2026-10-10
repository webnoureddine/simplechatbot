import { supabase } from "./supabase";

const BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export const api = {
  listConversations: () => request("/conversations"),
  createConversation: () => request("/conversations", { method: "POST" }),
  deleteConversation: (id) => request(`/conversations/${id}`, { method: "DELETE" }),
  getMessages: (id) => request(`/conversations/${id}/messages`),
  chat: (conversation_id, message) =>
    request("/chat", { method: "POST", body: JSON.stringify({ conversation_id, message }) }),
};
