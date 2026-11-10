"use client";

import { groupColor, type LatticeNode } from "@/components/lattice";

export function CapabilityMark({ nodes }: { nodes: LatticeNode[] }) {
  const size = 320;
  const center = size / 2;
  const radius = size * 0.34;
  const count = Math.max(nodes.length, 1);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-full w-full"
      role="img"
      aria-label="Capability map"
    >
      <circle cx={center} cy={center} r={radius + 24} fill="none" stroke="rgba(127,144,168,0.18)" strokeWidth="1" />
      <circle cx={center} cy={center} r={radius - 24} fill="none" stroke="rgba(127,144,168,0.12)" strokeWidth="1" />
      {nodes.map((node, index) => {
        const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
        const x = Number((center + Math.cos(angle) * radius).toFixed(2));
        const y = Number((center + Math.sin(angle) * radius).toFixed(2));
        const r = Number((4 + node.weight * 8).toFixed(2));
        return (
          <g key={node.id}>
            <circle cx={x} cy={y} r={r * 2.2} fill={groupColor(node.group)} opacity={0.12} />
            <circle cx={x} cy={y} r={r} fill={groupColor(node.group)} opacity={0.55 + node.confidence * 0.4} />
          </g>
        );
      })}
      <circle cx={center} cy={center} r="6" fill="rgba(127,144,168,0.5)" />
    </svg>
  );
}
