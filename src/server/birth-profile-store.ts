import { Data, Effect } from "effect";
import type { BirthProfile } from "@/lib/birth-profiles";

/**
 * The one table that holds birth details. Every cast chart is a row, keyed to
 * the anonymous browser that cast it; casting the same birth again only
 * touches `updated_at`. Applied by `bun run db:migrate`.
 */
export const BIRTH_PROFILES_SCHEMA = `
create table if not exists birth_profiles (
  owner_id uuid not null,
  name text not null,
  date text not null,
  time text not null,
  place text not null,
  latitude double precision not null,
  longitude double precision not null,
  sex text check (sex in ('Male', 'Female')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, name, date, time, place)
);
create index if not exists birth_profiles_owner_updated
  on birth_profiles (owner_id, updated_at desc);
`;

/** Most profiles one browser gets back, matching the local list. */
const LIST_LIMIT = 20;

/** Parameterised SQL, so Neon in production and PGlite in tests both fit. */
export interface SqlClient {
  query: (
    text: string,
    params: readonly unknown[],
  ) => Promise<readonly Record<string, unknown>[]>;
}

export class BirthProfileStoreError extends Data.TaggedError(
  "BirthProfileStoreError",
)<{ readonly operation: string; readonly cause: unknown }> {}

const run = (
  sql: SqlClient,
  operation: string,
  text: string,
  params: readonly unknown[],
) =>
  Effect.tryPromise({
    try: () => sql.query(text, params),
    catch: (cause) => new BirthProfileStoreError({ operation, cause }),
  });

/** Records one cast birth, named or not. */
export const saveProfile = (
  sql: SqlClient,
  ownerId: string,
  profile: BirthProfile,
) =>
  run(
    sql,
    "save",
    `insert into birth_profiles
       (owner_id, name, date, time, place, latitude, longitude, sex)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (owner_id, name, date, time, place) do update set
       latitude = excluded.latitude,
       longitude = excluded.longitude,
       sex = excluded.sex,
       updated_at = now()`,
    [
      ownerId,
      profile.name.trim(),
      profile.date,
      profile.time,
      profile.place,
      profile.latitude,
      profile.longitude,
      profile.sex ?? null,
    ],
  ).pipe(Effect.asVoid);

function toProfile(row: Record<string, unknown>): BirthProfile {
  const sex = row.sex === "Male" || row.sex === "Female" ? row.sex : undefined;
  return {
    name: String(row.name),
    date: String(row.date),
    time: String(row.time),
    place: String(row.place),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    ...(sex === undefined ? {} : { sex }),
  };
}

/** The browser's named profiles, the latest birth per name, newest first. */
export const listProfiles = (sql: SqlClient, ownerId: string) =>
  run(
    sql,
    "list",
    `select name, date, time, place, latitude, longitude, sex from (
       select distinct on (name) *
       from birth_profiles
       where owner_id = $1 and name <> ''
       order by name, updated_at desc
     ) latest
     order by updated_at desc
     limit ${LIST_LIMIT}`,
    [ownerId],
  ).pipe(Effect.map((rows) => rows.map(toProfile)));

/** Removes everything the browser has stored, named or not. */
export const deleteAllProfiles = (sql: SqlClient, ownerId: string) =>
  run(sql, "deleteAll", "delete from birth_profiles where owner_id = $1", [
    ownerId,
  ]).pipe(Effect.asVoid);
