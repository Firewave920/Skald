// Shared Skald design tokens + small primitives used by all three login variants.

const SKALD = {
  bg: '#0b0b0e',
  bgDeep: '#08080b',
  panel: '#131319',
  panel2: '#1a1a22',
  line: 'rgba(255,255,255,0.06)',
  lineStrong: 'rgba(255,255,255,0.12)',
  text: '#ebe7df',
  textDim: 'rgba(235,231,223,0.62)',
  textMute: 'rgba(235,231,223,0.38)',
  accent: '#d4a64a',
  accentBright: '#e9bb5e',
  accentDeep: '#a37d2e',
  accentDim: 'rgba(212,166,74,0.18)',
  accentEdge: 'rgba(212,166,74,0.35)',
  glass: 'rgba(255,255,255,0.04)',
  glassStrong: 'rgba(255,255,255,0.07)',
  glassEdge: 'rgba(255,255,255,0.09)',
  sans: '"Inter", -apple-system, system-ui, sans-serif',
  serif: '"Source Serif Pro", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
};

// Default prefill values (mirrors the real Skald connect screen).
const PREFILL = { scheme: 'http', host: '192.168.1.238:13378', user: 'Testadmin' };

// The warm-onyx jewel wash that backs every Skald window.
function Wash({ intensity = 1 }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: SKALD.bg, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: '-15%', top: '-25%', width: '70%', height: '120%', background: `radial-gradient(50% 50% at 50% 50%, rgba(212,166,74,${0.14 * intensity}), transparent 65%)`, filter: 'blur(90px)' }} />
      <div style={{ position: 'absolute', right: '-10%', top: '20%', width: '60%', height: '80%', background: `radial-gradient(50% 50% at 50% 50%, rgba(212,166,74,${0.08 * intensity}), transparent 60%)`, filter: 'blur(110px)' }} />
      <div style={{ position: 'absolute', left: '20%', bottom: '-30%', width: '70%', height: '90%', background: 'radial-gradient(50% 50% at 50% 50%, rgba(60,40,20,0.6), transparent 65%)', filter: 'blur(120px)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.55))' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.05, mixBlendMode: 'overlay',
        backgroundImage: 'repeating-radial-gradient(circle at 13% 27%, rgba(255,255,255,0.6) 0 0.5px, transparent 0.5px 3px), repeating-radial-gradient(circle at 73% 67%, rgba(255,255,255,0.5) 0 0.5px, transparent 0.5px 3px)',
      }} />
    </div>
  );
}

// Window titlebar with traffic-control buttons, used by each variant.
function MiniTitlebar({ subtitle, tone = 'default' }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 14px', zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 16, height: 16, borderRadius: 4, background: SKALD.glassStrong, border: `1px solid ${SKALD.glassEdge}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: SKALD.accent, fontFamily: SKALD.serif }}>S</div>
        <div style={{ fontFamily: SKALD.mono, fontSize: 9, color: SKALD.textMute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Skald{subtitle ? ` · ${subtitle}` : ''}</div>
      </div>
      <div style={{ display: 'flex', gap: 0, marginRight: -14, height: 40 }}>
        {['\u2013', '\u25A1', '\u2715'].map((g, i) => (
          <button key={i} className={`mtb-btn${i === 2 ? ' mtb-close' : ''}`}
            style={{ width: 40, height: 40, borderRadius: 0, background: 'transparent', border: 'none', color: SKALD.textMute, fontSize: i === 1 ? 10 : 12, lineHeight: 1, cursor: 'pointer', padding: 0, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{g}</button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { SKALD, PREFILL, Wash, MiniTitlebar });
