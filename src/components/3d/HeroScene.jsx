/**
 * FreelanceProjectScene  (exported as default, imported as HeroScene)
 *
 * Premium CSS glassmorphism hero scene communicating:
 *   Freelancer + Client + Project + Skills + Collaboration
 *
 * Architecture:
 *  - Pure CSS/HTML — no WebGL dependency, always renders
 *  - Theme-aware via usePreference (light / dark / system)
 *  - Motion-aware: floating + parallax (standard) | fully static (reduced)
 *  - aria-hidden — decorative only; all meaningful text is in the page body
 *  - Standard browser/OS cursor preserved throughout
 *
 * Per-card DOM structure (avoids CSS-animation ↔ inline-transform conflicts):
 *   <div> ← absolutely positioned + CSS float animation (translateY only)
 *     <div> ← parallax inline transform (translateX/Y)
 *       <div> ← visual card surface (background, border, shadow, content)
 */

import React, { useEffect, useState } from 'react';
import { usePreference } from '../layout/PreferenceContext';

/* ─── Keyframes — injected once into <head> ────────────────────────────────── */
const KEYFRAMES_ID  = 'ws-fls-kf';
const KEYFRAMES_CSS = `
  @keyframes ws-float-a {
    0%,100% { transform: translateY(0px)   rotate(-0.4deg); }
    50%     { transform: translateY(-12px)  rotate( 0.4deg); }
  }
  @keyframes ws-float-b {
    0%,100% { transform: translateY(-5px)  rotate( 0.6deg); }
    50%     { transform: translateY( 7px)  rotate(-0.5deg); }
  }
  @keyframes ws-float-c {
    0%,100% { transform: translateY( 4px)  rotate(-0.3deg); }
    50%     { transform: translateY(-9px)  rotate( 0.5deg); }
  }
  @keyframes ws-tag-a {
    0%,100% { transform: translateY(0px);  }
    50%     { transform: translateY(-6px); }
  }
  @keyframes ws-tag-b {
    0%,100% { transform: translateY(-3px); }
    50%     { transform: translateY( 5px); }
  }
  @keyframes ws-dot-pulse {
    0%,100% { opacity:.35; transform:scale(1);   }
    50%     { opacity:.85; transform:scale(1.45); }
  }
  @keyframes ws-dash-flow {
    to { stroke-dashoffset: -40; }
  }
`;

/* ─── Theme helper ─────────────────────────────────────────────────────────── */
const resolveTheme = (t) => {
  if (t === 'system') {
    return typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light';
  }
  return t;
};

