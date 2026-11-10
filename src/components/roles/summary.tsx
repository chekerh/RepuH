"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Target } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

import { Badge } from "@/components/ui";
import type { RoleCoverage } from "@/lib/roles";

interface RoleSummaryLocal {
  id: string;
  name: string;
}

export function RoleCoverageSummary() {
  const reduceMotion = useReducedMotion();
  const [roles, setRoles] = useState<RoleSummaryLocal[]>([]);
  const [selected, setSelected] = useState("full-stack-engineer");
  const [coverage, setCoverage] = useState<RoleCoverage | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/roles", { cache: "no-store", credentials: "same-origin" });
        const payload = await response.json();
        if (!response.ok || cancelled) return;
        const roleList = Array.isArray(payload.roles) ? payload.roles : [];
        setRoles(roleList.map((role: RoleSummaryLocal) => ({ id: role.id, name: role.name })));
        if (!roleList.some((role: RoleSummaryLocal) => role.id === selected) && roleList.length) {
          setSelected(roleList[0].id);
        }
      } catch {
        // Keep the widget quiet on failure; the dedicated page remains available.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/roles/${selected}`, { credentials: "same-origin" });
        const payload = await response.json();
        if (cancelled || !response.ok) return;
        setCoverage(payload);
      } catch {
        // Ignore; the widget is supplementary.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="border border-border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-primary" />
          <p className="text-[0.8125rem] font-medium">Role coverage</p>
        </div>
        <Link
          href="/roles"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Open full view <ArrowUpRight size={12} />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => setSelected(role.id)}
            className={`rounded-full border px-2.5 py-1 text-[0.6875rem] transition-colors ${
              selected === role.id
                ? "border-primary bg-primary-soft text-primary"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {role.name}
          </button>
        ))}
      </div>

      {coverage ? (
        <>
          <div className="mt-4 flex items-end justify-between gap-4">
            <p className="num text-3xl">
              {coverage.coreCovered}
              <span className="text-lg text-muted">/{coverage.coreTotal}</span>
            </p>
            <p className="text-xs text-muted">
              core capabilities · {coverage.supportingCovered}/{coverage.supportingTotal} supporting
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden bg-surface-muted">
            <motion.div
              initial={reduceMotion ? false : { width: 0 }}
              animate={
                reduceMotion
                  ? undefined
                  : { width: `${(coverage.coreCovered / Math.max(1, coverage.coreTotal)) * 100}%` }
              }
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-primary"
            />
          </div>
          {coverage.gaps.length > 0 ? (
            <p className="mt-3 text-xs text-muted">
              Gaps: {coverage.gaps.slice(0, 4).map((gap) => gap.skillName).join(", ")}
              {coverage.gaps.length > 4 ? ` +${coverage.gaps.length - 4}` : ""}
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted">No gaps against this role&apos;s required capabilities.</p>
          )}
        </>
      ) : (
        <p className="mt-4 text-xs text-muted">Loading coverage…</p>
      )}
    </motion.section>
  );
}
