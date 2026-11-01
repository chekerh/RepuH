"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

export interface LatticeNode {
  id: string;
  label: string;
  group: string;
  /** 0–1, drives node size. */
  weight: number;
  /** 0–1, drives opacity. */
  confidence: number;
  score: number | null;
}

const GROUP_COLORS: Record<string, string> = {
  programming: "#7C9DFF",
  backend: "#3FD3B1",
  frontend: "#FFB877",
  architecture: "#C6A4FF",
  devops: "#6FCBEA",
  collaboration: "#F2909E",
  other: "#8FA1B8",
};

export function groupColor(group: string) {
  return GROUP_COLORS[group] ?? GROUP_COLORS.other!;
}

/* ---------------------------------------------------------------- geometry */

function fibonacciSphere(count: number, radius: number) {
  const points: THREE.Vector3[] = [];
  const offset = 2 / count;
  const increment = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < count; index += 1) {
    const y = index * offset - 1 + offset / 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = index * increment;
    points.push(new THREE.Vector3(Math.cos(phi) * r * radius, y * radius, Math.sin(phi) * r * radius));
  }
  return points;
}

function buildPositions(count: number) {
  return fibonacciSphere(count, 1);
}

function nearestPairs(points: THREE.Vector3[], neighbours = 3) {
  const pairs = new Set<string>();
  const lines: Array<[THREE.Vector3, THREE.Vector3]> = [];
  points.forEach((point, index) => {
    const distances = points
      .map((other, otherIndex) => ({
        index: otherIndex,
        distance: point.distanceTo(other),
      }))
      .filter((entry) => entry.index !== index)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, neighbours);

    for (const entry of distances) {
      const key = index < entry.index ? `${index}:${entry.index}` : `${entry.index}:${index}`;
      if (pairs.has(key)) continue;
      pairs.add(key);
      lines.push([point, points[entry.index]!]);
    }
  });
  return lines;
}

/* ------------------------------------------------------------------- scene */

