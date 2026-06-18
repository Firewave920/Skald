import { useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { save } from '@tauri-apps/plugin-dialog';
import lyreIcon from '../../assets/lyre.png';
import { SectionHead, Row, Pill, SERIF, MONO } from './shared';
import type { OnyxState } from '../../state/onyx';
import { readSkaldLog, openLogDir, writeTextFile, getLoggerData } from '../../api/abs';
import { log } from '../../lib/log';

export interface AboutSectionProps { st: OnyxState; }

const ghostBtn = {
  padding: '6px 14px', fontSize: 11, fontFamily: MONO, letterSpacing: '0.06em',
  textTransform: 'uppercase' as const, background: 'var(--onyx-glass)',
  border: '1px solid var(--onyx-glass-edge)', borderRadius: 6, color: 'var(--onyx-text-dim)', cursor: 'pointer',
} as const;

// Host-only server origin — keeps the URL out of the report but redacts any path/creds.
function hostOnly(url: string): string {
  try { return new URL(url).host || '(set)'; } catch { return url ? '(set)' : '(none)'; }
}

// Assemble the diagnostic bundle: environment + settings + Skald app log + the
// current-day Audiobookshelf server log, so a reader can correlate the two sides.
async function buildDiagnosticReport(st: OnyxState): Promise<string> {
  const L: string[] = [];
  L.push('=== Skald Diagnostic Report ===');
  L.push(`Generated: ${new Date().toISOString()}`);

  let appVer = '0.1.0';
  try { appVer = await getVersion(); } catch { /* non-tauri */ }

  L.push('', '--- Environment ---');
  L.push(`App version : ${appVer}`);
  L.push(`User agent  : ${navigator.userAgent}`);
  L.push(`Server      : ${hostOnly(st.serverUrl)}`);
  L.push(`Live sync   : ${localStorage.getItem('onyx.sync.live') === 'true' ? 'on' : 'off'}`);
  L.push(`Downloads   : ${st.downloads.length}`);
  L.push(`Account     : ${st.user?.type ?? 'unknown'}${st.isAdmin ? ' (admin)' : ''}`);

  L.push('', '--- Settings ---');
  L.push(`theme=${st.theme} accent=${st.accentColor} scale=${st.scale} translucent=${st.translucent}`);
  L.push(`librarySort=${st.librarySort} coverSize=${st.coverSize} groupBySeries=${st.groupBySeries}`);

  L.push('', '--- Skald app log (skald.log) ---');
  try {
    const sk = await readSkaldLog();
    L.push(sk.trim() === '' ? '(empty)' : sk.trimEnd());
  } catch (e) { L.push(`(unavailable: ${String(e)})`); }

  L.push('', '--- Audiobookshelf server log (current day, last 500) ---');
  if (!st.isAdmin) {
    L.push('(requires an admin account)');
  } else {
    try {
      const data = await getLoggerData(st.serverUrl);
      const rows = data.currentDailyLogs.slice(-500);
      L.push(rows.length ? rows.map(l => `${l.timestamp} ${l.levelName} ${l.message}`).join('\n') : '(none)');
    } catch (e) { L.push(`(unavailable: ${String(e)})`); }
  }

  return L.join('\n');
}

export default function AboutSection({ st }: AboutSectionProps) {
  const [report, setReport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const generate = async () => {
    setBusy(true);
    setStatus('');
    try {
      const text = await buildDiagnosticReport(st);
      setReport(text);
      setStatus(`Report ready — ${text.length.toLocaleString()} chars`);
      log.info('app', 'diagnostic report generated', { chars: text.length });
    } catch (e) {
      setStatus(`Failed to generate: ${String(e)}`);
      log.error('app', 'diagnostic report failed', { err: String(e) });
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!report) return;
    try { await navigator.clipboard.writeText(report); setStatus('Copied to clipboard'); }
    catch { setStatus('Copy failed — use Save instead'); }
  };

  const saveFile = async () => {
    if (!report) return;
    try {
      const path = await save({ defaultPath: 'skald-diagnostics.txt', filters: [{ name: 'Text', extensions: ['txt'] }] });
      if (!path) return;
      await writeTextFile(path, report);
      setStatus('Saved');
    } catch (e) { setStatus(`Save failed: ${String(e)}`); }
  };

  return (
    <div>
      <SectionHead title="About" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '0 0 24px', borderBottom: '1px solid var(--onyx-line)' }}>
        <img
          src={lyreIcon}
          alt="Skald"
          style={{ width: 64, height: 64, objectFit: 'contain', filter: 'drop-shadow(0 0 12px rgba(var(--onyx-accent-r), var(--onyx-accent-g), var(--onyx-accent-b), 0.3))' }}
        />
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500 }}>Skald<span style={{ color: 'var(--onyx-accent)' }}>.</span></div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: 'var(--onyx-text-mute)', marginTop: 2 }}>v0.1.0 · Onyx · alpha</div>
          <div style={{ fontSize: 12, color: 'var(--onyx-text-dim)', marginTop: 6, maxWidth: 480 }}>A native desktop client for Audiobookshelf.</div>
        </div>
      </div>

      <Row label="Check for updates" hint="Automatic checks run every 24h.">
        <button style={ghostBtn}>Check now</button>
      </Row>
      <Row label="Release channel">
        <div style={{ display: 'flex', gap: 6 }}>
          {['Stable', 'Beta', 'Nightly'].map((v, i) => (
            <Pill key={v} active={i === 1} onClick={() => {}}>{v}</Pill>
          ))}
        </div>
      </Row>
      <Row label="Open source licenses">
        <button style={ghostBtn}>View</button>
      </Row>

      {/* Diagnostic report — bundles Skald + server logs and environment for support. */}
      <Row label="Diagnostic report" hint="Bundles the Skald app log, the current-day server log, and environment/config — with secrets redacted — for sharing with support." align="top">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button style={{ ...ghostBtn, opacity: busy ? 0.6 : 1 }} onClick={() => void generate()} disabled={busy}>
              {busy ? 'Generating…' : 'Generate'}
            </button>
            <button style={{ ...ghostBtn, opacity: report ? 1 : 0.45 }} onClick={() => void copy()} disabled={!report}>Copy</button>
            <button style={{ ...ghostBtn, opacity: report ? 1 : 0.45 }} onClick={() => void saveFile()} disabled={!report}>Save</button>
            <button style={ghostBtn} onClick={() => { void openLogDir(); }}>Log folder</button>
          </div>
          {status && <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--onyx-text-mute)', letterSpacing: '0.04em' }}>{status}</div>}
        </div>
      </Row>
    </div>
  );
}
