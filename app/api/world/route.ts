import { neon } from "@neondatabase/serverless";
import { applyInfluence, createInitialWorld, normalizeWorld, simulateWorld, type WorldState } from "@/lib/world";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WORLD_ID = "maplewood";
const CYCLE_MS = 20_000;

function getDb() {
  const url =
  process.env.DATABASE_URL ?? process.env.DATABASE_POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL is not configured. Add it in your hosting environment.");
  return neon(url);
}

function userId(request: Request) {
  const supplied = request.headers.get("x-player-id")?.trim();
  return supplied && supplied.length <= 100 ? supplied : "anonymous-player";
}

async function ensureSchema() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS world_snapshots (
    id text PRIMARY KEY,
    tick integer NOT NULL DEFAULT 0,
    state_json text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS player_states (
    user_id text PRIMARY KEY,
    influence_available integer NOT NULL DEFAULT 2,
    last_influence_tick integer NOT NULL DEFAULT -10,
    last_seen_tick integer NOT NULL DEFAULT 0,
    discovered_words_json text NOT NULL DEFAULT '["mora"]',
    updated_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS influences (
    id bigserial PRIMARY KEY,
    user_id text NOT NULL,
    type text NOT NULL,
    detail text NOT NULL,
    status text NOT NULL,
    outcome text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS influences_user_id_idx ON influences (user_id, id DESC)`;
}

type PlayerRow = {
  user_id: string;
  influence_available: number;
  last_influence_tick: number;
  last_seen_tick: number;
  discovered_words_json: string;
  updated_at: string;
};

async function loadWorld() {
  await ensureSchema();
  const sql = getDb();
  let rows = await sql`SELECT id, tick, state_json, updated_at FROM world_snapshots WHERE id = ${WORLD_ID}`;
  if (!rows.length) {
    const initial = createInitialWorld();
    await sql`INSERT INTO world_snapshots (id, tick, state_json, updated_at)
      VALUES (${WORLD_ID}, 0, ${JSON.stringify(initial)}, ${initial.lastSimulatedAt})
      ON CONFLICT (id) DO NOTHING`;
    rows = await sql`SELECT id, tick, state_json, updated_at FROM world_snapshots WHERE id = ${WORLD_ID}`;
  }

  let world = normalizeWorld(JSON.parse(String(rows[0].state_json)) as WorldState);
  const elapsed = Date.now() - new Date(world.lastSimulatedAt).getTime();
  const cycles = Math.min(8, Math.max(0, Math.floor(elapsed / CYCLE_MS)));
  if (cycles > 0) {
    world = simulateWorld(world, cycles);
    await sql`UPDATE world_snapshots SET tick = ${world.tick}, state_json = ${JSON.stringify(world)}, updated_at = ${world.lastSimulatedAt} WHERE id = ${WORLD_ID}`;
  }
  return world;
}

async function loadPlayer(request: Request, tick: number) {
  const sql = getDb();
  const id = userId(request);
  let rows = await sql`SELECT * FROM player_states WHERE user_id = ${id}`;
  if (!rows.length) {
    await sql`INSERT INTO player_states (user_id, influence_available, last_seen_tick)
      VALUES (${id}, 2, ${Math.max(0, tick - 3)}) ON CONFLICT (user_id) DO NOTHING`;
    rows = await sql`SELECT * FROM player_states WHERE user_id = ${id}`;
  }
  const player = rows[0] as PlayerRow;
  if (player.influence_available < 2 && tick - player.last_influence_tick >= 3) {
    await sql`UPDATE player_states SET influence_available = 2, updated_at = now() WHERE user_id = ${id}`;
    player.influence_available = 2;
  }
  return player;
}

export async function GET(request: Request) {
  try {
    const sql = getDb();
    const world = await loadWorld();
    const player = await loadPlayer(request, world.tick);
    const visit = new URL(request.url).searchParams.get("visit") === "1";
    const recap = world.events.filter((event) => event.tick > player.last_seen_tick).slice(0, 3);
    const history = await sql`SELECT id, type, status, outcome, created_at AS "createdAt"
      FROM influences WHERE user_id = ${player.user_id} ORDER BY id DESC LIMIT 6`;

    if (visit) await sql`UPDATE player_states SET last_seen_tick = ${world.tick}, updated_at = now() WHERE user_id = ${player.user_id}`;

    return Response.json({
      world,
      player: {
        influenceAvailable: player.influence_available,
        lastInfluenceTick: player.last_influence_tick,
        discoveredWords: JSON.parse(player.discovered_words_json) as string[],
      },
      recap: recap.length ? recap : world.events.slice(0, 3),
      influenceHistory: history,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The world could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = getDb();
    const payload = (await request.json()) as { type?: string; targetId?: string; eventId?: string };
    if (!payload.type || !["clue", "visit", "word", "distract", "mediate"].includes(payload.type)) {
      return Response.json({ error: "Unknown influence type." }, { status: 400 });
    }
    const world = await loadWorld();
    const target = world.residents.find((resident) => resident.id === payload.targetId);
    if (!target) return Response.json({ error: "That resident could not be found." }, { status: 400 });

    const player = await loadPlayer(request, world.tick);
    if (!player.influence_available) return Response.json({ error: "Your next gentle nudge is not ready yet." }, { status: 409 });

    const result = applyInfluence(world, payload.type, target.id, payload.eventId);
    const remainingInfluence = Math.max(0, player.influence_available - 1);
    const discovered = new Set(JSON.parse(player.discovered_words_json) as string[]);
    if (payload.type === "word" && result.accepted) discovered.add("vekka");
    const detail = `${target.name}: ${payload.type === "clue" ? "A brass key" : payload.type === "visit" ? "Visit the courtyard" : payload.type === "word" ? "The meaning of vekka" : payload.type === "distract" ? "Distract a dispute" : "Call a mediator"}`;

    await sql`UPDATE world_snapshots SET tick = ${result.world.tick}, state_json = ${JSON.stringify(result.world)}, updated_at = ${result.world.lastSimulatedAt} WHERE id = ${WORLD_ID}`;
    await sql`UPDATE player_states SET influence_available = ${remainingInfluence}, last_influence_tick = ${result.world.tick}, discovered_words_json = ${JSON.stringify([...discovered])}, updated_at = now() WHERE user_id = ${player.user_id}`;
    await sql`INSERT INTO influences (user_id, type, detail, status, outcome) VALUES (${player.user_id}, ${payload.type}, ${detail}, ${result.accepted ? "accepted" : "ignored"}, ${result.outcome})`;

    return Response.json({ ...result, influenceAvailable: remainingInfluence, discoveredWords: [...discovered] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The influence could not be saved." }, { status: 500 });
  }
}
