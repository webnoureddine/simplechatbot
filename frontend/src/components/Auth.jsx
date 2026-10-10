import { useState } from "react";
import { supabase } from "../supabase";

export default function Auth() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    const { data, error: err } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (err) return setError(err.message);
    if (mode === "signup" && !data.session) {
      setInfo("Account created. Check your email to confirm it, then sign in.");
      setMode("signin");
    }
  }

  return (
    <div className="center">
      <form className="auth" onSubmit={submit}>
        <h1>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="muted">Sign in to chat and keep your conversations.</p>

        <label htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" value={email}
               onChange={(e) => setEmail(e.target.value)} />

        <label htmlFor="password">Password</label>
        <input id="password" type="password" required minLength={6}
               autoComplete={mode === "signin" ? "current-password" : "new-password"}
               value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <p className="error" role="alert">{error}</p>}
        {info && <p className="info">{info}</p>}

        <button className="primary" disabled={busy}>
          {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>

        <button type="button" className="link"
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}>
          {mode === "signin" ? "No account yet? Create one" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
