"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/* A WebGL2 fullscreen-shader canvas, filled from phosphor-30.

   Compiled from the canonical fragment source below. Unlike a library canvas
   this renders in the host document (no iframe), so it composes with the
   aside a login/register page owns: the host element supplies the size.
   Compile/link failures paint a deliberate dark field instead of broken
   output; the message is developer-visible only (no user-facing copy). */

const SHADER_SRC = `#version 300 es
precision highp float;

out vec4 fragColor;
in vec2 v_uv;

uniform vec3  iResolution;   // (width, height, dpr)
uniform float iTime;         // seconds
uniform int   iFrame;        // frame counter
uniform vec4  iMouse;        // (x, y, L, R)

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2  r  = iResolution.xy;
    float t  = iTime;
    vec3  FC = vec3(fragCoord, t);
    vec4  o  = vec4(0.0);

    float s = 0.0;
    for (float i = 0.0, z = 0.0, d = 0.0; i++ < 8e1; o += (cos(s + vec4(0.0, 1.0, 8.0, 0.0)) + 1.0) / d)
    {
        vec3 p = z * normalize(FC.rgb * 2.0 - r.xyy);
        vec3 a = normalize(cos(vec3(5.0, 0.0, 1.0) + t - d * 4.0));
        p.z += 5.0;
        a = a * dot(a, p) - cross(a, p);
        for (d = 1.0; d++ < 9.0; )
            a -= sin(a * d + t).zxy / d;
        z += d = 0.1 * abs(length(p) - 3.0) + 0.07 * abs(cos(s = a.y));
    }
    o = tanh(o / 5e3);
    fragColor = vec4(o.rgb, 1.0);
}

void main()
{
    mainImage(fragColor, gl_FragCoord.xy);
}
`;

