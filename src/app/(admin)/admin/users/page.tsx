import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/admin/reveal";
import {
  Avatar,
  Bar,
  ConsoleHeader,
  Empty,
  Kpi,
  Panel,
  TableShell,
  Td,
  Th,
} from "@/components/admin/ui";
import { Badge, Button, Input, Select } from "@/components/ui";
import { count, percent } from "@/lib/admin/format";
import { adminOverview, adminProfileBreakdown, adminUsers } from "@/lib/db/admin";
import { formatDateTime, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };

const FILTERS = [
  ["all", "All accounts"],
  ["real", "Real only"],
  ["demo", "Demo only"],
  ["public", "Public profiles"],
  ["unverified", "Unverified email"],
  ["incomplete", "Onboarding incomplete"],
] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").slice(0, 120);
  const filter = params.filter ?? "all";
  const requestedPage = Number(params.page ?? "1");
  const data = adminUsers({
    query,
    filter,
    page: Number.isFinite(requestedPage) ? requestedPage : 1,
  });
  const overview = adminOverview();
  const profiles = adminProfileBreakdown();
  const maxEvidence = Math.max(...data.rows.map((row) => row.evidenceCount), 1);
  const normalizedFilter = FILTERS.some(([value]) => value === filter) ? filter : "all";

  function pageHref(nextPage: number) {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (filter !== "all") search.set("filter", filter);
    if (nextPage > 1) search.set("page", String(nextPage));
    const suffix = search.toString();
    return suffix ? `/admin/users?${suffix}` : "/admin/users";
  }

  function filterHref(nextFilter: string) {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (nextFilter !== "all") search.set("filter", nextFilter);
    const suffix = search.toString();
    return suffix ? `/admin/users?${suffix}` : "/admin/users";
  }

  return (
    <div className="space-y-6">
      <ConsoleHeader
        eyebrow="People"
        title="Users and profiles"
        description="Accounts, onboarding state and evidence volume. Emails are visible here because this is the developer console; password hashes, session cookies and provider tokens are never selected."
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-muted">
            <Badge tone="neutral">{count(overview.users.total)} total</Badge>
            <Badge tone="primary">{count(overview.users.onboarded)} onboarded</Badge>
            <Badge tone="success">{count(overview.users.verified)} verified</Badge>
            <Badge tone="warning">{count(overview.users.demo)} demo</Badge>
            <span className="ml-auto">
              {count(profileCount(profiles.visibility, "public"))} public ·{" "}
              {count(profileCount(profiles.visibility, "private"))} private
            </span>
          </div>
        }
      />

      <Reveal>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label="Accounts"
            value={count(overview.users.total)}
            hint={`${count(overview.users.verified)} email-verified`}
          />
          <Kpi
            label="Onboarded"
            value={percent(overview.users.onboarded, overview.users.total)}
            hint={`${count(overview.users.onboarded)} completed profiles`}
            accent="var(--accent)"
          />
          <Kpi
            label="Public profiles"
            value={count(overview.users.publicProfiles)}
            hint={`${count(overview.users.selectableProfiles)} selectively shared`}
          />
          <Kpi
            label="Demo accounts"
            value={count(overview.users.demo)}
            hint="is_demo = 1, labelled everywhere"
            accent="var(--warning)"
          />
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <Panel
          title="Directory"
          description="Search by email, username or display name. Filters are applied in SQL before rows are serialised, so a hidden account is never sent to the browser."
          actions={<span className="text-[0.6875rem] text-muted">{count(data.total)} matching</span>}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map(([value, label]) => {
                // An unknown ?filter= value falls back to "all" in the query
                // layer, so the chip highlight must follow the same rule.
                const active = normalizedFilter === value;
                return (
                  <Link
                    key={value}
                    href={filterHref(value)}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "rounded-xs border border-primary/30 bg-primary-soft px-2.5 py-1 text-[0.75rem] text-primary"
                        : "rounded-xs border border-border px-2.5 py-1 text-[0.75rem] text-muted transition-colors hover:border-border-strong hover:text-foreground"
                    }
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            <form action="/admin/users" method="get" className="flex flex-wrap items-end gap-2">
              <label className="min-w-[14rem] flex-1">
                <span className="label mb-1 block">Search</span>
                <Input
                  name="q"
                  defaultValue={query}
                  placeholder="Email, username or display name"
                  autoComplete="off"
                />
              </label>
              <label>
                <span className="label mb-1 block">Filter</span>
                <Select name="filter" defaultValue={filter}>
                  {FILTERS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </label>
              <Button type="submit" size="md" variant="secondary">
                Apply
              </Button>
              {query || filter !== "all" ? (
                <Link href="/admin/users" className="pb-2.5 text-xs text-muted hover:text-foreground">
                  Clear
                </Link>
              ) : null}
            </form>

            {data.rows.length === 0 ? (
              <Empty>No accounts match this search.</Empty>
            ) : (
              <TableShell minWidth="64rem">
                <thead>
                  <tr>
                    <Th>Account</Th>
                    <Th>Visibility</Th>
                    <Th>State</Th>
                    <Th>Evidence</Th>
                    <Th>Last activity</Th>
                    <Th className="text-right">Joined</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.id} className="group">
                      <Td>
                        <div className="flex items-start gap-2.5">
                          <Avatar
                            seed={row.id}
                            label={(row.displayName ?? row.email).slice(0, 2)}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{row.displayName ?? "No profile"}</p>
                            <p className="truncate text-[0.6875rem] text-muted">{row.email}</p>
                            {row.username ? (
                              row.visibility === "public" ? (
                                <Link
                                  href={`/u/${row.username}`}
                                  className="font-mono text-[0.6875rem] text-primary hover:underline"
                                >
                                  @{row.username}
                                </Link>
                              ) : (
                                <span className="font-mono text-[0.6875rem] text-muted">
                                  @{row.username}
                                </span>
                              )
                            ) : null}
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <Badge tone={row.visibility === "public" ? "primary" : "neutral"}>
                          {row.visibility ?? "none"}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {row.isDemo ? <Badge tone="warning">Demo</Badge> : null}
                          {row.verified ? (
                            <Badge tone="success">Verified</Badge>
                          ) : (
                            <Badge tone="neutral">Unverified</Badge>
                          )}
                          {!row.onboardingComplete ? <Badge tone="neutral">Onboarding</Badge> : null}
                        </div>
                      </Td>
                      <Td className="w-32">
                        <div className="flex items-center gap-2">
                          <span className="num w-8 text-right text-[0.75rem]">
                            {count(row.evidenceCount)}
                          </span>
                          <span className="flex-1">
                            <Bar value={row.evidenceCount} max={maxEvidence} />
                          </span>
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap text-[0.6875rem] text-muted">
                        {row.lastActivityAt ? relativeTime(row.lastActivityAt) : "never"}
                      </Td>
                      <Td className="whitespace-nowrap text-right text-[0.6875rem] text-muted">
                        {formatDateTime(row.createdAt)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}

            {data.pages > 1 ? (
              <nav
                aria-label="Pagination"
                className="flex items-center justify-between text-[0.75rem] text-muted"
              >
                <span>
                  Page {data.page} of {data.pages}
                </span>
                <div className="flex gap-3">
                  {data.page > 1 ? (
                    <Link href={pageHref(data.page - 1)} className="text-primary hover:underline">
                      Previous
                    </Link>
                  ) : null}
                  {data.page < data.pages ? (
                    <Link href={pageHref(data.page + 1)} className="text-primary hover:underline">
                      Next
                    </Link>
                  ) : null}
                </div>
              </nav>
            ) : null}
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}

function profileCount(
  rows: Array<{ label: string; value: number }>,
  label: string,
): number {
  return rows.find((row) => row.label === label)?.value ?? 0;
}
