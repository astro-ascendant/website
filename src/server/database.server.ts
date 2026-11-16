import { neon } from "@neondatabase/serverless";
import type { SqlClient } from "@/server/birth-profile-store";

let client: SqlClient | null = null;
let read = false;

/**
 * The Neon client, or null when `DATABASE_URL` is unset so local work without
 * a database still casts charts. Read on the server only: the URL holds the
 * password and must never reach the client bundle.
 */
export function database(): SqlClient | null {
  if (!read) {
    read = true;
    const url = process.env.DATABASE_URL?.trim();
    if (url) {
      const sql = neon(url);
      client = { query: (text, params) => sql.query(text, [...params]) };
    }
  }
  return client;
}
