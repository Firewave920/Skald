// First-launch onboarding host (First-Launch Onboarding roadmap, Phase 1).
// A small linear step machine shown once on first launch (and re-openable from
// Settings → About → "Run setup again"). It branches on the chosen path —
//   ABS-only   : welcome, choose, connect, folders, done
//   Local-only : welcome, choose, create,  addbooks, done
//   Both       : welcome, choose, connect, folders, create, addbooks, done
// — and never blocks the user from reaching an empty-but-usable app: every step
// is skippable, and finishing simply sets authToken / localMode so App.tsx's gate
// opens. Skip defaults to local-only (Resolved decisions #3).
import { useEffect, useMemo, useState } from 'react';
import type { OnyxState } from '../state/onyx';
import type { Library } from '../api/abs';
import { log } from '../lib/log';
import StepFrame, { ProgressDots, GhostButton, MONO } from '../components/onboarding/frame';
import WelcomeStep from '../components/onboarding/WelcomeStep';
import ChoosePathStep, { type OnboardingPath } from '../components/onboarding/ChoosePathStep';
import AbsConnectStep from '../components/onboarding/AbsConnectStep';
import AbsFoldersStep from '../components/onboarding/AbsFoldersStep';
import CreateLocalStep from '../components/onboarding/CreateLocalStep';
import AddBooksStep from '../components/onboarding/AddBooksStep';
import DoneStep from '../components/onboarding/DoneStep';

export interface OnboardingProps { st: OnyxState; }

type StepKey = 'welcome' | 'choose' | 'connect' | 'folders' | 'create' | 'addbooks' | 'done';

export default function Onboarding({ st }: OnboardingProps) {
  const [index, setIndex] = useState(0);
  const [path, setPath] = useState<OnboardingPath | null>(null);
  // The local library created during this run (if any) — threaded into the
  // AddBooks + Done steps so they can act on / summarise it.
  const [created, setCreated] = useState<Library | null>(null);

  // Boundary diagnostic: the flow opened (fresh launch or "Run setup again").
  // Records whether the user already has a server / local mode, which determines
  // how the connect step behaves (re-login vs. "already connected").
  useEffect(() => {
    log.info('app', 'onboarding shown', { hasServer: !!st.authToken, localMode: st.localMode });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive the active branch's step sequence from the chosen path. Before a path
  // is chosen it is just welcome → choose (→ done is unreachable until then).
  const sequence = useMemo<StepKey[]>(() => {
    const seq: StepKey[] = ['welcome', 'choose'];
    if (path === 'abs' || path === 'both')   seq.push('connect', 'folders');
    if (path === 'local' || path === 'both') seq.push('create', 'addbooks');
    seq.push('done');
    return seq;
  }, [path]);

  // Clamp the pointer in case the sequence shrank (e.g. path changed). The current
  // step is always derived from the live sequence so navigation stays consistent.
  const safeIndex = Math.min(index, sequence.length - 1);
  const step = sequence[safeIndex];

  const goNext = () => setIndex(i => Math.min(i + 1, sequence.length - 1));
  const goBack = () => setIndex(i => Math.max(i - 1, 0));

  // Record the chosen path and advance. Re-choosing resets downstream artifacts so
  // a switched branch never carries stale state into Done's summary.
  const choose = (p: OnboardingPath) => {
    if (p !== path) { setPath(p); if (p === 'abs') setCreated(null); }
    log.info('app', 'onboarding path chosen', { path: p });
    setIndex(i => i + 1);
  };

  // Finish the flow cleanly: mark onboarded, ensure the gate opens (localMode when
  // there is no server session), and drop into the library.
  const finish = (skipped: boolean) => {
    if (!st.authToken) st.setLocalMode(true);
    st.setOnboarded(true);
    st.setScreen('library');
    if (skipped) {
      log.info('app', 'onboarding skipped', { atStep: step });
      if (!st.authToken) {
        st.setToast({ message: 'You can connect a server any time in Settings → Server.', type: 'info' });
      }
    } else {
      log.info('app', 'onboarding completed', { path });
    }
  };

  // ── Footer chrome (Back / dots / Skip), shared across steps ────────────────
  // Progress dots count only the real branch steps (welcome is the cover, done
  // is the close), so the indicator reflects "how far through setup" intuitively.
  // Explicit StepKey[] annotation: TS 5.5 would otherwise infer a type predicate
  // from `s !== 'welcome'` and narrow the element type, breaking indexOf(step).
  const branchSteps: StepKey[] = sequence.filter(s => s !== 'welcome');
  const dotIndex = Math.max(0, branchSteps.indexOf(step));
  const footer = (
    <>
      <div style={{ minWidth: 80 }}>
        {safeIndex > 0 && step !== 'done' && (
          <button
            type="button"
            onClick={goBack}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(235,231,223,0.5)', padding: '6px 4px' }}
          >
            ← Back
          </button>
        )}
      </div>
      {step !== 'welcome' && <ProgressDots count={branchSteps.length} index={dotIndex} />}
      <div style={{ minWidth: 80, display: 'flex', justifyContent: 'flex-end' }}>
        {step !== 'done' && <GhostButton onClick={() => finish(true)}>Skip setup</GhostButton>}
      </div>
    </>
  );

  // ── Per-step header copy + body ────────────────────────────────────────────
  const eyebrow = step === 'welcome'
    ? 'Welcome'
    : `Step ${dotIndex + 1} of ${branchSteps.length}`;

  const header: Record<StepKey, { title: React.ReactNode; subtitle?: React.ReactNode }> = {
    welcome:  { title: <>Welcome to <span style={{ fontStyle: 'italic', color: 'var(--onyx-accent)' }}>Skald</span></> },
    choose:   { title: 'How will you use Skald?', subtitle: 'Pick one — you can add the other later in Settings.' },
    connect:  { title: 'Connect to Audiobookshelf', subtitle: 'Enter your server address and sign in with an API key or password.' },
    folders:  { title: 'Where downloads live', subtitle: 'Choose where offline copies are stored on this computer.' },
    create:   { title: 'Create a local library', subtitle: 'Skald builds a managed folder from audiobooks on this PC — no server needed.' },
    addbooks: { title: 'Getting books in', subtitle: 'Two ways to add books to a local library.' },
    done:     { title: 'You’re all set', subtitle: undefined },
  };

  const body = (() => {
    switch (step) {
      case 'welcome':  return <WelcomeStep onBegin={goNext} />;
      case 'choose':   return <ChoosePathStep value={path} onChoose={choose} />;
      case 'connect':  return <AbsConnectStep st={st} onConnected={goNext} />;
      case 'folders':  return <AbsFoldersStep st={st} onContinue={goNext} />;
      case 'create':   return <CreateLocalStep st={st} created={created} onCreated={(lib) => { setCreated(lib); goNext(); }} onSkip={goNext} />;
      case 'addbooks': return <AddBooksStep st={st} library={created} onContinue={goNext} />;
      case 'done':     return <DoneStep st={st} path={path} created={created} onFinish={() => finish(false)} />;
    }
  })();

  return (
    <StepFrame
      stepKey={step}
      eyebrow={eyebrow}
      title={header[step].title}
      subtitle={header[step].subtitle}
      footer={footer}
    >
      {body}
    </StepFrame>
  );
}
