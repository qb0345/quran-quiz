# quran-quiz

Quran quiz web app with adaptive difficulty (Elo + IRT), gamification
(streaks, XP, tiers, badges), admin question bank, and a user-submitted
community pool.

## Feature summary

| Area | Where |
|---|---|
| Frontend | Next.js 16 App Router — see `app/` (play flow, profile, leaderboard, admin) |
| Backend | Supabase local (Postgres 17 + PostgREST + GoTrue) with RLS + pgTAP tests |
| 2FA | GoTrue TOTP — `app/profile/security` (enroll), `app/auth/mfa` (challenge) |
| ML / AI | Python FastAPI (`ml/`) — Elo live, IRT batch calibration (scikit-learn), weak-ayah recommender |
| Docker (local) | `docker-compose.yml` — web + ml containers, Supabase runs alongside on host |

## Architecture

```
browser
  │ http://localhost:3400
  ▼
┌─ web container ──────────────────────────────┐
│ Next.js 16 (App Router, standalone)          │
│  · RSC pages + server actions                │
│  · @supabase/ssr session -> RLS              │
│  · service-role client for admin ops         │
│  · proxy.ts: session refresh + admin gate    │
└────┬──────────────────────┬──────────────────┘
     │ @supabase/ssr        │ HTTP  ML_URL=http://ml:8400
     │ REST/Auth :54621     │
     ▼                      ▼
┌─ supabase CLI stack ─┐  ┌─ ml container ──────────────┐
│ Kong · GoTrue (auth  │  │ FastAPI + psycopg + sklearn │
│ + MFA TOTP) ·        │  │  · /attempt (Elo update)    │
│ PostgREST · Realtime │  │  · /recommend (focus mode)  │
│ Studio :54623        │  │  · /board (admin)           │
│ Postgres :54622 ◄────┼──┤  · /calibrate (IRT reband)  │
└──────────────────────┘  └─────────────────────────────┘
```

Ports:
- Web 3400, ML 8400
- Supabase API 54621, Postgres 54622, Studio 54623, Inbucket 54624, Analytics 54627

## Prerequisites

- Docker Desktop
- Node 22.20+ (uses `--experimental-strip-types` for `.mts` scripts and `node:sqlite`)
- Supabase CLI 2.95.4
- Python 3.12 (Docker image) or 3.14 (local dev — see `ml/requirements.txt` for version notes)

## Cold-start runbook



```bash
# 1. Boot Supabase local stack on the 5462x port block
supabase start

# 2. Apply migrations + seed (6236 verses, 400 questions, 1600 choices)
supabase db reset

# 3. Bootstrap admin
npm run create:admin -- admin@quran-quiz.local 'AdminDemo#2026' Admin

# 4a. Local dev (fastest iteration)
npm install
npm run dev                                                 # web :3400
ml/.venv/Scripts/python -m uvicorn ml.app:app --port 8400   # ml :8400

# 4b. OR docker-compose
docker compose up --build
```

Pre-flight check: `npm run demo:preflight`

## Credentials

- **Admin**: `admin@quran-quiz.local` / `AdminDemo#2026`
- **Player**: sign up fresh at `/auth/signup`

## Regenerating the question bank

Optional — the committed `supabase/seed.sql` is enough to run the app. Regenerating
needs the Quran reference corpus (sqlite) placed at `../corpus/quran.sqlite` or
pointed to via the `CORPUS_PATH` env var.

```bash
npm run gen:seed          # writes supabase/seed.sql
supabase db reset         # applies the new seed
```

Byte-deterministic — regenerating produces the identical seed file (mulberry32 seeded PRNG).

## Tests

```bash
npm test                  # vitest: normalizer, corpus pins, gamification, quiz-selection, ml-client, integration
supabase test db          # pgtap: RLS policies
cd ml && .venv/Scripts/python -m pytest -q    # pytest: elo, recommend, irt, endpoints
```

## Repo layout

```
.
├── app/            # Next.js App Router pages + server actions
│   ├── auth/       # signup, login, logout, mfa challenge
│   ├── play/       # mode picker, session, results
│   ├── profile/    # profile + TOTP enroll/verify
│   ├── admin/      # question CRUD, approval queue, difficulty board
│   ├── submit/     # user-submitted community questions
│   └── leaderboard/# global + per-mode
├── components/     # HeroCarousel, Navbar, Footer, CountPicker, JuzPicker, QuestionCard
├── lib/            # gamification, arabic, surahs, quiz-selection, ml-client, supabase clients
├── ml/             # Python FastAPI service (elo, recommend, irt, endpoints)
├── seed/           # question bank generator (Node CLI)
├── supabase/       # config, migrations, RLS pgTAP tests, seed.sql
├── scripts/        # create-admin.mts, demo-preflight.mts
└── proxy.ts        # Next 16 middleware (session refresh + admin gate)
```

## Attribution

- **Quran text**: Tanzil Project — Creative Commons Attribution 3.0. Verbatim Uthmani.
- **Hadith**: Sahih al-Bukhari, English + Arabic bundles from the fawazahmed0 hadith-api dataset (data/hadith/).
