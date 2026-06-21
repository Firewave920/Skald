// Step 6 — All set. Summarises what was configured and offers the entry CTA into
// the library. The actual gate-close (setOnboarded / setLocalMode / setScreen) is
// performed by the host's finish handler. (First-Launch Onboarding, Phase 1.)
import type { OnyxState } from '../../state/onyx';
import type { Library } from '../../api/abs';
import type { OnboardingPath } from './ChoosePathStep';
import { GoldButton, SERIF, MONO } from './frame';

export interface DoneStepProps {
  st: OnyxState;
  path: OnboardingPath | null;
  created: Library | null;
  onFinish: () => void;
}

export default function DoneStep({ st, path, created, onFinish }: DoneStepProps) {
  // Build the summary from what actually happened, not just the chosen path, so a
  // skipped sub-step doesn't claim something that wasn't done.
  const lines: { label: string; value: string }[] = [];
  if (st.authToken) lines.push({ label: 'Server', value: st.serverUrl });
  if (created)      lines.push({ label: 'Local library', value: created.name });
  if (lines.length === 0) {
    lines.push({ label: 'Mode', value: 'Local — add a library any time in Settings' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lines.map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ color: 'var(--onyx-accent)', fontSize: 15 }}>✓</span>
            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(235,231,223,0.45)', width: 110, flexShrink: 0 }}>{l.label}</span>
            <span style={{ fontFamily: SERIF, fontSize: 14.5, color: '#ebe7df', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.value}</span>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: 'rgba(235,231,223,0.6)', maxWidth: 440, lineHeight: 1.55 }}>
        {path === 'abs'
          ? 'Your collection is ready. Press in and pick up where the telling left off.'
          : 'The hall is ready. Open it and begin.'}
      </div>

      <div><GoldButton onClick={onFinish}>Enter the library</GoldButton></div>
    </div>
  );
}
