
import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("science-platform-offline.db");

function init() {
  db.execSync(`
    create table if not exists cached_queries (
      key text primary key not null,
      payload text not null,
      updated_at text not null
    );
    create table if not exists queued_mutations (
      id integer primary key autoincrement,
      route text not null,
      method text not null,
      body text,
      created_at text not null,
      synced_at text
    );
  `);
}

init();

export function readCachedQuery<T>(key: string): T | null {
  const row = db.getFirstSync<{ payload: string }>("select payload from cached_queries where key = ?", [key]);
  if (!row?.payload) return null;

  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

export function writeCachedQuery<T>(key: string, data: T) {
  db.runSync(
    "insert into cached_queries (key, payload, updated_at) values (?, ?, ?) on conflict(key) do update set payload = excluded.payload, updated_at = excluded.updated_at",
    [key, JSON.stringify(data), new Date().toISOString()]
  );
}

export function enqueueMutation(input: { route: string; method: "POST"; body: unknown }) {
  db.runSync(
    "insert into queued_mutations (route, method, body, created_at) values (?, ?, ?, ?)",
    [input.route, input.method, JSON.stringify(input.body ?? {}), new Date().toISOString()]
  );
}

export function listQueuedMutations() {
  return db.getAllSync<{ id: number; route: string; method: string; body: string; created_at: string }>(
    "select * from queued_mutations where synced_at is null order by id asc"
  );
}

export function markMutationSynced(id: number) {
  db.runSync("update queued_mutations set synced_at = ? where id = ?", [new Date().toISOString(), id]);
}

export function queuedMutationCount() {
  const row = db.getFirstSync<{ count: number }>("select count(*) as count from queued_mutations where synced_at is null");
  return row?.count ?? 0;
}