/* ─── Component ────────────────────────────────────────────────────────────── */
const FreelanceProjectScene = () => {
  const { theme, motion } = usePreference();
  const [mouse, setMouse]   = useState({ x: 0, y: 0 });

  const activeTheme = resolveTheme(theme);
  const dk          = activeTheme === 'dark';
  const isReduced   = motion === 'reduced';

  /* Inject keyframes once */
  useEffect(() => {
    if (!document.getElementById(KEYFRAMES_ID)) {
      const el = document.createElement('style');
      el.id    = KEYFRAMES_ID;
      el.textContent = KEYFRAMES_CSS;
      document.head.appendChild(el);
    }
  }, []);

  /* Mouse parallax */
  useEffect(() => {
    if (isReduced) { setMouse({ x: 0, y: 0 }); return; }
    const onMove = (e) => setMouse({
      x: (e.clientX / window.innerWidth  - 0.5) * 22,
      y: (e.clientY / window.innerHeight - 0.5) * 14,
    });
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [isReduced]);

  /* ── Design tokens ──────────────────────────────────────────────── */
  const card = {
    bg:     dk ? 'rgba(12,19,37,0.86)'        : 'rgba(255,255,255,0.90)',
    border: dk ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(15,23,42,0.09)',
    shadow: dk
      ? '0 24px 56px rgba(0,0,0,0.48), 0 0 0 1px rgba(255,255,255,0.04)'
      : '0 20px 48px rgba(15,23,42,0.11), 0 4px 12px rgba(15,23,42,0.05)',
  };
  const tx = {
    h:   dk ? '#f1f5f9' : '#0f172a',
    sub: dk ? '#94a3b8' : '#475569',
    dim: dk ? '#64748b' : '#94a3b8',
  };
  const em = {
    color:  dk ? '#10b981'              : '#059669',
    bg:     dk ? 'rgba(16,185,129,.10)' : 'rgba(5,150,105,.08)',
    border: dk ? 'rgba(16,185,129,.26)' : 'rgba(5,150,105,.20)',
  };
  const bl = {
    color:  dk ? '#818cf8'              : '#4f46e5',
    bg:     dk ? 'rgba(99,102,241,.10)' : 'rgba(99,102,241,.07)',
    border: dk ? 'rgba(99,102,241,.26)' : 'rgba(99,102,241,.18)',
  };
  const sep         = dk ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.07)';
  const lineStroke  = dk ? 'rgba(255,255,255,0.13)' : 'rgba(15,23,42,0.12)';
  const accentLine  = dk ? 'rgba(16,185,129,0.42)'  : 'rgba(5,150,105,0.36)';

  /* ── Shared surface style ───────────────────────────────────────── */
  const surface = {
    background:           card.bg,
    backdropFilter:       'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border:               card.border,
    borderRadius:         '16px',
    boxShadow:            card.shadow,
  };

  /* ── Helpers ────────────────────────────────────────────────────── */
  /* Returns CSS animation object for the outer (positioned) wrapper */
  const floatAnim = (name, dur, delay = 0) =>
    isReduced
      ? {}
      : { animation: `${name} ${dur}s ease-in-out infinite`, animationDelay: `${delay}s` };

  /* Returns inline style for the inner (parallax) wrapper */
  const par = (fx, fy) => ({
    transform:  `translate(${(mouse.x * fx).toFixed(2)}px,${(mouse.y * fy).toFixed(2)}px)`,
    transition: isReduced ? 'none' : 'transform 0.35s ease-out',
  });

  /* Micro pulse animation for status dots */
  const pulse = (delay = 0) =>
    isReduced
      ? {}
      : { animation: `ws-dot-pulse 2s ease-in-out infinite`, animationDelay: `${delay}s` };

  /* Skill tag descriptor list */
  const TAGS = [
    {
      label: '⚛ React',
      pos:   { top: '7%',    right: '5%'  },
      c:     bl,
      anim:  'ws-tag-a', dur: 5.5, delay: -0.5,
      px: 0.6, py: 0.25,
    },
    {
      label: 'UI/UX',
      pos:   { top: '26%',   right: '2%'  },
      c:     em,
      anim:  'ws-tag-b', dur: 5,   delay: -2,
      px: 0.7, py: 0.35,
    },
    {
      label: 'Branding',
      pos:   { bottom: '22%', left: '2%' },
      c:     { color: dk ? '#fbbf24':'#b45309', bg: dk ? 'rgba(251,191,36,.08)':'rgba(180,83,9,.07)', border: dk ? 'rgba(251,191,36,.24)':'rgba(180,83,9,.18)' },
      anim:  'ws-tag-a', dur: 5.2, delay: -3.5,
      px: 0.45, py: 0.4,
    },
    {
      label: 'SEO',
      pos:   { bottom: '4%', right: '8%' },
      c:     { color: dk ? '#7dd3fc':'#0369a1', bg: dk ? 'rgba(125,211,252,.08)':'rgba(3,105,161,.07)', border: dk ? 'rgba(125,211,252,.24)':'rgba(3,105,161,.18)' },
      anim:  'ws-tag-b', dur: 4.8, delay: -1,
      px: 0.55, py: 0.45,
    },
    {
      label: 'AI Tools',
      pos:   { bottom: '5%', left: '2%' },
      c:     { color: dk ? '#c4b5fd':'#6d28d9', bg: dk ? 'rgba(196,181,253,.08)':'rgba(109,40,217,.07)', border: dk ? 'rgba(196,181,253,.24)':'rgba(109,40,217,.18)' },
      anim:  'ws-tag-a', dur: 5.8, delay: -4.5,
      px: 0.4, py: 0.45,
    },
  ];

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════ */
  return (
    <div
      aria-hidden="true"
      role="presentation"
      style={{
        position:   'relative',
        width:      '100%',
        height:     '100%',
        minHeight:  '460px',
        overflow:   'hidden',
        userSelect: 'none',
        cursor:     'default',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >

      {/* ── SVG Connection Lines ──────────────────────────────────── */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}
      >
        {/* Freelancer → Project  (animated accent dash) */}
        <path d="M 19,18 C 27,30 35,39 45,47"
          fill="none" stroke={accentLine} strokeWidth="0.6" strokeDasharray="3 2.5"
          style={isReduced ? {} : { animation:'ws-dash-flow 3s linear infinite' }}
        />
        {/* Project → Client  (animated accent dash) */}
        <path d="M 56,54 C 65,63 71,71 79,79"
          fill="none" stroke={accentLine} strokeWidth="0.6" strokeDasharray="3 2.5"
          style={isReduced ? {} : { animation:'ws-dash-flow 3s linear infinite', animationDelay:'-1.5s' }}
        />
        {/* Project → React tag  (static subtle) */}
        <path d="M 54,44 C 63,34 71,25 78,16"
          fill="none" stroke={lineStroke} strokeWidth="0.45" strokeDasharray="2 3"
        />
        {/* Project → Branding  (static subtle) */}
        <path d="M 44,56 C 35,63 26,68 20,73"
          fill="none" stroke={lineStroke} strokeWidth="0.45" strokeDasharray="2 3"
        />

        {/* Endpoint pulse dots */}
        <circle cx="19" cy="18" r="0.9" fill={em.color} opacity="0.7"
          style={pulse(0)}
        />
        <circle cx="56" cy="54" r="0.9" fill={em.color} opacity="0.7"
          style={pulse(-1)}
        />
      </svg>

      {/* ══════════════════════════════════════════════════════════════
          FREELANCER CARD  —  upper-left
      ══════════════════════════════════════════════════════════════ */}
      <div style={{
        position:'absolute', left:'2%', top:'4%', zIndex:3,
        ...floatAnim('ws-float-b', 9, -1.5),
      }}>
        <div style={par(0.4, 0.3)}>
          <div style={{ ...surface, padding:'15px 16px', width:'178px' }}>

            {/* Avatar + name */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{
                width:36, height:36, borderRadius:'50%', flexShrink:0,
                background: dk
                  ? 'linear-gradient(135deg,#1d3461,#2651a0)'
                  : 'linear-gradient(135deg,#dbeafe,#bfdbfe)',
                border: `1.5px solid ${bl.border}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, fontWeight:800, color:bl.color,
              }}>AK</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:tx.h,   lineHeight:1.2 }}>Alex K.</div>
                <div style={{ fontSize:11, fontWeight:400, color:tx.sub, lineHeight:1.3 }}>UI/UX Designer</div>
              </div>
            </div>

            {/* Rating + availability */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ color:'#f59e0b', fontSize:11, letterSpacing:'-1px' }}>★★★★★</span>
                <span style={{ fontSize:12, fontWeight:800, color:tx.h }}>4.9</span>
              </div>
              <span style={{
                fontSize:10, fontWeight:700,
                background:em.bg, border:`1px solid ${em.border}`,
                color:em.color, padding:'2px 8px', borderRadius:99,
              }}>Available</span>
            </div>

            {/* Skill micro-pills */}
            <div style={{ display:'flex', gap:4, marginTop:10 }}>
              {['Figma','React'].map(s => (
                <span key={s} style={{
                  fontSize:10, color:tx.sub,
                  background: dk ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)',
                  border:`1px solid ${sep}`,
                  padding:'2px 6px', borderRadius:4,
                }}>{s}</span>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PROJECT CARD  —  center, largest
          Centering uses translate(calc(-50% + mouseX), calc(-50% + mouseY))
          so parallax and centering live on the inner wrapper, not conflicting
          with the outer float animation (translateY only).
      ══════════════════════════════════════════════════════════════ */}
      <div style={{
        position:'absolute', left:'50%', top:'50%', zIndex:4,
        ...floatAnim('ws-float-a', 8, 0),
      }}>
        {/* inner: centering + parallax (no conflict with outer translateY anim) */}
        <div style={{
          transform:`translate(calc(-50% + ${(mouse.x * 0.15).toFixed(2)}px), calc(-50% + ${(mouse.y * 0.10).toFixed(2)}px))`,
          transition: isReduced ? 'none' : 'transform 0.4s ease-out',
        }}>
          <div style={{ ...surface, padding:'20px', width:'246px' }}>

            {/* Status badge */}
            <div style={{
              display:'inline-flex', alignItems:'center', gap:5, marginBottom:13,
              fontSize:10, fontWeight:800, letterSpacing:'0.06em', textTransform:'uppercase',
              color:em.color, background:em.bg, border:`1px solid ${em.border}`,
              padding:'3px 9px', borderRadius:99,
            }}>
              <span style={{
                width:5, height:5, borderRadius:'50%', background:em.color, display:'inline-block',
                ...pulse(0),
              }} />
              Active Project
            </div>

            {/* Title */}
            <div style={{ fontSize:17, fontWeight:800, color:tx.h,   lineHeight:1.2, marginBottom:4 }}>
              Website Redesign
            </div>
            <div style={{ fontSize:12, fontWeight:400, color:tx.sub, marginBottom:16 }}>
              UI/UX + Development
            </div>

            {/* Divider */}
            <div style={{ height:1, background:sep, marginBottom:14 }} />

            {/* Budget + deadline */}
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <div>
                <div style={{ fontSize:10, color:tx.dim, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:2 }}>
                  Budget
                </div>
                <div style={{ fontSize:16, fontWeight:800, color:tx.h }}>$4,200</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:10, color:tx.dim, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginBottom:2 }}>
                  Deadline
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:tx.h }}>14 days</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{
              height:4, borderRadius:99, overflow:'hidden',
              background: dk ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.07)',
              marginBottom:5,
            }}>
              <div style={{
                width:'62%', height:'100%', borderRadius:99,
                background:`linear-gradient(90deg, ${em.color}, #6366f1)`,
              }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:10, color:tx.dim }}>Progress</span>
              <span style={{ fontSize:10, fontWeight:700, color:em.color }}>62%</span>
            </div>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CLIENT CARD  —  lower-right
      ══════════════════════════════════════════════════════════════ */}
      <div style={{
        position:'absolute', right:'2%', bottom:'8%', zIndex:3,
        ...floatAnim('ws-float-c', 9.5, -3.5),
      }}>
        <div style={par(0.5, 0.4)}>
          <div style={{ ...surface, padding:'14px 16px', width:'188px' }}>

            {/* Company logo + name */}
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
              <div style={{
                width:34, height:34, borderRadius:8, flexShrink:0,
                background: dk ? 'rgba(30,41,59,0.9)' : 'rgba(241,245,249,0.95)',
                border: card.border,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:800, color:tx.sub,
              }}>AC</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:tx.h }}>Acme Corp</div>
                <div style={{ fontSize:10, color:tx.sub }}>Client Brief</div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height:1, background:sep, marginBottom:10 }} />

            {/* Category tags */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:10 }}>
              {['E-commerce','SaaS'].map(t => (
                <span key={t} style={{
                  fontSize:10, fontWeight:600, color:bl.color,
                  background:bl.bg, border:`1px solid ${bl.border}`,
                  padding:'2px 7px', borderRadius:4,
                }}>{t}</span>
              ))}
            </div>

            {/* Live status */}
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{
                width:6, height:6, borderRadius:'50%', flexShrink:0,
                background:em.color, display:'inline-block',
                ...pulse(-0.5),
              }} />
              <span style={{ fontSize:11, color:tx.sub }}>2 proposals received</span>
            </div>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FLOATING SKILL TAGS
          Same two-wrapper pattern: outer = position + anim, inner = parallax
      ══════════════════════════════════════════════════════════════ */}
      {TAGS.map(({ label, pos, c, anim: animName, dur, delay, px, py }) => (
        <div key={label} style={{
          position:'absolute', zIndex:3,
          ...pos,
          ...floatAnim(animName, dur, delay),
        }}>
          <div style={par(px, py)}>
            <div style={{
              background:           card.bg,
              backdropFilter:       'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border:               `1px solid ${c.border}`,
              borderRadius:         99,
              padding:              '5px 12px',
              fontSize:             11, fontWeight:700,
              color:                c.color,
              whiteSpace:           'nowrap',
            }}>
              {label}
            </div>
          </div>
        </div>
      ))}

    </div>
  );
};

export default FreelanceProjectScene;