interface SceneProps {
  nodes: LatticeNode[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  reducedMotion: boolean;
  interactive: boolean;
}

function Scene({ nodes, selectedId, onSelect, reducedMotion, interactive }: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const drag = useRef({ active: false, x: 0, y: 0, moved: 0 });
  const target = useRef({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<string | null>(null);

  const positions = useMemo(() => buildPositions(Math.max(nodes.length, 1)), [nodes.length]);
  const lines = useMemo(() => nearestPairs(positions, 3), [positions]);

  const lineGeometry = useMemo(() => {
    const vertices: number[] = [];
    for (const [from, to] of lines) {
      vertices.push(from.x, from.y, from.z, to.x, to.y, to.z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }, [lines]);

  const mesh = useMemo(() => {
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.96,
      toneMapped: false,
    });
    const instanced = new THREE.InstancedMesh(geometry, material, Math.max(nodes.length, 1));
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const haloGeometry = new THREE.IcosahedronGeometry(1, 1);
    const haloMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const halo = new THREE.InstancedMesh(haloGeometry, haloMaterial, Math.max(nodes.length, 1));

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();

    nodes.forEach((node, index) => {
      const position = positions[index] ?? new THREE.Vector3();
      const size = 0.032 + node.weight * 0.055;
      matrix.makeTranslation(position.x, position.y, position.z);
      matrix.scale(new THREE.Vector3(size, size, size));
      instanced.setMatrixAt(index, matrix);

      const haloSize = size * 3.4;
      matrix.makeTranslation(position.x, position.y, position.z);
      matrix.scale(new THREE.Vector3(haloSize, haloSize, haloSize));
      halo.setMatrixAt(index, matrix);

      color.set(groupColor(node.group)).multiplyScalar(0.55 + node.confidence * 0.65);
      instanced.setColorAt(index, color);
      halo.setColorAt(index, color);
    });

    instanced.instanceMatrix.needsUpdate = true;
    halo.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    if (halo.instanceColor) halo.instanceColor.needsUpdate = true;

    return { instanced, halo };
  }, [nodes, positions]);

  useEffect(() => {
    return () => {
      lineGeometry.dispose();
      mesh.instanced.geometry.dispose();
      (mesh.instanced.material as THREE.Material).dispose();
      mesh.halo.geometry.dispose();
      (mesh.halo.material as THREE.Material).dispose();
    };
  }, [lineGeometry, mesh]);

  useFrame((_, delta) => {
    if (!group.current) return;
    if (!reducedMotion) {
      target.current.y += delta * 0.12;
    }
    const g = group.current;
    g.rotation.y += (target.current.y - g.rotation.y) * Math.min(1, delta * 6);
    g.rotation.x += (target.current.x - g.rotation.x) * Math.min(1, delta * 6);

    const scale = 1 + Math.sin(performance.now() / 2600) * 0.012;
    g.scale.setScalar(reducedMotion ? 1 : scale);
  });

  const selectedIndex = nodes.findIndex((node) => node.id === selectedId);
  const selectedPosition = selectedIndex >= 0 ? positions[selectedIndex] : null;

  return (
    <group
      ref={group}
      onPointerDown={(event) => {
        if (!interactive) return;
        drag.current = { active: true, x: event.clientX, y: event.clientY, moved: 0 };
      }}
      onPointerMove={(event) => {
        if (!interactive || !drag.current.active) return;
        const dx = event.clientX - drag.current.x;
        const dy = event.clientY - drag.current.y;
        drag.current.moved += Math.abs(dx) + Math.abs(dy);
        drag.current.x = event.clientX;
        drag.current.y = event.clientY;
        target.current.y += dx * 0.008;
        target.current.x = THREE.MathUtils.clamp(target.current.x + dy * 0.006, -0.7, 0.7);
      }}
      onPointerUp={() => {
        drag.current.active = false;
      }}
      onPointerLeave={() => {
        drag.current.active = false;
      }}
    >
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#7E90A8" transparent opacity={0.22} depthWrite={false} />
      </lineSegments>

      <primitive
        object={mesh.halo}
        onPointerOver={() => undefined}
        onPointerMove={(event: { instanceId?: number; stopPropagation: () => void }) => {
          if (!interactive) return;
          event.stopPropagation();
          const id = event.instanceId !== undefined ? nodes[event.instanceId]?.id : undefined;
          setHovered(id ?? null);
          document.body.style.cursor = id ? "pointer" : "auto";
        }}
        onPointerOut={() => {
          setHovered(null);
          document.body.style.cursor = "auto";
        }}
        onClick={(event: { instanceId?: number; stopPropagation: () => void }) => {
          if (!interactive || drag.current.moved > 8) return;
          event.stopPropagation();
          const id = event.instanceId !== undefined ? nodes[event.instanceId]?.id : undefined;
          if (id) onSelect?.(id);
        }}
      />
      <primitive object={mesh.instanced} raycast={() => null} />

      {selectedPosition ? (
        <group position={selectedPosition}>
          <mesh>
            <torusGeometry args={[0.115, 0.0035, 8, 64]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} toneMapped={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.012, 12, 12]} />
            <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
          </mesh>
        </group>
      ) : null}

      <mesh rotation={[Math.PI / 2.35, 0, 0.4]}>
        <torusGeometry args={[1.34, 0.0016, 6, 128]} />
        <meshBasicMaterial color="#8FA1B8" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh rotation={[Math.PI / 1.75, 0.5, 0]}>
        <torusGeometry args={[1.52, 0.0012, 6, 128]} />
        <meshBasicMaterial color="#8FA1B8" transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ canvas */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** A never-changing external store, used only to detect that we are on the client. */
function subscribeNothing() {
  return () => {};
}

export function CapabilityLattice({
  nodes,
  selectedId,
  onSelect,
  className,
  interactive = true,
  caption,
  emptyLabel = "No evidence yet",
}: {
  nodes: LatticeNode[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  interactive?: boolean;
  caption?: string;
  emptyLabel?: string;
}) {
  // Client-only facts are read through useSyncExternalStore rather than an
  // effect that calls setState: the server snapshot stays false, so hydration
  // is consistent and there is no cascading render on mount.
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );

  const displayNodes = nodes.length > 0 ? nodes : placeholderNodes();

  return (
    <div className={cn("relative isolate h-full w-full", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 60% at 50% 42%, rgba(60,110,240,0.18) 0%, rgba(10,16,28,0) 68%)",
        }}
      />
      {mounted ? (
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 3.35], fov: 42 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ touchAction: "none" }}
        >
          <Scene
            nodes={displayNodes}
            selectedId={selectedId}
            onSelect={onSelect}
            reducedMotion={reducedMotion}
            interactive={interactive && nodes.length > 0}
          />
        </Canvas>
      ) : null}

      {nodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 px-1 pb-1">
          <span className="label text-white/50">{emptyLabel}</span>
          <span className="text-xs text-white/40">
            Nodes appear only when attributable evidence exists.
          </span>
        </div>
      ) : null}

      {caption ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-1 pb-1">
          <span className="label text-white/45">{caption}</span>
          <span className="label text-white/35">
            {nodes.length} capabilit{nodes.length === 1 ? "y" : "ies"}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function placeholderNodes(): LatticeNode[] {
  const groups = ["programming", "backend", "frontend", "architecture", "devops", "collaboration"];
  return Array.from({ length: 24 }).map((_, index) => ({
    id: `placeholder-${index}`,
    label: "",
    group: groups[index % groups.length]!,
    weight: 0.12,
    confidence: 0.1,
    score: null,
  }));
}
