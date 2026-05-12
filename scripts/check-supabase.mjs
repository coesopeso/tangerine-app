#!/usr/bin/env node
/**
 * Supabase connectivity check for Augusto's database.
 *
 * Reads the three required secrets from the environment, hits the project's
 * PostgREST endpoint with both keys, and performs an insert/read/delete probe
 * against `categorie` (a probe row that is removed before the script exits).
 *
 * Required secrets (configured via Replit Secrets, never committed):
 *   - VITE_SUPABASE_URL          Project URL (https://<ref>.supabase.co)
 *   - VITE_SUPABASE_ANON_KEY     Public "anon" key, used by the browser app
 *   - SUPABASE_SERVICE_ROLE_KEY  Server-side key with full DB access
 *
 * Usage:
 *   node scripts/check-supabase.mjs
 *
 * Exits 0 on success, 1 on any failure.
 */

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

if (!url) fail("Missing VITE_SUPABASE_URL");
if (!anon) fail("Missing VITE_SUPABASE_ANON_KEY");
if (!service) fail("Missing SUPABASE_SERVICE_ROLE_KEY");

const host = new URL(url).host;
console.log(`Supabase project: ${host}`);

const svcHeaders = {
  apikey: service,
  Authorization: `Bearer ${service}`,
};
const anonHeaders = {
  apikey: anon,
  Authorization: `Bearer ${anon}`,
};

// 1. Discover schema via PostgREST OpenAPI spec
const specRes = await fetch(`${url}/rest/v1/`, { headers: svcHeaders });
if (!specRes.ok) fail(`PostgREST root returned ${specRes.status}`);
const spec = await specRes.json();
const tables = Object.keys(spec.definitions || {});
console.log(`Tables in public schema (${tables.length}): ${tables.join(", ")}`);

// 2. Row counts per table (fail loudly on per-table errors)
for (const t of tables) {
  const r = await fetch(`${url}/rest/v1/${t}?select=*`, {
    headers: { ...svcHeaders, Prefer: "count=exact", Range: "0-0" },
  });
  if (!r.ok && r.status !== 206) fail(`Count probe on ${t} returned ${r.status}: ${await r.text()}`);
  console.log(`  ${t}: ${r.headers.get("content-range")}`);
}

// 3. Read probe with anon key (proves browser-side reads work too)
if (tables.includes("fiscal_config")) {
  const r = await fetch(`${url}/rest/v1/fiscal_config?select=*`, { headers: anonHeaders });
  if (!r.ok) fail(`Anon read on fiscal_config returned ${r.status}: ${await r.text()}`);
  console.log(`Anon read fiscal_config: status=${r.status}`);
}

// 4. Write probe (insert + delete) with service role
if (!tables.includes("categorie")) {
  console.log("Skipping write probe: 'categorie' table not present");
  process.exit(0);
}

const probeName = `__probe_${Date.now()}__`;
const ins = await fetch(`${url}/rest/v1/categorie`, {
  method: "POST",
  headers: { ...svcHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ nome: probeName, budget_mensile: 0, ordine: 9999 }),
});
if (ins.status !== 201) fail(`Insert probe failed: ${ins.status} ${await ins.text()}`);
const [row] = await ins.json();
console.log(`Insert probe: id=${row.id}`);

const del = await fetch(`${url}/rest/v1/categorie?id=eq.${row.id}`, {
  method: "DELETE",
  headers: svcHeaders,
});
if (del.status !== 204) fail(`Delete cleanup failed: ${del.status} ${await del.text()}`);
console.log("Delete cleanup: OK");

console.log("\nSupabase read/write OK.");