const VERT_SRC = `#version 300 es
precision highp float;

layout(location=0) in vec2 a_pos;
out vec2 v_uv;

void main()
{
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

function safeCompile(
  gl: WebGL2RenderingContext,
  type: number,
  src: string,
): { shader: WebGLShader | null; log: string } {
  const sh = gl.createShader(type);
  if (!sh) return { shader: null, log: "createShader returned null" };
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  const ok = gl.getShaderParameter(sh, gl.COMPILE_STATUS);
  const log = gl.getShaderInfoLog(sh) || "";
  return { shader: ok ? sh : null, log };
}

function safeLink(
  gl: WebGL2RenderingContext,
  vs: WebGLShader,
  fs: WebGLShader,
): { program: WebGLProgram | null; log: string } {
  const prog = gl.createProgram();
  if (!prog) return { program: null, log: "createProgram returned null" };
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  const ok = gl.getProgramParameter(prog, gl.LINK_STATUS);
  const log = gl.getProgramInfoLog(prog) || "";
  return { program: ok ? prog : null, log };
}

// Failure paint: a deliberate dark field, developer-visible message only.
function drawError(gl: WebGL2RenderingContext, msg: string) {
  console.error(`phosphor-30 canvas error: ${msg}`);
  void gl;
}

export type PhosphorShaderProps = {
  className?: string;
  style?: CSSProperties;
  pixelRatio?: number;
};

export function PhosphorShader({ className, style, pixelRatio }: PhosphorShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, l: 0, r: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: false });
    if (!gl) return undefined; // WebGL2 unavailable: the wrapper keeps its background.

    // Hoisted function declarations would lose the narrowed canvas here, so
    // the runtime helpers are arrow consts in dependency order; every
    // reference only ever executes after the whole effect body has run.
    let disposed = false;
    let vao: WebGLVertexArrayObject | null = null;
    let vbo: WebGLBuffer | null = null;
    let program: WebGLProgram | null = null;
    let ro: ResizeObserver | null = null;
    let resizeScheduled = false;
    let mouseBound = false;
    let ctxBound = false;

    const getDpr = () => Math.max(1, Math.min(2, pixelRatio ?? (window.devicePixelRatio || 1)));

    const applySize = () => {
      resizeScheduled = false;
      if (disposed || !gl) return;
      const dpr = getDpr();
      const cssW = Math.max(1, canvas.clientWidth | 0);
      const cssH = Math.max(1, canvas.clientHeight | 0);
      const w = Math.max(1, Math.floor(cssW * dpr));
      const h = Math.max(1, Math.floor(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const scheduleSize = () => {
      if (resizeScheduled) return;
      resizeScheduled = true;
      requestAnimationFrame(applySize);
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseRef.current.x = Math.max(0, Math.min(x, rect.width));
      mouseRef.current.y = Math.max(0, Math.min(rect.height - y, rect.height));
    };
    const onDown = (e: MouseEvent) => {
      if (e.button === 0) mouseRef.current.l = 1;
      if (e.button === 2) mouseRef.current.r = 1;
    };
    const onUp = (e: MouseEvent) => {
      if (e.button === 0) mouseRef.current.l = 0;
      if (e.button === 2) mouseRef.current.r = 0;
    };
    const onCtxMenu = (e: Event) => e.preventDefault();

    // Motion collapses under prefers-reduced-motion: one still frame, no loop.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = (now: number) => {
      if (disposed) return;
      if (gl.isContextLost()) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      try {
        if (resizeScheduled) applySize();
        if (!program) return;

        const t = (now - startRef.current) / 1000;
        frameRef.current += 1;

        gl.useProgram(program);

        const dpr = getDpr();
        const w = canvas.width;
        const h = canvas.height;

        if (uResolution) gl.uniform3f(uResolution, w, h, dpr);
        if (uTime) gl.uniform1f(uTime, t);
        if (uFrame) gl.uniform1i(uFrame, frameRef.current);
        if (uMouse) {
          const m = mouseRef.current;
          gl.uniform4f(uMouse, m.x * dpr, m.y * dpr, m.l, m.r);
        }

        gl.bindVertexArray(vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } catch (err) {
        drawError(gl, (err as Error)?.message ?? String(err));
      }
      if (!reduce) rafRef.current = requestAnimationFrame(tick);
    };

    const onContextLost = (ev: Event) => {
      ev.preventDefault();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    const onContextRestored = () => {
      scheduleSize();
      startRef.current = performance.now();
      frameRef.current = 0;
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(tick);
    };

    const cleanup = () => {
      disposed = true;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (mouseBound) {
        canvas.removeEventListener("mousemove", onMove);
        canvas.removeEventListener("mousedown", onDown);
        canvas.removeEventListener("mouseup", onUp);
        canvas.removeEventListener("contextmenu", onCtxMenu);
        mouseBound = false;
      }
      if (ctxBound) {
        canvas.removeEventListener("webglcontextlost", onContextLost);
        canvas.removeEventListener("webglcontextrestored", onContextRestored);
        ctxBound = false;
      }
      if (ro) {
        try {
          ro.disconnect();
        } catch {
          /* observer already detached */
        }
        ro = null;
      }
      if (vbo) {
        try {
          gl.deleteBuffer(vbo);
        } catch {
          /* already released */
        }
        vbo = null;
      }
      if (vao) {
        try {
          gl.deleteVertexArray(vao);
        } catch {
          /* already released */
        }
        vao = null;
      }
      if (program) {
        try {
          gl.deleteProgram(program);
        } catch {
          /* already released */
        }
        program = null;
      }
    };

    // ---------- geometry: one fullscreen triangle ----------
    vao = gl.createVertexArray();
    vbo = gl.createBuffer();
    if (!vao || !vbo) {
      drawError(gl, "Failed to create VAO/VBO");
      return cleanup;
    }
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // ---------- shaders ----------
    const vsResult = safeCompile(gl, gl.VERTEX_SHADER, VERT_SRC);
    if (!vsResult.shader) {
      drawError(gl, `Vertex compile error:\n${vsResult.log}`);
      return cleanup;
    }
    const vs = vsResult.shader;
    const fsResult = safeCompile(gl, gl.FRAGMENT_SHADER, SHADER_SRC);
    if (!fsResult.shader) {
      drawError(gl, `Fragment compile error:\n${fsResult.log}`);
      gl.deleteShader(vs);
      return cleanup;
    }
    const fs = fsResult.shader;
    const linked = safeLink(gl, vs, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!linked.program) {
      drawError(gl, `Program link error:\n${linked.log}`);
      return cleanup;
    }
    program = linked.program;

    const uResolution = gl.getUniformLocation(program, "iResolution");
    const uTime = gl.getUniformLocation(program, "iTime");
    const uFrame = gl.getUniformLocation(program, "iFrame");
    const uMouse = gl.getUniformLocation(program, "iMouse");

    // ---------- resize ----------
    ro = new ResizeObserver(scheduleSize);
    ro.observe(canvas);
    scheduleSize();

    // ---------- events ----------
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("contextmenu", onCtxMenu);
    mouseBound = true;

    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    ctxBound = true;

    // ---------- animation ----------
    startRef.current = performance.now();
    frameRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);

    return cleanup;
  }, [pixelRatio]);

  return (
    <div
      className={className}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, background: "#0b1220", overflow: "hidden", ...style }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
