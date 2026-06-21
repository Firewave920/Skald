// Shared chrome for the first-launch onboarding flow (First-Launch Onboarding
// roadmap, Phase 1). Mirrors the Saga login look — a left "manuscript" panel and
// a right content column — so the flow reads as the same product as Login.tsx.
// The right column is split into a scrolling content region (header + step body)
// and a fixed footer that the host fills with Back / progress dots / Skip.
import type { ReactNode } from 'react';
import Titlebar from '../chrome/Titlebar';
import lyreIcon from '../../assets/lyre.png';

// Typography constants — identical tokens to Login.tsx so the two screens match.
export const SERIF = '"Source Serif 4", "Source Serif Pro", Georgia, serif';
export const MONO  = "'JetBrains Mono', ui-monospace, monospace";
export const SANS  = "'Inter', system-ui, -apple-system, sans-serif";

// Shared gold-pill CTA — the same gradient/shape as Login's "Enter" button.
// Reused by every step's primary action so the flow has one consistent CTA.
export function GoldButton({
  children, onClick, type = 'button', disabled = false, busy = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className="saga-cta"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(180deg, #e9bb5e, #d4a64a 55%, #a37d2e)',
        border: '1px solid rgba(var(--onyx-accent-r),var(--onyx-accent-g),var(--onyx-accent-b),0.35)',
        borderRadius: 999,
        color: '#1a1306', fontFamily: SERIF, fontWeight: 600, fontSize: 15,
        padding: '11px 28px', letterSpacing: '0.01em',
        cursor: disabled ? 'not-allowed' : busy ? 'wait' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        boxShadow: '0 8px 24px rgba(var(--onyx-accent-r),var(--onyx-accent-g),var(--onyx-accent-b),0.22), inset 0 1px 0 rgba(255,255,255,0.2)',
        transition: 'transform 0.12s, box-shadow 0.18s, filter 0.12s',
      }}
    >
      {children}
      <span className="saga-arrow" style={{ display: 'flex', transition: 'transform 0.2s' }}>→</span>
    </button>
  );
}

// Quiet secondary text button (e.g. "Skip for now" inside a step body).
export function GhostButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontFamily: SERIF, fontStyle: 'italic', fontSize: 13,
        color: 'rgba(235,231,223,0.62)', padding: '6px 4px', textDecoration: 'underline',
        textUnderlineOffset: 3, textDecorationColor: 'rgba(235,231,223,0.25)',
      }}
    >
      {children}
    </button>
  );
}

export interface StepFrameProps {
  // Mono eyebrow above the title (e.g. "STEP 2 OF 5").
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  // The step body — fields, cards, explainer, etc.
  children: ReactNode;
  // The footer chrome (Back / dots / Skip) rendered by the host.
  footer: ReactNode;
  // Changing this remounts the animated content region so the slide-in replays.
  stepKey: string;
}

