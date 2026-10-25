import { pool } from "./db/pool.ts";

export type Locale = "en" | "fr" | "ar";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  locale: Locale;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  locale: Locale;
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const toPublicUser = (row: UserRow): PublicUser => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  locale: row.locale,
});

const COLUMNS = "id, email, password_hash, full_name, locale";

export async function findByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    `SELECT ${COLUMNS} FROM auth_svc.users WHERE lower(email) = $1`,
    [normalizeEmail(email)],
  );
  return rows[0] ?? null;
}

export async function findById(id: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(`SELECT ${COLUMNS} FROM auth_svc.users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** Returns null when the email is already registered. */
export async function createUser(input: {
  email: string;
  passwordHash: string;
  fullName: string;
  locale: Locale;
}): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO auth_svc.users (email, password_hash, full_name, locale)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING
     RETURNING ${COLUMNS}`,
    [normalizeEmail(input.email), input.passwordHash, input.fullName, input.locale],
  );
  return rows[0] ?? null;
}

export async function updateProfile(
  id: string,
  patch: { fullName?: string; locale?: Locale },
): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    `UPDATE auth_svc.users
     SET full_name = COALESCE($2, full_name),
         locale    = COALESCE($3, locale),
         updated_at = now()
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    [id, patch.fullName ?? null, patch.locale ?? null],
  );
  return rows[0] ?? null;
}
