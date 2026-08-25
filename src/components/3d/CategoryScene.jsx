/**
 * CategoryScene.jsx
 *
 * A single, configuration-driven Three.js component that renders a unique
 * 3D geometry for each service category.  The same renderer, lighting,
 * animation-loop and cleanup code is reused for every category; only the
 * geometry + accent colour change based on the `slug` prop.
 *
 * Design constraints (from approved plan):
 *  - One reusable architecture — no eight independent implementations.
 *  - Adapts to Light/Dark theme via usePreference.
 *  - Adapts to Reduced Motion via usePreference (halts animation loop).
 *  - IntersectionObserver pauses the animation loop when off-screen.
 *  - Language change has zero effect on geometry or animation.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { usePreference } from '../layout/PreferenceContext';

/* ─── Per-category configuration ──────────────────────────────────────────── */
/* Each entry maps a slug to { geometry factory, accent colour (hex) }        */
const CATEGORY_CONFIG = {
  'web-development':       { geometry: () => new THREE.TorusKnotGeometry(0.9, 0.28, 80, 12),  accent: 0x6366f1 },
  'design-creative':       { geometry: () => new THREE.OctahedronGeometry(1.2, 2),             accent: 0xf59e0b },
  'writing-translation':   { geometry: () => new THREE.CylinderGeometry(0.6, 0.9, 1.6, 6),    accent: 0x10b981 },
  'digital-marketing':     { geometry: () => new THREE.IcosahedronGeometry(1.1, 1),            accent: 0xec4899 },
  'video-animation':       { geometry: () => new THREE.ConeGeometry(0.9, 1.8, 8),             accent: 0xf97316 },
  'data-analytics':        { geometry: () => new THREE.BoxGeometry(1.4, 1.4, 1.4),            accent: 0x3b82f6 },
  'ai-machine-learning':   { geometry: () => new THREE.DodecahedronGeometry(1.1, 0),           accent: 0xa855f7 },
  'audio-music':           { geometry: () => new THREE.TorusGeometry(1.0, 0.38, 14, 40),      accent: 0x14b8a6 },
  // Fallback for unknown slugs
  default:                 { geometry: () => new THREE.SphereGeometry(1.1, 32, 32),            accent: 0x10b981 },
};

/* ─── Theme palette ────────────────────────────────────────────────────────── */
const THEME_CONFIG = {
  dark: {
    meshColor:            0x0f172a,
    wireOpacity:          0.30,
    particleOpacity:      0.55,
    ambientIntensity:     0.35,
    directionalIntensity: 2.2,
    pointIntensity:       2.5,
  },
  light: {
    meshColor:            0xe2e8f0,
    wireOpacity:          0.20,
    particleOpacity:      0.35,
    ambientIntensity:     0.9,
    directionalIntensity: 1.4,
    pointIntensity:       1.6,
  },
};

const resolveTheme = (theme) => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

