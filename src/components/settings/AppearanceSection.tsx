import type { CSSProperties } from 'react';
import type { OnyxState } from '../../state/onyx';
import { SectionHead, Row, Toggle, Pill, MONO } from './shared';

export interface AppearanceSectionProps { st: OnyxState; }

const SCALE_OPTIONS: number[] = [90, 100, 110, 125];
const SORTS = [
  { id: 'recently',      label: 'Recently added' },
  { id: 'title',         label: 'Title'          },
  { id: 'author',        label: 'Author'         },
  { id: 'most-listened', label: 'Most listened'  },
];
const SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

// Small group heading between Rows (mono, uppercase).
const subHead: CSSProperties = {
  fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
  color: 'var(--onyx-text-mute)', margin: '30px 0 6px',
};

export default function AppearanceSection({ st }: AppearanceSectionProps) {
  const SWATCHES = ['#d4a64a', '#c96442', '#7aa86a', '#5a8fc4', '#a86a8e'];
  const currentHex = (st.accentColor || '').toLowerCase();

  return (
    <div>
      <SectionHead title="Appearance" subtitle="The look and feel of Skald — theme, and how your shelf is presented." />

      {/* ── App theme ── */}
      <Row label="Theme">
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'dark',   label: 'Onyx (dark)' },
            { id: 'light',  label: 'Folio (light)' },
            { id: 'system', label: 'System' },
          ].map(t => (
            <Pill key={t.id} active={st.theme === t.id} onClick={() => st.setTheme(t.id)}>{t.label}</Pill>
          ))}
        </div>
      </Row>
      <Row label="Accent color" hint="Used for active controls and progress. Applies live across the app.">
        <div style={{ display: 'flex', gap: 10 }}>
          {SWATCHES.map(c => {
            const active = c.toLowerCase() === currentHex;
            return (
              <button
                key={c}
                onClick={() => st.setAccentColor(c)}
                title={c}
                aria-label={`Set accent color ${c}`}
                style={{
                  width: 26, height: 26, borderRadius: 13, background: c, cursor: 'pointer',
                  border: active ? '2px solid #ebe7df' : '1px solid rgba(0,0,0,0.4)',
                  boxShadow: active ? `0 0 14px ${c}88` : 'none',
                  padding: 0, transition: 'transform 0.12s, box-shadow 0.15s',
                  transform: active ? 'scale(1.08)' : 'scale(1)',
                }}
              />
            );
          })}
        </div>
      </Row>
      <Row label="Interface scale" hint="Zooms the entire app. Useful on 4K displays or when reading from across the room.">
        <div style={{ display: 'flex', gap: 6 }}>
          {SCALE_OPTIONS.map(v => (
            <Pill key={v} active={v === st.scale} onClick={() => st.setScale(v)}>{v}%</Pill>
          ))}
        </div>
      </Row>
      <Row label="Translucent surfaces" hint="The glass effect on cards. Turn off for performance on older hardware.">
        <Toggle on={st.translucent} onChange={st.setTranslucent} />
      </Row>

      {/* ── Shelf presentation (moved here from Library → Display) ── */}
      <div style={subHead}>Shelf</div>
      <Row label="Default sort">
        <div style={{ display: 'flex', gap: 6 }}>
          {SORTS.map(s => (
            <Pill key={s.id} active={s.id === st.librarySort} onClick={() => st.setLibrarySort(s.id)}>{s.label}</Pill>
          ))}
        </div>
      </Row>
      <Row label="Cover size">
        <div style={{ display: 'flex', gap: 6 }}>
          {SIZES.map(v => (
            <Pill key={v} active={v === st.coverSize} onClick={() => st.setCoverSize(v)}>{v}</Pill>
          ))}
        </div>
      </Row>
      <Row label="Browse tile style" hint="How Series, Authors, Genres and the other shelf tabs present each group — fanned covers (Stack) or a 2×2 quilt (Mosaic).">
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'stack',  label: 'Stack' },
            { id: 'mosaic', label: 'Mosaic' },
          ].map(t => (
            <Pill key={t.id} active={st.browseTileStyle === t.id} onClick={() => st.setBrowseTileStyle(t.id as 'stack' | 'mosaic')}>{t.label}</Pill>
          ))}
        </div>
      </Row>
      <Row label="Group by series" hint="Stack series volumes under a single cover.">
        <Toggle on={st.groupBySeries} onChange={st.setGroupBySeries} />
      </Row>
      <Row label="Show finished titles" hint="Include books at 100% in the main grid.">
        <Toggle on={st.showFinished} onChange={st.setShowFinished} />
      </Row>
      <Row label="Show progress overlay" hint="The thin gold bar at the bottom of cover thumbnails.">
        <Toggle on={st.showProgressOverlay} onChange={st.setShowProgressOverlay} />
      </Row>

      {/* ── Optional shelf tabs (Home/Series/Authors/Collections are always shown) ── */}
      <div style={subHead}>Shelf tabs</div>
      <Row label="Narrators tab" hint="Show the Narrators tab on the library shelf.">
        <Toggle on={!!st.optionalTabs.narrators} onChange={v => st.setOptionalTab('narrators', v)} />
      </Row>
      <Row label="Genres tab" hint="Show the Genres tab on the library shelf.">
        <Toggle on={!!st.optionalTabs.genres} onChange={v => st.setOptionalTab('genres', v)} />
      </Row>
      <Row label="Publishers tab" hint="Show the Publishers tab on the library shelf.">
        <Toggle on={!!st.optionalTabs.publishers} onChange={v => st.setOptionalTab('publishers', v)} />
      </Row>
      <Row label="Playlists tab" hint="Show the Playlists tab on the library shelf.">
        <Toggle on={!!st.optionalTabs.playlists} onChange={v => st.setOptionalTab('playlists', v)} />
      </Row>
    </div>
  );
}
