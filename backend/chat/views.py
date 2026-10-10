import json
from functools import wraps

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from . import llm
from .supa import sb, user_from_token

HISTORY_LIMIT = 12   # last N messages sent to the LLM
MAX_MESSAGE_LEN = 4000


def api(*methods):
    """Token auth + method check. Sets request.user_id."""
    def decorator(fn):
        @csrf_exempt
        @wraps(fn)
        def wrapper(request, *args, **kwargs):
            if request.method not in methods:
                return JsonResponse({"error": "Method not allowed."}, status=405)
            token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
            user = user_from_token(token)
            if user is None:
                return JsonResponse({"error": "Please sign in."}, status=401)
            request.user_id = user.id
            return fn(request, *args, **kwargs)
        return wrapper
    return decorator


def body_of(request) -> dict:
    try:
        data = json.loads(request.body or b"{}")
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def get_conversation(conv_id: str, user_id: str):
    try:
        res = (sb.table("conversations").select("*").eq("id", conv_id).eq("user_id", user_id)
               .limit(1).execute())
    except Exception:  # e.g. malformed uuid
        return None
    return res.data[0] if res.data else None


def health(request):
    return JsonResponse({"ok": True})


@api("GET", "POST")
def conversations(request):
    if request.method == "GET":
        rows = (sb.table("conversations").select("id,title,created_at").eq("user_id", request.user_id)
                .order("created_at", desc=True).execute().data)
        return JsonResponse({"conversations": rows})
    row = sb.table("conversations").insert({"user_id": request.user_id}).execute().data[0]
    return JsonResponse({"conversation": {k: row[k] for k in ("id", "title", "created_at")}})


@api("DELETE")
def conversation_detail(request, conv_id):
    if not get_conversation(conv_id, request.user_id):
        return JsonResponse({"error": "Conversation not found."}, status=404)
    sb.table("conversations").delete().eq("id", conv_id).eq("user_id", request.user_id).execute()
    return JsonResponse({"ok": True})


@api("GET")
def conversation_messages(request, conv_id):
    if not get_conversation(conv_id, request.user_id):
        return JsonResponse({"error": "Conversation not found."}, status=404)
    rows = (sb.table("messages").select("id,role,content").eq("conversation_id", conv_id)
            .eq("user_id", request.user_id).order("id").limit(300).execute().data)
    return JsonResponse({"messages": rows})


@api("POST")
def chat(request):
    data = body_of(request)
    message = str(data.get("message", "")).strip()[:MAX_MESSAGE_LEN]
    conv = get_conversation(str(data.get("conversation_id", "")), request.user_id)
    if not conv or not message:
        return JsonResponse({"error": "Pick a conversation and type a message."}, status=400)

    rows = (sb.table("messages").select("role,content").eq("conversation_id", conv["id"])
            .eq("user_id", request.user_id).order("id", desc=True).limit(HISTORY_LIMIT).execute().data or [])
    history = list(reversed(rows)) + [{"role": "user", "content": message}]

    try:
        answer = llm.ask(history)
    except Exception as exc:
        return JsonResponse({"error": f"The AI service returned an error: {exc}"}, status=502)

    sb.table("messages").insert([
        {"conversation_id": conv["id"], "user_id": request.user_id, "role": "user", "content": message},
        {"conversation_id": conv["id"], "user_id": request.user_id, "role": "assistant", "content": answer},
    ]).execute()

    title = conv["title"]
    if title == "New chat":
        title = message[:40] + ("..." if len(message) > 40 else "")
        sb.table("conversations").update({"title": title}).eq("id", conv["id"]).eq("user_id", request.user_id).execute()

    return JsonResponse({"answer": answer, "title": title})