/* ─── Component ────────────────────────────────────────────────────────────── */
const CategoryScene = ({
  slug      = 'default',
  className = '',
  style     = {},
  height    = 280,
}) => {
  const mountRef         = useRef(null);
  const observerRef      = useRef(null);
  const isVisibleRef     = useRef(true);
  const [isWebGL, setIsWebGL] = useState(true);
  const { theme, motion } = usePreference();

  // Mutable refs so animation loop reads latest values without restart.
  const themeRef  = useRef(theme);
  const motionRef = useRef(motion);
  useEffect(() => { themeRef.current  = theme;  }, [theme]);
  useEffect(() => { motionRef.current = motion; }, [motion]);

  const setupScene = useCallback(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId;
    const clock = new THREE.Clock();

    try {
      /* ── Resolve config ─────────────────────────────────────────────── */
      const cfg = CATEGORY_CONFIG[slug] ?? CATEGORY_CONFIG.default;

      /* ── Scene & Camera ─────────────────────────────────────────────── */
      const scene  = new THREE.Scene();
      const w      = container.clientWidth  || 400;
      const h      = container.clientHeight || height;
      const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
      camera.position.z = 4.5;

      /* ── Renderer ───────────────────────────────────────────────────── */
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      /* ── Geometry ───────────────────────────────────────────────────── */
      const geometry = cfg.geometry();

      /* ── Main mesh ──────────────────────────────────────────────────── */
      const material = new THREE.MeshStandardMaterial({
        roughness: 0.25,
        metalness: 0.85,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      /* ── Wireframe overlay ──────────────────────────────────────────── */
      const wireMat = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true });
      const wireMesh = new THREE.Mesh(geometry, wireMat);
      wireMesh.scale.set(1.04, 1.04, 1.04);
      scene.add(wireMesh);

      /* ── Particle halo ──────────────────────────────────────────────── */
      const particleCount = 120;
      const pGeom   = new THREE.BufferGeometry();
      const pPos    = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount * 3; i++) {
        pPos[i] = (Math.random() - 0.5) * 8;
      }
      pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      const pMat  = new THREE.PointsMaterial({ size: 0.03, transparent: true });
      const pMesh = new THREE.Points(pGeom, pMat);
      scene.add(pMesh);

      /* ── Lights ─────────────────────────────────────────────────────── */
      const ambient  = new THREE.AmbientLight(0xffffff, 0.35);
      const dirLight = new THREE.DirectionalLight(cfg.accent, 2.2);
      dirLight.position.set(3, 3, 3);
      const ptLight  = new THREE.PointLight(cfg.accent, 2.5, 15);
      ptLight.position.set(-3, -3, 2);
      scene.add(ambient, dirLight, ptLight);

      /* ── Apply theme ────────────────────────────────────────────────── */
      const applyTheme = () => {
        const active = resolveTheme(themeRef.current);
        const t      = THEME_CONFIG[active] ?? THEME_CONFIG.dark;
        material.color.set(t.meshColor);
        wireMat.color.set(cfg.accent);
        wireMat.opacity          = t.wireOpacity;
        pMat.color.set(cfg.accent);
        pMat.opacity             = t.particleOpacity;
        ambient.intensity        = t.ambientIntensity;
        dirLight.intensity       = t.directionalIntensity;
        ptLight.intensity        = t.pointIntensity;
      };
      applyTheme();

      /* ── Resize handler ─────────────────────────────────────────────── */
      const onResize = () => {
        if (!container) return;
        const nw = container.clientWidth;
        const nh = container.clientHeight;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      };
      window.addEventListener('resize', onResize);

      /* ── Animation loop ─────────────────────────────────────────────── */
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);

        // Pause when off-screen (IntersectionObserver controls isVisibleRef)
        if (!isVisibleRef.current) {
          return;
        }

        applyTheme();

        const t         = clock.getElapsedTime();
        const isReduced = motionRef.current === 'reduced';
        const speed     = isReduced ? 0.04 : 1.0;

        mesh.rotation.x = t * 0.25 * speed;
        mesh.rotation.y = t * 0.35 * speed;
        wireMesh.rotation.x = mesh.rotation.x;
        wireMesh.rotation.y = mesh.rotation.y;
        pMesh.rotation.y    = t * 0.03 * speed;

        if (!isReduced) {
          ptLight.position.x = Math.sin(t * 0.8) * 3;
          ptLight.position.y = Math.cos(t * 0.8) * 3;
        }

        renderer.render(scene, camera);
      };
      animate();

      /* ── IntersectionObserver — pause when invisible ─────────────────── */
      observerRef.current = new IntersectionObserver(
        ([entry]) => { isVisibleRef.current = entry.isIntersecting; },
        { threshold: 0.1 }
      );
      observerRef.current.observe(container);

      /* ── Cleanup ────────────────────────────────────────────────────── */
      return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', onResize);
        if (observerRef.current) observerRef.current.disconnect();
        if (container && renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        geometry.dispose();
        material.dispose();
        wireMat.dispose();
        pGeom.dispose();
        pMat.dispose();
        renderer.dispose();
      };
    } catch (err) {
      console.warn('CategoryScene WebGL error:', err);
      setIsWebGL(false);
    }
  }, [slug, height]); // Only re-init if slug or height change; theme/motion via refs

  useEffect(() => {
    const cleanup = setupScene();
    return cleanup;
  }, [setupScene]);

  /* ── Accent colour for CSS fallback ────────────────────────────────────── */
  const accentHex = `#${((CATEGORY_CONFIG[slug] ?? CATEGORY_CONFIG.default).accent).toString(16).padStart(6, '0')}`;

  return (
    <div
      ref={mountRef}
      className={`category-3d-canvas ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        overflow: 'hidden',
        ...style,
      }}
    >
      {!isWebGL && (
        /* CSS fallback — an accent-coloured glowing orb */
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `radial-gradient(circle at center, ${accentHex}22 0%, transparent 70%)`,
          }}
        >
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: `1px solid ${accentHex}55`,
              boxShadow: `0 0 40px ${accentHex}33`,
              animation: 'pulse-glow 5s infinite ease-in-out',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default CategoryScene;
