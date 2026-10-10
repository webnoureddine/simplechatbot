# Chat site: Django + React + Supabase + free LLM

- **Frontend:** React (Vite). Sign in/up with Supabase Auth, conversation list, chat UI.
- **Backend:** Django. Checks the Supabase login token, calls the LLM, saves messages.
- **Database:** Supabase Postgres (conversations + messages, with row-level security).
- **LLM:** any free OpenAI-compatible API (Groq, OpenRouter, Gemini).

```
React  --(Bearer token)-->  Django /api  -->  free LLM API
  |                            |
  +--- Supabase Auth           +--- Supabase Postgres (service key)
```

## 1. Supabase (5 min)
1. Create a project at supabase.com.
2. SQL Editor -> paste `supabase/schema.sql` -> Run.
3. Project Settings -> API: copy the Project URL, the `anon` key and the `service_role` key.
4. Optional for testing: Authentication -> Providers -> Email -> turn off "Confirm email".

## 2. Free LLM key
Create a free key at Groq (console.groq.com) or OpenRouter, then set `OPENAI_BASE_URL`,
`OPENAI_API_KEY` and `LLM_MODEL` in `backend/.env`. Check the provider's current free model names.

## 3. Run the backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows   (Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env         # Mac/Linux: cp .env.example .env   -> then fill it
python manage.py runserver 8000
```
Test: open http://localhost:8000/api/health -> `{"ok": true}`

## 4. Run the frontend
```bash
cd frontend
copy .env.example .env         # Mac/Linux: cp .env.example .env   -> then fill it
npm install
npm run dev
```
Open http://localhost:5173, create an account, and chat.

## Deploy
- Backend: `gunicorn config.wsgi` (Render, Railway, Fly.io). Set the same variables as `.env`,
  `DJANGO_DEBUG=0`, `DJANGO_ALLOWED_HOSTS=your-api-domain` and `CORS_ALLOWED_ORIGINS=https://your-frontend`.
- Frontend: `npm run build`, then host `dist/` (Vercel, Netlify). Set `VITE_API_URL=https://your-api-domain`.

## Security notes
- `SUPABASE_SERVICE_KEY` stays in the backend only. Never put it in React.
- Django uses the service key (it bypasses RLS), so every query filters by the verified `user_id`.

## Ideas for next steps
- Reuse the PDF/RAG code from ChatPDF v2: add a `chunks` table with pgvector and call `match_chunks` in `chat()`.
- Stream the answer token by token (SSE) instead of waiting for the full reply.
