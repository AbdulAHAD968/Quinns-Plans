"use client";

import { useEffect, useRef } from "react";

export function CandleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const contextAttrs = { antialias: false, preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: false };
    const gl =
      canvas.getContext("webgl", contextAttrs) ||
      canvas.getContext("experimental-webgl", contextAttrs) ||
      canvas.getContext("webgl", { antialias: false }) ||
      canvas.getContext("experimental-webgl", { antialias: false });
    if (!gl) {
      console.warn("WebGL unavailable - candle not rendered.");
      return;
    }

    const fsSource = `
precision highp float;

uniform float uTime;
uniform vec2  uRes;

#define BLUE_ZONE 1.0

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),                 hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + 13.7;
    a *= 0.5;
  }
  return v;
}

vec3 ramp(float t) {
  vec3 red    = vec3(1.000, 0.145, 0.075);
  vec3 orange = vec3(0.960, 0.376, 0.082);
  vec3 yellow = vec3(0.996, 0.714, 0.271);
  vec3 white  = vec3(1.000, 0.980, 0.920);
  vec3 c = mix(red, orange, smoothstep(0.05, 0.35, t));
  c = mix(c, yellow, smoothstep(0.30, 0.65, t));
  c = mix(c, white,  smoothstep(0.62, 0.95, t));
  return c;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 uv = gl_FragCoord.xy / uRes;
  float x = (uv.x - 0.5) * aspect;
  float y = uv.y - 0.30;

  float flick = 0.82 + 0.36 * fbm(vec2(uTime * 2.7, 11.1));

  float FLAME_H = 0.55;
  float fy = y / FLAME_H;

  float lean = (fbm(vec2(uTime * 0.9, 3.7)) - 0.5) * 0.22 * fy * fy;
  float fx = x - lean;

  fx += (noise(vec2(x * 9.0, y * 7.0 - uTime * 2.2)) - 0.5) * 0.05 * fy;

  float w = 0.24 * pow(max(fy, 0.0) + 0.03, 0.4) * pow(max(1.0 - fy, 0.0), 1.15);
  float d = abs(fx) / max(w, 1e-4);

  float inFlame = step(0.0, fy) * (1.0 - step(1.0, fy));
  float body = (1.0 - smoothstep(0.55, 1.0, d))
             * smoothstep(0.0, 0.06, fy)
             * (1.0 - smoothstep(0.90, 1.0, fy))
             * inFlame;

  float hcurve = smoothstep(0.02, 0.16, fy) * (1.0 - smoothstep(0.40, 0.95, fy));
  float heat = pow(max(1.0 - d, 0.0), 1.6) * (0.35 + 0.65 * hcurve);

  vec3 col = vec3(0.0);

  float gd = length(vec2(x, (y - 0.16) * 0.85));
  col += vec3(1.00, 0.25, 0.10) * exp(-gd * 4.5) * 0.22 * flick;
  col += vec3(1.00, 0.50, 0.15) * exp(-gd * 9.0) * 0.18 * flick;

  col += ramp(heat) * body * flick;

  float bb = smoothstep(0.14, 0.02, fy) * smoothstep(1.25, 0.40, d) * inFlame;
  col += vec3(0.25, 0.45, 1.00) * bb * 0.35 * BLUE_ZONE * flick;

  float wick = (1.0 - smoothstep(0.006, 0.013, abs(x)))
             * smoothstep(0.05, 0.0, y) * step(-0.055, y);
  col *= 1.0 - wick * 0.85;

  float cap = 1.0 - smoothstep(0.82, 1.0,
      length(vec2(x / 0.055, (y + 0.045) / 0.075)));
  col *= 1.0 - cap * 0.92;

  col = col / (col + 0.9);
  col = pow(col, vec3(0.92));

  gl_FragColor = vec4(col, 1.0);
}
    `;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const vs = compile(
      gl.VERTEX_SHADER,
      "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }"
    );
    const fs = compile(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "uTime");
    const uRes = gl.getUniformLocation(prog, "uRes");

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(canvas.offsetWidth * dpr);
      canvas.height = Math.floor(canvas.offsetHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener("resize", resize);
    resize();

    const T0 = performance.now();
    function now() {
      return (performance.now() - T0) / 1000;
    }

    const STILL_TIME = 4.6;
    let mq = null;
    if (typeof window !== "undefined" && window.matchMedia) {
      mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    }

    function draw(t) {
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    let rafId = null;
    function loop() {
      draw(now());
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (mq && mq.matches) {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        draw(STILL_TIME);
      } else if (!rafId) {
        loop();
      }
    }

    if (mq) {
      if (mq.addEventListener) mq.addEventListener("change", start);
      else if (mq.addListener) mq.addListener(start);
    }

    start();

    return () => {
      window.removeEventListener("resize", resize);
      if (rafId) cancelAnimationFrame(rafId);
      if (mq) {
        if (mq.removeEventListener) mq.removeEventListener("change", start);
        else if (mq.removeListener) mq.removeListener(start);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 0,
        background: "transparent",
      }}
    />
  );
}
