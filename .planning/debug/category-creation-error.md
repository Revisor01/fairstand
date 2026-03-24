---
status: awaiting_human_verify
trigger: "User gets an error message in the UI when trying to create a new category in the CategoryManager component. App is online, device is iPhone (Safari)."
created: 2026-03-24T00:00:00Z
updated: 2026-03-24T00:00:00Z
---

## Current Focus

hypothesis: Missing categories table in production database — Drizzle migrations folder only contains 0000_youthful_mantis.sql which does not include categories table. The table was added as a manual SQL file under src/db/migrations/ but that path is not used by the Dockerfile.
test: Confirmed by reading Dockerfile CMD and server/migrations/ directory contents
expecting: Fix = generate proper Drizzle migration 0001_add_categories.sql in server/migrations/
next_action: Apply migration file and fix iPhone layout issues

## Symptoms

expected: Creating a new category should succeed and show the new category in the list
actual: Error message appears in the UI when trying to create a category
errors: UI error message (exact text unknown) — likely "Fehler beim Anlegen" from catch block, triggered by non-ok API response (500 from SQLite "no such table: categories")
reproduction: Go to Admin → Kategorien tab → try to create a new category
started: Just implemented in Phase 17 (latest code)

## Eliminated

- hypothesis: CORS issue
  evidence: CORS is configured in server/src/index.ts with @fastify/cors, API and frontend are same-origin in production
  timestamp: 2026-03-24

- hypothesis: Missing shopId or wrong API URL in client
  evidence: CategoryManager correctly sends shopId via getShopId() and posts to /api/categories
  timestamp: 2026-03-24

- hypothesis: Schema validation error in Fastify route
  evidence: Route correctly validates shopId and name, both are provided by the client
  timestamp: 2026-03-24

- hypothesis: iOS-specific onPointerDown issue
  evidence: onPointerDown works for other buttons; the error is a server-side 500, not a client-side event issue
  timestamp: 2026-03-24

## Evidence

- timestamp: 2026-03-24
  checked: server/Dockerfile CMD
  found: CMD runs "npx drizzle-kit migrate && node dist/index.js" using migrations/ folder
  implication: Only SQL files in server/migrations/ are applied to the production database

- timestamp: 2026-03-24
  checked: server/migrations/ directory
  found: Only 0000_youthful_mantis.sql exists — no categories table
  implication: categories table does not exist in production DB → INSERT throws SQLite error → 500 response → client shows "Fehler beim Anlegen"

- timestamp: 2026-03-24
  checked: server/src/db/migrations/0005_add_categories.sql
  found: CREATE TABLE categories SQL exists but in wrong directory (src/db/migrations/ is NOT used by drizzle-kit or Dockerfile)
  implication: Manual SQL files were written but never wired into the migration pipeline

- timestamp: 2026-03-24
  checked: drizzle.config.ts
  found: out: './migrations' — drizzle-kit generates to and reads from server/migrations/
  implication: Running drizzle-kit generate creates 0001_add_categories.sql in the correct location

## Resolution

root_cause: The categories table migration was written manually to server/src/db/migrations/0005_add_categories.sql but the Dockerfile and drizzle-kit use server/migrations/ as the migrations directory. The table never existed in production, causing every POST /api/categories to throw a SQLite "no such table" error, returning 500, which the client displays as "Fehler beim Anlegen".
fix: Generated server/migrations/0001_add_categories.sql via drizzle-kit generate. This file will be picked up by the Dockerfile CMD and applied on next container start.
verification: Migration file generated and verified to contain correct CREATE TABLE categories DDL.
files_changed:
  - server/migrations/0001_add_categories.sql (new)
  - server/migrations/meta/_journal.json (updated by drizzle-kit)
  - server/migrations/meta/0001_snapshot.json (new)
  - client/src/features/admin/settings/CategoryManager.tsx (iPhone layout improvements)
  - client/src/features/admin/AdminScreen.tsx (iPhone layout improvements)
