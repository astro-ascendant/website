import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { Effect } from "effect";
import type { BirthProfile } from "@/lib/birth-profiles";
import {
  BIRTH_PROFILES_SCHEMA,
  deleteAllProfiles,
  listProfiles,
  saveProfile,
  type SqlClient,
} from "./birth-profile-store";

// Real Postgres, in memory: the same SQL Neon runs in production.
const db = new PGlite();
const sql: SqlClient = {
  query: async (text, params) =>
    (await db.query<Record<string, unknown>>(text, [...params])).rows,
};

const ME = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";

const CHENNAI: BirthProfile = {
  name: "Test Person",
  date: "1990-07-15",
  time: "10:00",
  place: "Chennai, India",
  latitude: 13.0827,
  longitude: 80.2707,
};
const NEW_YORK: BirthProfile = {
  name: "Another Test",
  date: "1985-01-02",
  time: "13:05",
  place: "New York, USA",
  latitude: 40.7128,
  longitude: -74.006,
  sex: "Female",
};

/** Moves stored rows a minute back, so the next save is clearly newer. */
const age = () =>
  sql.query(
    "update birth_profiles set updated_at = updated_at - interval '1 minute'",
    [],
  );

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

beforeEach(async () => {
  await db.exec(
    `drop table if exists birth_profiles; ${BIRTH_PROFILES_SCHEMA}`,
  );
});

afterAll(() => db.close());

describe("birth profile store", () => {
  test("lists a saved profile back as it was sent", async () => {
    await run(saveProfile(sql, ME, NEW_YORK));
    expect(await run(listProfiles(sql, ME))).toEqual([NEW_YORK]);
  });

  test("shows each browser only its own profiles", async () => {
    await run(saveProfile(sql, ME, CHENNAI));
    await run(saveProfile(sql, OTHER, NEW_YORK));
    expect(await run(listProfiles(sql, ME))).toEqual([CHENNAI]);
  });

  test("stores unnamed charts but leaves them out of the list", async () => {
    await run(saveProfile(sql, ME, { ...CHENNAI, name: "  " }));
    expect(await run(listProfiles(sql, ME))).toEqual([]);
    const rows = await sql.query("select name from birth_profiles", []);
    expect(rows).toEqual([{ name: "" }]);
  });

  test("casting the same birth again keeps one row", async () => {
    await run(saveProfile(sql, ME, CHENNAI));
    await run(saveProfile(sql, ME, { ...CHENNAI, sex: "Male" }));
    const rows = await sql.query(
      "select count(*)::int as n from birth_profiles",
      [],
    );
    expect(rows).toEqual([{ n: 1 }]);
    expect(await run(listProfiles(sql, ME))).toEqual([
      { ...CHENNAI, sex: "Male" },
    ]);
  });

  test("lists the latest birth per name, newest first", async () => {
    await run(saveProfile(sql, ME, CHENNAI));
    await age();
    await run(saveProfile(sql, ME, NEW_YORK));
    await age();
    await run(saveProfile(sql, ME, { ...CHENNAI, time: "11:30" }));
    expect(await run(listProfiles(sql, ME))).toEqual([
      { ...CHENNAI, time: "11:30" },
      NEW_YORK,
    ]);
  });

  test("deletes everything one browser stored, and nothing else", async () => {
    await run(saveProfile(sql, ME, CHENNAI));
    await run(saveProfile(sql, ME, { ...NEW_YORK, name: "" }));
    await run(saveProfile(sql, OTHER, CHENNAI));

    await run(deleteAllProfiles(sql, ME));
    const mine = await sql.query(
      "select count(*)::int as n from birth_profiles where owner_id = $1",
      [ME],
    );
    expect(mine).toEqual([{ n: 0 }]);
    expect(await run(listProfiles(sql, ME))).toEqual([]);
    expect(await run(listProfiles(sql, OTHER))).toEqual([CHENNAI]);
  });

  test("fails as a BirthProfileStoreError when the query fails", async () => {
    const broken: SqlClient = {
      query: () => Promise.reject(new Error("connection refused")),
    };
    const error = await Effect.runPromise(
      Effect.flip(listProfiles(broken, ME)),
    );
    expect(error).toMatchObject({
      _tag: "BirthProfileStoreError",
      operation: "list",
    });
  });
});
