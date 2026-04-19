# How to apply `pilgrimage.sql` (recommended workflow)

## Why the Dashboard SQL editor keeps failing

The **Supabase Dashboard → SQL** panel is **not** a full PostgreSQL client. Long scripts, many `$$` blocks, and PL/pgSQL (`DECLARE`, `INTO`, local variables) are easy for it to **parse or split incorrectly**, which shows up as bogus errors like `relation "mode_value" does not exist` or `relation "capacity_total" does not exist`. That is a **tool limitation**, not necessarily bad SQL.

**Do not rely on pasting all of `pilgrimage.sql` into the Dashboard** for routine work.

### “This script used to run fine in Codex / before”

Older runs often succeeded because the SQL was run with `**psql`**, the **Supabase CLI**, a **migration runner**, or a **smaller chunk** pasted into the Dashboard. **Pasting the entire consolidated file** into the web SQL editor is fragile and will keep throwing **random `relation "<local_variable>" does not exist`** errors as soon as the next `DECLARE`/`INTO` line hits a parser edge case.

## Chunked files for the Dashboard (recommended)

The repo splits the monolith into `**supabase/sql/00_*.sql` … `14_*.sql**`. Run them **in order** (see `sql/README.md`). After you change `pilgrimage.sql`, regenerate pieces:

```bash
./supabase/scripts/split_pilgrimage.sh
```

## What to use instead

### Option A — `psql` (simplest)

1. In Supabase: **Project Settings → Database** → copy the **connection string** (URI), or use host + user + password + database.
2. From your machine:

```bash
psql "postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres" \
  -f supabase/pilgrimage.sql
```

Or set `PGPASSWORD` and use host/port/user/db from the dashboard.

### Option B — Supabase CLI

If the project is linked:

```bash
supabase db execute --file supabase/pilgrimage.sql
```

(Exact flag may vary by CLI version; `supabase db --help` for your install.)

### Option C — Smaller chunks

If you must use the Dashboard, run **one migration / one function at a time**, not a 5000-line file.

## Repo convention

- `**supabase/pilgrimage.sql`** — consolidated schema (source of truth in this repo).
- Helper functions that must run everywhere are being moved to `**LANGUAGE sql**` where possible so they survive naive clients; behavior may differ slightly (e.g. `NULL` instead of `RAISE` when a row is missing) — see comments on each function.

## Reset scripts (`15` / `16`)

Optional dev reset lives in **`supabase/sql/15_clear_public_and_auth.sql`** and **`16_seed_dev_admin.sql`** (see `sql/README.md`). Those are fine to run in the Dashboard **individually**. Full schema application should still prefer `psql` or CLI.