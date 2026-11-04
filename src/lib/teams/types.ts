/**
 * Team domain types.
 *
 * A team is an organization that consumes RepuH on behalf of its members.
 * The model is deliberately simple: seats, membership, and aggregate views.
 * No individual score is ever exposed outside that person's own account.
 */

export type TeamRole = "owner" | "admin" | "member";

export type TeamPlan = "free" | "team" | "enterprise";

export type SeatStatus = "invited" | "active" | "removed";

export interface Team {
  id: string;
  slug: string;
  name: string;
  plan: TeamPlan;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  status: SeatStatus;
  invitedAt: string | null;
  activatedAt: string | null;
  removedAt: string | null;
}

export interface TeamAggregate {
  teamId: string;
  generatedAt: string;
  members: number;
  seats: number;
  capabilities: Array<{
    skillId: string;
    skillName: string;
    categoryId: string;
    /** Number of members with a non-null estimate for this skill. */
    membersWithEstimate: number;
    /** Mean estimate across those members. */
    meanEstimate: number | null;
    /** Mean confidence across those members. */
    meanConfidence: number;
  }>;
  limitations: string[];
}