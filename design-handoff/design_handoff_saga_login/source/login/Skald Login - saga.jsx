// Option C — "Saga": an editorial, literary take leaning into Skald's namesake
// (the Norse court poet). Split window: left is a gold-leaf manuscript panel with
// a display serif + verse; right is a quiet column of underline-only fields.

function SagaLogin() {
  const [scheme, setScheme] = React.useState(PREFILL.scheme);
  const [host, setHost] = React.useState(PREFILL.host);
  const [user, setUser] = React.useState(PREFILL.user);
  const [pass, setPass] = React.useState('');
  const [schemeOpen, setSchemeOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!host.trim()) return setError('A server address is required.');
    if (!user.trim()) return setError('Your name is required.');
    if (!pass) return setError('A passphrase is required.');
    setError(''); setPending(true);
    setTimeout(() => setPending(false), 1500);
  };

  const Field = ({ label, children }) => (
    <label style={{ display: 'block' }}>
      <div style={{ fontFamily: SKALD.serif, fontStyle: 'italic', fontSize: 13, color: SKALD.textDim, marginBottom: 7 }}>{label}</div>
      {children}
    </label>
  );
  const underline = {
    width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none',
    borderBottom: `1px solid ${SKALD.lineStrong}`, outline: 'none', color: SKALD.text,
    fontSize: 16, fontFamily: SKALD.serif, padding: '0 0 9px', letterSpacing: '0.01em',
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', fontFamily: SKALD.sans, color: SKALD.text, background: SKALD.bg, overflow: 'hidden' }}>
      <MiniTitlebar subtitle="Saga" />

      {/* LEFT — manuscript panel */}
      <div style={{ position: 'relative', width: 268, flexShrink: 0, overflow: 'hidden', borderRight: `1px solid ${SKALD.accentEdge}` }}>
        <Wash intensity={1.4} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.5, mixBlendMode: 'soft-light', pointerEvents: 'none', background: 'radial-gradient(120% 80% at 0% 0%, rgba(212,166,74,0.35), transparent 55%)' }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '54px 30px 30px' }}>
          <div>
            <div style={{ fontFamily: SKALD.mono, fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: SKALD.accent }}>Skald</div>
            <div style={{ width: 26, height: 1, background: SKALD.accentEdge, margin: '16px 0 18px' }} />
            <div style={{ fontFamily: SKALD.serif, fontSize: 33, lineHeight: 1.14, fontWeight: 600, letterSpacing: '-0.015em', color: SKALD.text }}>
              The teller<br />returns to<br />the <span style={{ fontStyle: 'italic', color: SKALD.accent }}>hall</span>.
            </div>
          </div>
          <div style={{ fontFamily: SKALD.serif, fontStyle: 'italic', fontSize: 13, lineHeight: 1.55, color: SKALD.textDim, maxWidth: 200 }}>
            “Every tale you keep awaits you here — bound, voiced, and ready to resume.”
            <div style={{ fontStyle: 'normal', fontFamily: SKALD.mono, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: SKALD.textMute, marginTop: 14 }}>— the keeper's note</div>
          </div>
        </div>
      </div>

      {/* RIGHT — the form */}
      <form onSubmit={submit} className="saga-card-in" style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '54px 44px 40px', zIndex: 10 }}>
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontFamily: SKALD.serif, fontSize: 27, fontWeight: 600, letterSpacing: '-0.01em' }}>Enter the hall</div>
          <div style={{ fontSize: 13, color: SKALD.textDim, marginTop: 6 }}>Connect to your library server to continue.</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Field label="Where is your server?">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              {/* scheme dropdown */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button type="button" onClick={() => setSchemeOpen(o => !o)} className="saga-scheme"
                  style={{ background: 'transparent', border: 'none', borderBottom: `1px solid ${SKALD.lineStrong}`, color: SKALD.accent, fontFamily: SKALD.serif, fontSize: 16, padding: '0 4px 9px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {scheme}:// <span style={{ fontSize: 10, color: SKALD.textMute, transform: schemeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
                </button>
                {schemeOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: SKALD.panel2, border: `1px solid ${SKALD.line}`, borderRadius: 8, boxShadow: '0 16px 32px rgba(0,0,0,0.5)', padding: 5, zIndex: 30, minWidth: 132 }}>
                    {['https', 'http'].map(s => (
                      <button key={s} type="button" onClick={() => { setScheme(s); setSchemeOpen(false); }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', background: s === scheme ? SKALD.accentDim : 'transparent', border: 'none', borderRadius: 5, padding: '8px 10px', cursor: 'pointer', fontFamily: SKALD.serif, fontSize: 14, color: s === scheme ? SKALD.accent : SKALD.text }}>
                        {s}://<span style={{ fontFamily: SKALD.mono, fontSize: 9, color: SKALD.textMute, letterSpacing: '0.06em' }}>{s === 'http' ? 'PLAIN' : 'TLS'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input style={{ ...underline, flex: 1 }} value={host} onChange={(e) => setHost(e.target.value)} placeholder="***REDACTED-HOST***:13378" spellCheck={false} />
            </div>
          </Field>

          <Field label="By what name are you known?">
            <input style={underline} value={user} onChange={(e) => setUser(e.target.value)} placeholder="username" spellCheck={false} />
          </Field>

          <Field label="Your passphrase">
            <input style={underline} type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••••" />
          </Field>
        </div>

        {error && <div style={{ fontFamily: SKALD.serif, fontStyle: 'italic', fontSize: 13, color: '#f1a89a', marginTop: 18 }}>{error}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 32 }}>
          <button type="submit" disabled={pending} className="saga-cta" style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: `linear-gradient(180deg, ${SKALD.accentBright}, ${SKALD.accent} 55%, ${SKALD.accentDeep})`,
            border: `1px solid ${SKALD.accentEdge}`, borderRadius: 999,
            color: '#1a1306', fontFamily: SKALD.serif, fontWeight: 600, fontSize: 15, padding: '11px 28px',
            cursor: pending ? 'wait' : 'pointer', letterSpacing: '0.01em',
            boxShadow: '0 8px 24px rgba(212,166,74,0.22), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}>
            {pending ? 'Opening…' : 'Enter'}
            <span style={{ display: 'flex', transition: 'transform 0.2s' }} className="saga-arrow">→</span>
          </button>
          <a href="#" onClick={(e) => e.preventDefault()} style={{ fontFamily: SKALD.serif, fontStyle: 'italic', fontSize: 13, color: SKALD.textDim, textDecoration: 'none' }}>I've forgotten my passphrase</a>
        </div>
      </form>
    </div>
  );
}

window.SagaLogin = SagaLogin;