export default function StepFrame({ eyebrow, title, subtitle, children, footer, stepKey }: StepFrameProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', overflow: 'hidden',
      background: '#0b0b0e', color: '#ebe7df', fontFamily: SANS,
    }}>
      {/* Window chrome — spans the full width and provides the drag region + the
          minimize/close controls (the window has no native decorations). Without
          this the onboarding window can't be moved or closed. Mirrors Login.tsx. */}
      <Titlebar isDark minimal />

      {/* ── LEFT PANEL — manuscript column (brand, fixed across all steps) ── */}
      <div style={{
        position: 'relative', width: 268, flexShrink: 0, overflow: 'hidden',
        borderRight: '1px solid rgba(var(--onyx-accent-r),var(--onyx-accent-g),var(--onyx-accent-b),0.35)',
      }}>
        {/* Wash background — same layered radial glow as Login's left panel. */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#0b0b0e', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: '-15%', top: '-25%', width: '70%', height: '120%', background: 'radial-gradient(50% 50% at 50% 50%, rgba(var(--onyx-accent-r),var(--onyx-accent-g),var(--onyx-accent-b),0.196), transparent 65%)', filter: 'blur(90px)' }} />
          <div style={{ position: 'absolute', right: '-10%', top: '20%', width: '60%', height: '80%', background: 'radial-gradient(50% 50% at 50% 50%, rgba(var(--onyx-accent-r),var(--onyx-accent-g),var(--onyx-accent-b),0.112), transparent 60%)', filter: 'blur(110px)' }} />
          <div style={{ position: 'absolute', left: '20%', bottom: '-30%', width: '70%', height: '90%', background: 'radial-gradient(50% 50% at 50% 50%, rgba(60,40,20,0.6), transparent 65%)', filter: 'blur(120px)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.55))' }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.5, mixBlendMode: 'soft-light', pointerEvents: 'none', background: 'radial-gradient(120% 80% at 0% 0%, rgba(var(--onyx-accent-r),var(--onyx-accent-g),var(--onyx-accent-b),0.35), transparent 55%)' }} />

        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '54px 30px 30px' }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--onyx-accent)' }}>
              Skald
            </div>
            <div style={{ width: 26, height: 1, background: 'rgba(var(--onyx-accent-r),var(--onyx-accent-g),var(--onyx-accent-b),0.35)', margin: '16px 0 18px' }} />
            <div style={{ fontFamily: SERIF, fontSize: 33, lineHeight: 1.14, fontWeight: 600, letterSpacing: '-0.015em', color: '#ebe7df' }}>
              Let us<br />ready the{' '}
              <span style={{ fontStyle: 'italic', color: 'var(--onyx-accent)' }}>hall</span>.
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
            <img
              src={lyreIcon}
              alt="Skald"
              style={{ width: 200, height: 200, objectFit: 'contain', opacity: 0.85, filter: 'drop-shadow(0 0 18px rgba(var(--onyx-accent-r), var(--onyx-accent-g), var(--onyx-accent-b), 0.35))' }}
            />
          </div>

          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, lineHeight: 1.55, color: 'rgba(235,231,223,0.62)', maxWidth: 200 }}>
            "First we set the table; then the telling begins."
            <div style={{ fontStyle: 'normal', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(235,231,223,0.38)', marginTop: 14 }}>
              — the keeper's note
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — content column ───────────────────────────────────── */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, zIndex: 10 }}>
        {/* Scrolling content region — header + step body, re-animated per step. */}
        <div
          key={stepKey}
          className="saga-in"
          style={{ flex: 1, overflowY: 'auto', padding: '54px 44px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}
        >
          <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
            <div style={{ marginBottom: 26 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--onyx-accent)', marginBottom: 12 }}>
                {eyebrow}
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 600, letterSpacing: '-0.01em', color: '#ebe7df', lineHeight: 1.15 }}>
                {title}
              </div>
              {subtitle && (
                <div style={{ fontSize: 13.5, fontFamily: SANS, color: 'rgba(235,231,223,0.62)', marginTop: 9, lineHeight: 1.5, maxWidth: 480 }}>
                  {subtitle}
                </div>
              )}
            </div>
            {children}
          </div>
        </div>

        {/* Fixed footer chrome — host fills with Back / dots / Skip. */}
        <div style={{
          flexShrink: 0, padding: '16px 44px', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

// Row of progress dots showing position within the active branch. The current
// step is a wider gold bar; completed/upcoming are small muted dots.
export function ProgressDots({ count, index }: { count: number; index: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 4, borderRadius: 2,
            width: i === index ? 20 : 4,
            background: i === index
              ? 'var(--onyx-accent)'
              : i < index ? 'rgba(var(--onyx-accent-r),var(--onyx-accent-g),var(--onyx-accent-b),0.4)' : 'rgba(255,255,255,0.16)',
            transition: 'width 0.25s, background 0.25s',
          }}
        />
      ))}
    </div>
  );
}
