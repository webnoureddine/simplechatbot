import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Auth from "./components/Auth.jsx";
import Chat from "./components/Chat.jsx";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = still loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="center muted">Loading...</div>;
  return session ? <Chat user={session.user} /> : <Auth />;
}
