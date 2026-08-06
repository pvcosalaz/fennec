"use client";
/* WebThreads — glowing sine threads converging on a light point.
   Adapted from React Bits (MIT, https://reactbits.dev) for Fennec:

   1. Ported to TypeScript.
   2. Props are read from a ref inside the render loop instead of being synced
      by a second effect, so changing them never rebuilds the WebGL context.
   3. Added `levelRef` — a live 0..1 audio level the loop reads every frame.
      It rides on a ref, NOT a prop: driving this from React state would mean
      60 re-renders a second. Same reason the VU needles and the tape glow
      write straight to the DOM (see TapeDeckDesktop).

   The shader itself is unchanged. It already pauses when offscreen or when
   the tab is hidden, and releases its GL context on unmount. */
import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [1, 1, 1];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
};

const FAN_MODE = { center: 0, left: 1, right: 2 } as const;

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uThreadCount;
uniform float uFrequency;
uniform float uSpread;
uniform float uTaper;
uniform float uPosition;
uniform float uFanMode;
uniform float uGlow;
uniform float uFalloff;
uniform float uThickness;
uniform float uBrightness;
uniform float uOpacity;
uniform float uMirror;
uniform float uShimmer;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uEnableMouse;
uniform float uMouseActive;
out vec4 fragColor;

#define TAU 6.28318530718
#define MAX_THREADS 10

