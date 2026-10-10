"""Free LLM through any OpenAI-compatible API (Groq, OpenRouter, Gemini...)."""
import os

from openai import OpenAI

_client = None

SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    "You are a friendly, concise assistant. Answer in the user's language.",
)


def client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=os.environ["OPENAI_API_KEY"],
            base_url=os.getenv("OPENAI_BASE_URL") or None,
            timeout=60,
            max_retries=2,
        )
    return _client


def ask(history: list[dict]) -> str:
    """history = [{"role": "user"|"assistant", "content": "..."}], oldest first."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history
    resp = client().chat.completions.create(
        model=os.environ["LLM_MODEL"],
        messages=messages,
        temperature=0.5,
    )
    return (resp.choices[0].message.content or "").strip() or "I have no answer for that."
