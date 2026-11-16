// Create the birth_profiles table in the database at DATABASE_URL.
// Safe to run again: every statement is "if not exists".
// Usage:
//   bun run db:migrate   # Bun reads DATABASE_URL from .env.local or the shell
import { neon } from "@neondatabase/serverless";
import { BIRTH_PROFILES_SCHEMA } from "../src/server/birth-profile-store";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set. See .env.example.");
  process.exit(1);
}

const sql = neon(url);
for (const statement of BIRTH_PROFILES_SCHEMA.split(";")) {
  if (statement.trim() !== "") {
    await sql.query(statement, []);
  }
}
console.log("birth_profiles is ready.");
