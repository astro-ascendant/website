import { createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";
import { Effect, Exit, Schema } from "effect";
import type { BirthProfile } from "@/lib/birth-profiles";
import {
  deleteAllProfiles,
  listProfiles,
  saveProfile,
  type BirthProfileStoreError,
  type SqlClient,
} from "@/server/birth-profile-store";
import { database } from "@/server/database.server";
import {
  OWNER_COOKIE,
  OWNER_COOKIE_MAX_AGE,
  readOwnerId,
} from "@/server/owner";

const Text = (maxLength: number) =>
  Schema.Trim.check(Schema.isMaxLength(maxLength));

/** One cast birth, as the chart form sends it. */
const BirthProfileRequest = Schema.Struct({
  name: Text(120),
  date: Schema.Trim.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/)),
  time: Schema.Trim.check(Schema.isPattern(/^\d{2}:\d{2}(?::\d{2})?$/)),
  place: Text(300),
  latitude: Schema.Finite.check(
    Schema.isBetween({ minimum: -90, maximum: 90 }),
  ),
  longitude: Schema.Finite.check(
    Schema.isBetween({ minimum: -180, maximum: 180 }),
  ),
  sex: Schema.optionalKey(Schema.Literals(["Male", "Female"])),
});

export interface ProfileResponse {
  ok: boolean;
}

const OK: ProfileResponse = { ok: true };
const FAILED: ProfileResponse = { ok: false };

function existingOwner(): string | null {
  return readOwnerId(getCookie(OWNER_COOKIE));
}

/** The browser's id, minted on its first cast and renewed on every one. */
function ownerForWrite(): string {
  const id = existingOwner() ?? crypto.randomUUID();
  setCookie(OWNER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OWNER_COOKIE_MAX_AGE,
  });
  return id;
}

/** Runs a store call, logging a failure instead of surfacing it. */
async function attempt<A>(
  label: string,
  fallback: A,
  body: (sql: SqlClient) => Effect.Effect<A, BirthProfileStoreError>,
): Promise<A> {
  const sql = database();
  if (sql === null) {
    return fallback;
  }
  const exit = await Effect.runPromiseExit(
    body(sql).pipe(
      Effect.catchTag("BirthProfileStoreError", (error) =>
        Effect.logError(
          `birth profile ${error.operation} failed`,
          error.cause,
        ).pipe(Effect.as(fallback)),
      ),
      Effect.withLogSpan(label),
    ),
  );
  return Exit.isSuccess(exit) ? exit.value : fallback;
}

export const saveBirthProfile = createServerFn({ method: "POST" })
  .validator((input: Schema.Codec.Encoded<typeof BirthProfileRequest>) => input)
  .handler(async ({ data }): Promise<ProfileResponse> => {
    const decoded = Schema.decodeUnknownOption(BirthProfileRequest)(data);
    if (decoded._tag === "None" || database() === null) {
      return FAILED;
    }
    const owner = ownerForWrite();
    return attempt("profile.save", FAILED, (sql) =>
      saveProfile(sql, owner, decoded.value).pipe(Effect.as(OK)),
    );
  });

export const listBirthProfiles = createServerFn({ method: "GET" }).handler(
  async (): Promise<BirthProfile[]> => {
    const owner = existingOwner();
    if (owner === null) {
      return [];
    }
    return attempt("profile.list", [], (sql) => listProfiles(sql, owner));
  },
);

/** Forgets everything this browser stored, then drops its id. */
export const deleteAllBirthProfiles = createServerFn({
  method: "POST",
}).handler(async (): Promise<ProfileResponse> => {
  const owner = existingOwner();
  if (owner === null) {
    return OK;
  }
  const response = await attempt("profile.deleteAll", FAILED, (sql) =>
    deleteAllProfiles(sql, owner).pipe(Effect.as(OK)),
  );
  if (response.ok) {
    deleteCookie(OWNER_COOKIE, { path: "/" });
  }
  return response;
});