float glow(float x, float str, float dist) {
  return dist / pow(max(x, 1e-4), str);
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float n = max(uThreadCount, 1.0);

  float pinchX = uFanMode < 0.5 ? 0.5 : (uFanMode < 1.5 ? 0.0 : 1.0);
  if (uEnableMouse > 0.5) {
    pinchX = mix(pinchX, uMouse.x, clamp(uMouseStrength, 0.0, 1.0) * uMouseActive);
  }

  float spreadDx = uSpread * abs(uv.x - pinchX);
  float baseT = iTime * uSpeed;
  float tauOverN = TAU / n;
  float mirror = uMirror > 0.5 ? sign(pinchX - uv.x) : 1.0;
  bool doShimmer = uShimmer > 0.5;
  float shimmerT = iTime * 1.7;
  float invThickness = 1.0 / max(uThickness, 0.01);
  float xFreq = uv.x * uFrequency;
  float yOff = uv.y - uPosition;
  float ciScale = n > 1.0 ? 1.0 / (n - 1.0) : 0.0;

  vec3 col = vec3(0.0);
  float gsum = 0.0;

  for (int idx = 0; idx < MAX_THREADS; idx++) {
    float i = float(idx);
    if (i >= n) break;

    float amplitude = spreadDx * (1.0 + i * uTaper);
    float shimmer = doShimmer ? sin(shimmerT + i * 1.3) * 0.35 : 0.0;
    float phase = (baseT + i * tauOverN) * mirror + shimmer;

    float sdf = abs(yOff + sin(xFreq + phase) * amplitude) * invThickness;

    float g = glow(sdf, uFalloff, uGlow);
    float ci = i * ciScale;
    vec3 threadCol = mix(uColor1, uColor2, ci);

    col += g * threadCol;
    gsum += g;
  }

  float coreAmt = smoothstep(0.5, 2.2, gsum);
  col = mix(col, uColor3 * gsum, coreAmt * 0.5);

  float bright = uBrightness;
  if (uEnableMouse > 0.5) {
    vec2 md = uv - uMouse;
    float d2 = dot(md, md);
    bright += clamp(uMouseStrength, 0.0, 1.0) * uMouseActive * exp(-d2 * 6.0) * 0.6;
  }
  col *= bright;

  float alpha = clamp(gsum, 0.0, 1.0) * uOpacity;

  vec3 outRgb = col * alpha;

  if (uGrain > 0.5) {
    float gv = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453) - 0.5) * uGrainIntensity;
    outRgb = clamp(outRgb + gv, 0.0, 1.0);
    alpha = clamp(alpha + gv, 0.0, 1.0);
  }

  fragColor = vec4(outRgb, alpha);
}
`;

export type WebThreadsProps = {
  color1?: string; color2?: string; color3?: string;
  speed?: number; threadCount?: number; frequency?: number;
  spread?: number; taper?: number; position?: number;
  fanMode?: keyof typeof FAN_MODE;
  glow?: number; falloff?: number; thickness?: number;
  brightness?: number; opacity?: number;
  mirror?: boolean; shimmer?: boolean;
  grain?: boolean; grainIntensity?: number;
  mouseInteraction?: boolean; mouseStrength?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Live 0..1 audio level. Read every frame from the ref; never a prop. */
  levelRef?: { current: number };
  /** How hard the level pushes spread/brightness/glow. 0 disables it. */
  reactivity?: number;
};

export default function WebThreads({
  color1 = "#5227FF", color2 = "#FF9FFC", color3 = "#FFFFFF",
  speed = 0.2, threadCount = 6, frequency = 5.0,
  spread = 0.18, taper = 1.0, position = 0.5,
  fanMode = "center",
  glow = 0.02, falloff = 0.6, thickness = 1.1,
  brightness = 0.6, opacity = 1.0,
  mirror = true, shimmer = false,
  grain = true, grainIntensity = 0.05,
  mouseInteraction = true, mouseStrength = 0.3,
  className = "", style,
  levelRef, reactivity = 0,
}: WebThreadsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Every prop lands here on each render; the loop reads this and nothing else.
  // That keeps prop changes free: no effect re-runs, no context rebuild.
  const props = useRef({
    color1, color2, color3, speed, threadCount, frequency, spread, taper,
    position, fanMode, glow, falloff, thickness, brightness, opacity,
    mirror, shimmer, grain, grainIntensity, mouseInteraction, mouseStrength,
    reactivity,
  });
  props.current = {
    color1, color2, color3, speed, threadCount, frequency, spread, taper,
    position, fanMode, glow, falloff, thickness, brightness, opacity,
    mirror, shimmer, grain, grainIntensity, mouseInteraction, mouseStrength,
    reactivity,
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({
      webgl: 2, alpha: true, premultipliedAlpha: true, antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const program = new Program(gl, {
      vertex, fragment,
      uniforms: {
        iTime: { value: 0 }, iResolution: { value: new Float32Array([1, 1]) },
        uSpeed: { value: 0.2 }, uThreadCount: { value: 6 }, uFrequency: { value: 5 },
        uSpread: { value: 0.18 }, uTaper: { value: 1 }, uPosition: { value: 0.5 },
        uFanMode: { value: 0 }, uGlow: { value: 0.02 }, uFalloff: { value: 0.6 },
        uThickness: { value: 1.1 }, uBrightness: { value: 0.6 }, uOpacity: { value: 1 },
        uMirror: { value: 1 }, uShimmer: { value: 0 },
        uGrain: { value: 1 }, uGrainIntensity: { value: 0.05 },
        uColor1: { value: new Float32Array([1, 1, 1]) },
        uColor2: { value: new Float32Array([1, 1, 1]) },
        uColor3: { value: new Float32Array([1, 1, 1]) },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uMouseStrength: { value: 0.3 }, uEnableMouse: { value: 1 }, uMouseActive: { value: 0 },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const setSize = () => {
      const r = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, Math.floor(r.width)), Math.max(1, Math.floor(r.height)));
      const res = program.uniforms.iResolution.value as Float32Array;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      renderer.render({ scene: mesh });
    };
    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    setSize();

    const curMouse = [0.5, 0.5];
    const tgtMouse = [0.5, 0.5];
    let curActive = 0, tgtActive = 0;
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      tgtMouse[0] = (e.clientX - r.left) / r.width;
      tgtMouse[1] = 1 - (e.clientY - r.top) / r.height;
      tgtActive = 1;
    };
    const onEnter = () => { tgtActive = 1; };
    const onLeave = () => { tgtActive = 0; };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseenter", onEnter);
    canvas.addEventListener("mouseleave", onLeave);

    // Honour the OS setting: hold a still frame rather than animating.
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let visible = true;
    let pageVisible = !document.hidden;
    const t0 = performance.now();
    // Audio is smoothed here, not by the caller: fast attack so a hit lands,
    // slow release so it settles instead of flickering. Same asymmetry as the
    // VU needles, which felt right after symmetric smoothing read as floaty.
    let nivel = 0;

    const loop = (t: number) => {
      const p = props.current;
      const u = program.uniforms;

      const objetivo = Math.min(1, Math.max(0, levelRef?.current ?? 0));
      nivel += (objetivo - nivel) * (objetivo > nivel ? 0.3 : 0.05);
      const empuje = nivel * p.reactivity;

      u.iTime.value = quieto ? 0 : (t - t0) * 0.001;
      u.uSpeed.value = p.speed;
      u.uThreadCount.value = Math.round(p.threadCount);
      u.uFrequency.value = p.frequency;
      // The level opens the fan, lifts the glow and brightens the core.
      u.uSpread.value = p.spread * (1 + empuje * 1.2);
      u.uGlow.value = p.glow * (1 + empuje * 2.4);
      u.uBrightness.value = p.brightness * (1 + empuje * 0.85);
      u.uTaper.value = p.taper;
      u.uPosition.value = p.position;
      u.uFanMode.value = FAN_MODE[p.fanMode] ?? 0;
      u.uFalloff.value = p.falloff;
      u.uThickness.value = p.thickness;
      u.uOpacity.value = p.opacity;
      u.uMirror.value = p.mirror ? 1 : 0;
      u.uShimmer.value = p.shimmer ? 1 : 0;
      u.uGrain.value = p.grain ? 1 : 0;
      u.uGrainIntensity.value = p.grainIntensity;
      (u.uColor1.value as Float32Array).set(hexToRgb(p.color1));
      (u.uColor2.value as Float32Array).set(hexToRgb(p.color2));
      (u.uColor3.value as Float32Array).set(hexToRgb(p.color3));

      curMouse[0] += 0.05 * (tgtMouse[0] - curMouse[0]);
      curMouse[1] += 0.05 * (tgtMouse[1] - curMouse[1]);
      curActive += 0.05 * (tgtActive - curActive);
      (u.uMouse.value as Float32Array)[0] = curMouse[0];
      (u.uMouse.value as Float32Array)[1] = curMouse[1];
      u.uMouseActive.value = curActive;
      u.uEnableMouse.value = p.mouseInteraction ? 1 : 0;
      u.uMouseStrength.value = p.mouseStrength;

      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };

    const arrancar = () => { if (visible && pageVisible && raf === 0) raf = requestAnimationFrame(loop); };
    const parar = () => { if (raf !== 0) { cancelAnimationFrame(raf); raf = 0; } };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      visible ? arrancar() : parar();
    }, { threshold: 0 });
    io.observe(container);

    const onVis = () => { pageVisible = !document.hidden; pageVisible ? arrancar() : parar(); };
    document.addEventListener("visibilitychange", onVis);
    arrancar();

    return () => {
      parar();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseenter", onEnter);
      canvas.removeEventListener("mouseleave", onLeave);
      try { container.removeChild(canvas); } catch { /* already gone */ }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // Mount once. Props reach the loop through the ref above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", ...style }}
    />
  );
}
