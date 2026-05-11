import { auth, currentUser } from '@clerk/nextjs/server';
import { query } from './db';
import { getCurrentDbUser, type DbUser } from './auth';

export type SuperAdminContext = {
  clerkUserId: string;
  dbUser: DbUser;
};

/**
 * Returns the current super admin context if the user is one, otherwise null.
 * Uses the unscoped `query()` (postgres role) since super admins need
 * cross-tenant access.
 */
export async function getSuperAdminContext(): Promise<SuperAdminContext | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return null;

  const { rows } = await query<{ ok: boolean }>(
    `select is_super_admin($1) as ok`, [userId]
  );
  if (!rows[0]?.ok) return null;

  return { clerkUserId: userId, dbUser };
}

/** Throws unauthorized if the current user is not a super admin. */
export async function requireSuperAdmin(): Promise<SuperAdminContext> {
  const ctx = await getSuperAdminContext();
  if (!ctx) {
    throw new SuperAdminUnauthorized();
  }
  return ctx;
}

export class SuperAdminUnauthorized extends Error {
  constructor() { super('Super admin access required'); this.name = 'SuperAdminUnauthorized'; }
}

/** Append a row to super_admin_actions for accountability. Best-effort, never throws. */
export async function logSuperAdminAction(
  ctx: SuperAdminContext,
  action: string,
  opts: { orgId?: string; resource?: string; details?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    await query(
      `insert into super_admin_actions (super_admin_user_id, action, target_org_id, target_resource, details)
       values ($1, $2, $3, $4, $5::jsonb)`,
      [
        ctx.dbUser.id,
        action,
        opts.orgId ?? null,
        opts.resource ?? null,
        opts.details ? JSON.stringify(opts.details) : null,
      ]
    );
  } catch (err) {
    // Audit failure shouldn't break the operation — but we WANT to know
    console.error('[super-admin.audit] log failed:', err);
  }
}

/** Check if the current Clerk user is a super admin (lightweight, no DB lookup of profile). */
export async function isCurrentUserSuperAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  // Make sure their users row exists (lazy sync) — otherwise super_admins join finds nothing
  const cu = await currentUser();
  if (!cu) return false;
  await getCurrentDbUser();

  const { rows } = await query<{ ok: boolean }>(
    `select is_super_admin($1) as ok`, [userId]
  );
  return !!rows[0]?.ok;
}
