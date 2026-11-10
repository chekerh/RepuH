"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  CheckCircle2,
  Circle,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Badge } from "@/components/ui";
import type { RoleCoverage, RoleProfile } from "@/lib/roles";

interface RoleSummary {
  id: string;
  name: string;
  summary: string;
  requirementCount: number;
  coreCount: number;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export function RoleCoverageExplorer() {
  const reduceMotion = useReducedMotion();
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [selected, setSelected] = useState<string>("full-stack-engineer");
  const [coverage, setCoverage] = useState<RoleCoverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadRoles() {
      try {
        const response = await fetch("/api/roles", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message ?? "Could not load roles.");
        if (cancelled) return;
        setRoles(payload.roles);
        if (payload.roles.length && !payload.roles.some((role: RoleSummary) => role.id === selected)) {
          setSelected(payload.roles[0].id);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load roles.");
      }
    }
    void loadRoles();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    let cancelled = false;
    async function loadCoverage() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/roles/${selected}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message ?? "Could not load coverage.");
        if (!cancelled) setCoverage(payload);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load coverage.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadCoverage();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const role = coverage?.role as RoleProfile | undefined;

  return (
    <div className="space-y-8">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative overflow-hidden border-y border-border py-10"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <p className="label">Role coverage</p>
            <h2 className="display mt-3 text-[clamp(2.2rem,5vw,3.6rem)]">
              Map your evidence to a role.
            </h2>
            <p className="mt-4 max-w-[58ch] text-[0.9375rem] leading-relaxed text-muted">
              A role profile lists the capabilities it typically requires. RepuH checks each one against
              your attributable evidence and reports which are established, provisional or still missing.
              It is a gap list, not a score.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelected(role.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    selected === role.id
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-muted hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <Briefcase size={12} />
                  {role.name}
                </button>
              ))}
            </div>
          </div>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="border border-border p-5"
          >
            <p className="label">Coverage</p>
            {coverage ? (
              <>
                <p className="num mt-3 text-5xl">
                  {coverage.coreCovered}
                  <span className="text-2xl text-muted">/{coverage.coreTotal}</span>
                </p>
                <p className="mt-1 text-xs text-muted">core capabilities with evidence</p>
                <div className="mt-5 h-2 overflow-hidden bg-surface-muted">
                  <motion.div
                    initial={reduceMotion ? false : { width: 0 }}
                    animate={
                      reduceMotion
                        ? undefined
                        : { width: `${(coverage.coreCovered / Math.max(1, coverage.coreTotal)) * 100}%` }
                    }
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full bg-primary"
                  />
                </div>
                <p className="mt-4 text-xs text-muted">
                  Supporting: {coverage.supportingCovered}/{coverage.supportingTotal}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {coverage.gaps.length === 0
                    ? "No gaps against this role's required capabilities."
                    : `${coverage.gaps.length} gap${coverage.gaps.length === 1 ? "" : "s"} to close.`}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">Loading…</p>
            )}
          </motion.div>
        </div>
      </motion.section>

      {error ? (
        <p className="border-l-2 border-danger pl-3 text-sm text-danger">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading coverage…</p>
      ) : coverage ? (
        <>
          <section>
            <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
              <div>
                <p className="label">Required capabilities</p>
                <h2 className="mt-1 text-[1.125rem] font-medium">{role?.name}</h2>
              </div>
              <Badge tone="neutral">{coverage.version}</Badge>
            </div>
            <motion.ul
              variants={reduceMotion ? undefined : container}
              initial={reduceMotion ? false : "hidden"}
              animate={reduceMotion ? undefined : "show"}
              className="mt-4 grid gap-3 md:grid-cols-2"
            >
              {coverage.items.map((capability) => {
                const covered = capability.estimate !== null && capability.status !== "insufficient";
                return (
                  <motion.li
                    key={capability.skillId}
                    variants={reduceMotion ? undefined : item}
                    className="flex items-start gap-3 border border-border p-4"
                  >
                    {covered ? (
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
                    ) : (
                      <Circle size={18} className="mt-0.5 shrink-0 text-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[0.8125rem] font-medium">{capability.skillName}</p>
                        <Badge tone={capability.importance === "core" ? "primary" : "neutral"}>
                          {capability.importance}
                        </Badge>
                        {covered ? (
                          <Badge tone={capability.status === "established" ? "success" : "warning"}>
                            {capability.status}
                          </Badge>
                        ) : (
                          <Badge tone="neutral">missing</Badge>
                        )}
                      </div>
                      {covered ? (
                        <p className="num mt-1 text-[0.75rem] text-muted">
                          estimate {capability.estimate} · {Math.round(capability.confidence * 100)}% confidence ·{" "}
                          {capability.evidenceCount} items
                        </p>
                      ) : (
                        <p className="mt-1 text-[0.75rem] text-muted">
                          No attributable evidence yet for this capability.
                        </p>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </motion.ul>
          </section>

          {coverage.gaps.length > 0 ? (
            <section className="border-t border-border pt-6">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-primary" />
                <h2 className="text-[0.9375rem] font-medium">Gaps to close</h2>
              </div>
              <p className="mt-1 text-xs text-muted">
                These capabilities have no established or provisional estimate. Add attributable evidence
                through an integration or the development adapter; estimates cannot be entered by hand.
              </p>
              <ul className="mt-3 space-y-2">
                {coverage.gaps.map((gap) => (
                  <li key={gap.skillId} className="flex items-center justify-between border-b border-border py-2 text-[0.8125rem]">
                    <span>{gap.skillName}</span>
                    <Badge tone="neutral">{gap.importance}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="border-t border-border pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              <h2 className="text-[0.9375rem] font-medium">How this is computed</h2>
            </div>
            <p className="mt-2 max-w-[62ch] text-[0.8125rem] leading-relaxed text-muted">
              Role profiles are illustrative and versioned ({coverage.version}). Each requirement is
              checked against the same deterministic fingerprint used elsewhere in RepuH, so a role
              view and a capability view cannot disagree. Missing evidence is reported as missing; no
              estimate is invented to fill a gap.
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}
