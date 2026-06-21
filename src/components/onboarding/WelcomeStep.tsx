// Step 1 — Welcome. Brands the app, states the one-line value prop, and offers a
// single "Begin" CTA into the path chooser. (First-Launch Onboarding, Phase 1.)
import { GoldButton, SERIF, MONO } from './frame';

export interface WelcomeStepProps { onBegin: () => void; }

export default function WelcomeStep({ onBegin }: WelcomeStepProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(235,231,223,0.8)', fontFamily: SERIF, maxWidth: 460 }}>
        Skald plays your audiobooks — streamed from an{' '}
        <span style={{ color: 'var(--onyx-accent)', fontStyle: 'italic' }}>Audiobookshelf</span> server,
        kept as <span style={{ color: 'var(--onyx-accent)', fontStyle: 'italic' }}>local libraries</span> on this
        computer, or both at once. A few short steps and the hall is yours.
      </div>

      {/* Three at-a-glance capabilities — quiet mono labels, no chrome. */}
      <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
        {['Stream & sync', 'Listen offline', 'No server needed'].map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: 3, background: 'var(--onyx-accent)' }} />
            <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(235,231,223,0.55)' }}>{t}</span>
          </div>
        ))}
      </div>

      <div>
        <GoldButton onClick={onBegin}>Begin</GoldButton>
      </div>
    </div>
  );
}
