"""Supabase helpers: one service-role client + JWT verification."""
import os

from supabase import create_client

# Service-role client bypasses RLS, so EVERY query must filter by the verified user id.
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


def user_from_token(token: str):
    """Return the Supabase user for a JWT, or None if invalid/expired."""
    if not token:
        return None
    try:
        return sb.auth.get_user(token).user
    except Exception:
        return None
