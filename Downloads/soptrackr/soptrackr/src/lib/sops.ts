// Shared types + helpers for the SOP tracker.

export const SOP_STATUSES = [
  'ordered',
  'in_transit',
  'arrived',
  'notified',
  'scheduled',
  'installed',
  'complete',
  'returned',
] as const;

export type SopStatus = (typeof SOP_STATUSES)[number];

export const SOP_STATUS_LABELS: Record<SopStatus, string> = {
  ordered: 'Ordered',
  in_transit: 'In transit',
  arrived: 'Arrived',
  notified: 'Notified',
  scheduled: 'Scheduled',
  installed: 'Installed',
  complete: 'Complete',
  returned: 'Returned',
};

// Status badge classes — using exact Toyota tracker palette via tailwind theme
export const SOP_STATUS_BADGE_CLASS: Record<SopStatus, string> = {
  ordered: 'bg-sop-ordered-bg text-sop-ordered-fg',
  in_transit: 'bg-sop-transit-bg text-sop-transit-fg',
  arrived: 'bg-sop-arrived-bg text-sop-arrived-fg',
  notified: 'bg-sop-notified-bg text-sop-notified-fg',
  scheduled: 'bg-sop-scheduled-bg text-sop-scheduled-fg',
  installed: 'bg-sop-installed-bg text-sop-installed-fg',
  complete: 'bg-sop-complete-bg text-sop-complete-fg font-bold',
  returned: 'bg-sop-returned-bg text-sop-returned-fg',
};

// Maps a status to the column name on `sops` that should be timestamped
// when the SOP enters that status.
export const STATUS_TIMESTAMP_COLUMN: Partial<Record<SopStatus, string>> = {
  in_transit: 'in_transit_at',
  arrived: 'arrived_at',
  notified: 'notified_at',
  scheduled: 'scheduled_at',
  installed: 'installed_at',
  complete: 'completed_at',
  returned: 'returned_at',
};

export function isSopStatus(v: unknown): v is SopStatus {
  return typeof v === 'string' && (SOP_STATUSES as readonly string[]).includes(v);
}

// The shape of a row from `sops_with_age` view, used by GET endpoints.
export type SopRow = {
  id: string;
  org_id: string;
  rooftop_id: string;
  ro_number: string;
  sop_number: string | null;
  part_number: string | null;
  part_description: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  vehicle: string | null;
  vehicle_staying: boolean | null;
  advisor: string | null;
  notes: string | null;
  eta: string | null;            // YYYY-MM-DD
  backordered: boolean;
  notified_to_bdc: boolean;
  status: SopStatus;
  ordered_at: string;
  in_transit_at: string | null;
  arrived_at: string | null;
  notified_at: string | null;
  scheduled_at: string | null;
  installed_at: string | null;
  completed_at: string | null;
  returned_at: string | null;
  return_reason: string | null;
  created_at: string;
  updated_at: string;
  days_since_arrived: number | null;
  contact_attempts_count: number;
};

export type ContactLogRow = {
  id: string;
  sop_id: string;
  contacted_by_name: string | null;
  method: string | null;
  outcome: string | null;
  note: string | null;
  contacted_at: string;
};

export type StatusHistoryRow = {
  id: string;
  sop_id: string;
  from_status: SopStatus | null;
  to_status: SopStatus;
  changed_by_user_id: string | null;
  changed_at: string;
  note: string | null;
};

// 30-day return warning threshold (matches the existing Toyota app).
export const RETURN_WARNING_DAYS = 30;
