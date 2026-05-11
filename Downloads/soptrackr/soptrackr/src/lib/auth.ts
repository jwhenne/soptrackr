import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { withTenantClient } from './db';

export type DbUser = {
  id: string;            // uuid
  clerk_user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
};

export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'cancelled';

export type OrgMembership = {
  org_id: string;
  org_name: string;
  org_slug: string;
  role: 'admin' | 'manager' | 'parts_consultant' | 'service_advisor' | 'technician';
  subscription_status: SubscriptionStatus;
  current_period_end: string | null;
};

export type Rooftop = {
  id: string;
  org_id: string;
  name: string;
  brand: string | null;
  city: string | null;
  state: string | null;
};

/**
 * Returns the current Clerk user's row in our `users` table, creating it on
 * first sight (lazy sync — no Clerk webhook required for v1).
 *
 * Returns null only if the request is unauthenticated.
 */
export async function getCurrentDbUser(): Promise<DbUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress ||
    '';
  const firstName = clerkUser.firstName ?? null;
  const lastName = clerkUser.lastName ?? null;
  const imageUrl = clerkUser.imageUrl ?? null;

  // Upsert keyed on clerk_user_id. Updates name/email if they changed in Clerk.
  return withTenantClient(userId, async (client) => {
    const { rows } = await client.query<DbUser>(
      `insert into users (clerk_user_id, email, first_name, last_name, image_url)
       values ($1, $2, $3, $4, $5)
       on conflict (clerk_user_id) do update set
         email = excluded.email,
         first_name = excluded.first_name,
         last_name = excluded.last_name,
         image_url = excluded.image_url,
         updated_at = now()
       returning id, clerk_user_id, email, first_name, last_name, image_url`,
      [userId, email, firstName, lastName, imageUrl]
    );
    return rows[0];
  });
}

/**
 * Returns the orgs the current user belongs to, with their role.
 * Empty array if the user has no org memberships yet (= needs onboarding).
 */
export async function getCurrentUserOrgs(): Promise<OrgMembership[]> {
  const { userId } = await auth();
  if (!userId) return [];

  // Make sure the DB user exists first so RLS lookups work.
  await getCurrentDbUser();

  return withTenantClient(userId, async (client) => {
    const { rows } = await client.query<OrgMembership>(
      `select o.id as org_id,
              o.name as org_name,
              o.slug as org_slug,
              m.role,
              o.subscription_status,
              o.current_period_end
       from org_members m
       join organizations o on o.id = m.org_id
       where m.user_id = current_user_id()
       order by o.name`
    );
    return rows;
  });
}

/** Returns true iff the org's subscription_status allows /app access. */
export function isOrgAccessible(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'past_due';
}

/**
 * Page-level guard. Returns the current user's first org if they're signed in
 * AND have an org AND its subscription is in an accessible state. Otherwise
 * triggers the appropriate redirect:
 *   - no user        → /sign-in
 *   - no org         → /app/onboarding
 *   - blocked status → /app/pending
 *
 * Use at the top of every gated /app/* page.
 */
export async function requireAccessibleOrg(): Promise<{ user: DbUser; org: OrgMembership }> {
  const user = await getCurrentDbUser();
  if (!user) redirect('/sign-in');
  const orgs = await getCurrentUserOrgs();
  if (orgs.length === 0) redirect('/app/onboarding');
  const org = orgs[0];
  if (!isOrgAccessible(org.subscription_status)) redirect('/app/pending');
  return { user, org };
}

export type OrgMember = {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  role: 'admin' | 'manager' | 'parts_consultant' | 'service_advisor' | 'technician';
  joined_at: string;
  is_self: boolean;
};

/** Returns the members of an org (current user must be a member). */
export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const { userId } = await auth();
  if (!userId) return [];

  await getCurrentDbUser();

  return withTenantClient(userId, async (client) => {
    const { rows } = await client.query<OrgMember>(
      `select u.id as user_id,
              u.email, u.first_name, u.last_name, u.image_url,
              m.role,
              m.created_at as joined_at,
              (u.clerk_user_id = current_clerk_user_id()) as is_self
       from org_members m
       join users u on u.id = m.user_id
       where m.org_id = $1
       order by case m.role
                  when 'admin' then 0
                  when 'manager' then 1
                  when 'parts_consultant' then 2
                  when 'service_advisor' then 3
                  when 'technician' then 4
                  else 99
                end,
                lower(coalesce(u.first_name, u.email))`,
      [orgId]
    );
    return rows;
  });
}

/** Returns all rooftops in the current user's org(s). */
export async function getCurrentUserRooftops(): Promise<Rooftop[]> {
  const { userId } = await auth();
  if (!userId) return [];

  await getCurrentDbUser();

  return withTenantClient(userId, async (client) => {
    const { rows } = await client.query<Rooftop>(
      `select id, org_id, name, brand, city, state
       from rooftops
       order by name`
    );
    return rows;
  });
}
