"use client";

import { useEffect, useRef } from "react";

type Orb = {
  x: number;
  y: number;
  z: number;
  speed: number;
  waveAmplitude: number;
  waveFrequency: number;
  waveOffset: number;
  size: number;
  colorIndex: number;
};

/** Soft gradient orbs that drift across the hero — adapted from MarineQA. */
export function HeroOrbsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (!gl) return;

    gl.enable(gl.BLEND);
    // Premultiplied alpha blend — keeps orb hues vivid over the page
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);

    function compileShader(
      glContext: WebGLRenderingContext,
      source: string,
      type: number
    ) {
      const shader = glContext.createShader(type);
      if (!shader) return null;
      glContext.shaderSource(shader, source);
      glContext.compileShader(shader);
      if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
        glContext.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexSource = `
      precision mediump float;
      attribute vec3 position;
      uniform mat4 projection;
      uniform mat4 modelView;
      varying vec2 vUV;

      void main() {
        vUV = position.xy;
        gl_Position = projection * modelView * vec4(position, 1.0);
      }
    `;

    const fragmentSource = `
      precision mediump float;
      varying vec2 vUV;
      uniform vec3 orbColor;
      uniform float time;
      uniform float edgeFade;

      void main() {
        float dist = length(vUV);
        float alpha = smoothstep(1.0, 0.65, dist) * 0.85;
        float pulse = sin(time * 2.0) * 0.1 + 0.9;
        alpha *= pulse * edgeFade;
        float radialGradient = clamp(1.0 - (dist * 0.12), 0.88, 1.0);
        vec3 color = orbColor * radialGradient;
        // Premultiply RGB so browser compositing keeps the hue
        gl_FragColor = vec4(color * alpha, alpha);
      }
    `;

    const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const createCircleVertices = (segments = 20) => {
      const vertices: number[] = [];
      for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2;
        const angle2 = ((i + 1) / segments) * Math.PI * 2;
        vertices.push(0, 0, 0);
        vertices.push(Math.cos(angle1), Math.sin(angle1), 0);
        vertices.push(Math.cos(angle2), Math.sin(angle2), 0);
      }
      return new Float32Array(vertices);
    };

    const orbVertices = createCircleVertices(20);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, orbVertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "position");
    const projectionLocation = gl.getUniformLocation(program, "projection");
    const modelViewLocation = gl.getUniformLocation(program, "modelView");
    const orbColorLocation = gl.getUniformLocation(program, "orbColor");
    const timeLocation = gl.getUniformLocation(program, "time");
    const edgeFadeLocation = gl.getUniformLocation(program, "edgeFade");

    // Colors from hero `bg-gradient-text`
    const orbColors = [
      new Float32Array([0.631, 0.388, 0.945]), // #a163f1
      new Float32Array([0.388, 0.388, 0.945]), // #6363f1
      new Float32Array([0.349, 0.694, 0.996]), // #59b1fe
      new Float32Array([0.251, 0.875, 0.639]), // #40dfa3
    ];

    const orbCount =
      typeof window !== "undefined" && window.innerWidth < 768 ? 8 : 14;
    const orbs: Orb[] = [];
    for (let i = 0; i < orbCount; i++) {
      orbs.push({
        x: Math.random() * 24 - 12,
        y: Math.random() * 10 - 5,
        z: -8 - Math.random() * 5,
        speed: 0.004 + Math.random() * 0.007,
        waveAmplitude: 0.3 + Math.random() * 0.55,
        waveFrequency: 0.45 + Math.random() * 1.0,
        waveOffset: Math.random() * Math.PI * 2,
        size: 0.035 + Math.random() * 0.05,
        colorIndex: Math.floor(Math.random() * orbColors.length),
      });
    }

    function createPerspective(
      fov: number,
      aspect: number,
      near: number,
      far: number
    ) {
      const f = 1.0 / Math.tan(fov / 2);
      return new Float32Array([
        f / aspect,
        0,
        0,
        0,
        0,
        f,
        0,
        0,
        0,
        0,
        (far + near) / (near - far),
        -1,
        0,
        0,
        (2 * far * near) / (near - far),
        0,
      ]);
    }

    function resize() {
      if (!canvas || !gl) return;
      const parent = canvas.parentElement;
      const cssWidth = parent?.clientWidth || canvas.clientWidth || 1;
      const cssHeight = parent?.clientHeight || canvas.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
      canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    gl.clearColor(0, 0, 0, 0);

    let animationId = 0;
    let disposed = false;
    const observer = new ResizeObserver(() => resize());
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    function animate() {
      if (!gl || !canvas || disposed) return;
      timeRef.current += 0.007;

      gl.clear(gl.COLOR_BUFFER_BIT);

      const aspect = canvas.width / Math.max(canvas.height, 1);
      const projection = createPerspective(Math.PI / 4, aspect, 0.1, 100);

      gl.useProgram(program);
      gl.uniformMatrix4fv(projectionLocation, false, projection);

      const fadeDistance = 2.2;
      const xBound = 12;
      const yBound = 5.5;

      for (const orb of orbs) {
        orb.x += orb.speed;
        const waveY =
          Math.sin(timeRef.current * orb.waveFrequency + orb.waveOffset) *
          orb.waveAmplitude;

        if (orb.x > xBound) {
          orb.x = -xBound;
          orb.y = Math.random() * 10 - 5;
          orb.z = -8 - Math.random() * 5;
        }

        const actualY = orb.y + waveY;
        const leftFade = Math.min(1, Math.max(0, (orb.x + xBound) / fadeDistance));
        const rightFade = Math.min(
          1,
          Math.max(0, (xBound - orb.x) / fadeDistance)
        );
        const topFade = Math.min(
          1,
          Math.max(0, (actualY + yBound) / fadeDistance)
        );
        const bottomFade = Math.min(
          1,
          Math.max(0, (yBound - actualY) / fadeDistance)
        );
        const edgeFade = Math.min(leftFade, rightFade, topFade, bottomFade);

        const modelView = new Float32Array([
          orb.size,
          0,
          0,
          0,
          0,
          orb.size,
          0,
          0,
          0,
          0,
          orb.size,
          0,
          orb.x,
          actualY,
          orb.z,
          1,
        ]);

        gl.uniformMatrix4fv(modelViewLocation, false, modelView);
        gl.uniform3fv(orbColorLocation, orbColors[orb.colorIndex]);
        gl.uniform1f(timeLocation, timeRef.current + orb.waveOffset);
        gl.uniform1f(edgeFadeLocation, edgeFade);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 60);
      }

      animationId = requestAnimationFrame(animate);
    }

    const layoutFrame = requestAnimationFrame(() => {
      resize();
      if (!disposed) animate();
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(layoutFrame);
      cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
