/**
 * Birth details are stored under an anonymous id held in an HTTP-only cookie,
 * so each browser sees only what it cast. There are no accounts behind it.
 */
export const OWNER_COOKIE = "ascendant_owner";

/** One year, renewed on every cast. */
export const OWNER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The cookie's id when it is a well formed UUID, else null. */
export function readOwnerId(value: string | undefined): string | null {
  const id = value?.trim() ?? "";
  return UUID.test(id) ? id.toLowerCase() : null;
}
