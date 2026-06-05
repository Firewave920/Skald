// Option B — "Side-by-Side": a real diff. Current column vs Result column,
// aligned by field. An accept toggle picks current-vs-incoming as the base,
// and every result is *editable* — click the pencil to type a custom value,
// so the user can fix the match before saving. A filter shows "changes only"
// (default) or every field. Best for careful comparison + correction.

const normVal = (v) => Array.isArray(v) ? v.join('\u0000') : (v == null ? '' : v.toString().trim());

// Read-only renderer for a value, used in both the Current and Result cells.
function ValueCell({ field, side, value, dim, strike }) {
  const empty = (Array.isArray(value) ? value.length === 0 : !value);
  if (field.type === 'cover') {
    return <MiniCover variant={side === 'current' ? 'sam-old' : 'sam-new'} size={46} />;
  }
  if (field.type === 'chips') {
    if (empty) return <span style={{ fontSize: 11, color: ONYX.textMute, fontStyle: 'italic' }}>none</span>;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {value.map((t, i) => (
          <span key={i} style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 20,
            color: dim ? ONYX.textMute : ONYX.textDim, background: ONYX.glass,
            border: `1px solid ${ONYX.line}` }}>{t}</span>
        ))}
      </div>
    );
  }
  if (empty) {
    return <span style={{ fontSize: 12, color: ONYX.textMute, fontStyle: 'italic',
      fontFamily: ONYX.sans }}>empty</span>;
  }
  const isLong = field.type === 'longtext';
  return (
    <span style={{ fontSize: isLong ? 11.5 : 12.5, lineHeight: isLong ? 1.45 : 1.3,
      fontFamily: field.type === 'mono' ? ONYX.mono : ONYX.sans,
      color: dim ? ONYX.textMute : ONYX.textDim,
      textDecoration: strike ? 'line-through' : 'none', textDecorationColor: 'rgba(235,231,223,0.25)',
      display: '-webkit-box', WebkitLineClamp: isLong ? 4 : 2, WebkitBoxOrient: 'vertical',
      overflow: 'hidden' }}>{value}</span>
  );
}

// Inline editor for the Result cell. Manages its own draft; commits on Save /
// Enter, discards on Cancel / Esc. chips edit as a comma-separated list.
function EditField({ field, value, onSave, onCancel }) {
  const initial = field.type === 'chips' ? (value || []).join(', ') : (value == null ? '' : value);
  const [draft, setDraft] = React.useState(initial);
  const ref = React.useRef(null);
  React.useEffect(() => { if (ref.current) { ref.current.focus(); ref.current.select && ref.current.select(); } }, []);

  const commit = () => {
    const out = field.type === 'chips'
      ? draft.split(',').map(s => s.trim()).filter(Boolean)
      : draft;
    onSave(out);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    else if (e.key === 'Enter' && (field.type !== 'longtext' || e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', background: ONYX.panel2,
    border: `1px solid ${ONYX.accentEdge}`, borderRadius: 6, color: ONYX.text,
    fontFamily: field.type === 'mono' ? ONYX.mono : ONYX.sans,
    fontSize: field.type === 'longtext' ? 11.5 : 12.5, lineHeight: 1.4,
    padding: '7px 9px', outline: 'none', resize: 'vertical',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {field.type === 'longtext' ? (
        <textarea ref={ref} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKey}
          rows={4} style={inputStyle} />
      ) : (
        <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKey}
          style={inputStyle} placeholder={field.type === 'chips' ? 'comma, separated, tags' : ''} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={commit} style={{ display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
          background: ONYX.accent, color: ONYX.bg, fontFamily: ONYX.mono, fontSize: 9.5,
          letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
          <Glyph name="check" size={11} color={ONYX.bg} sw={2} />Save</button>
        <button onClick={onCancel} style={{ padding: '4px 10px', borderRadius: 6,
          border: `1px solid ${ONYX.glassEdge}`, cursor: 'pointer', background: 'transparent',
          color: ONYX.textDim, fontFamily: ONYX.mono, fontSize: 9.5, letterSpacing: '0.05em',
          textTransform: 'uppercase' }}>Cancel</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: ONYX.mono, fontSize: 8.5, color: ONYX.textMute, letterSpacing: '0.04em' }}>
          {field.type === 'longtext' ? '⌘↵ save · esc' : '↵ save · esc'}</span>
      </div>
    </div>
  );
}

function CompareRow({ field, base, resolved, edited, applied, editing,
                     onToggle, onStartEdit, onSaveEdit, onCancelEdit, onRevert }) {
  const changed = field.status !== 'same';
  const accent = field.status === 'added' ? ONYX.add : ONYX.accent;
  // tint of the result cell when it will change the item
  const tintBg = !applied ? 'transparent'
    : edited ? 'rgba(255,255,255,0.05)'
    : field.status === 'added' ? ONYX.addDim : 'rgba(212,166,74,0.07)';
  const tintBar = edited ? ONYX.textDim : accent;
  const canEdit = field.type !== 'cover';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '78px 1fr 38px 1fr',
      alignItems: editing ? 'start' : 'center',
      gap: 0, borderBottom: `1px solid ${ONYX.line}`, minHeight: 50 }}>
      {/* label */}
      <div style={{ padding: '12px 10px 12px 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontFamily: ONYX.mono, fontSize: 9, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: (changed || edited) ? ONYX.textDim : ONYX.textMute, lineHeight: 1.2 }}>{field.label}</span>
        {edited ? <StatusTag status="edited" style={{ alignSelf: 'flex-start' }} />
          : changed && <StatusTag status={field.status} style={{ alignSelf: 'flex-start' }} />}
      </div>
      {/* current */}
      <div style={{ padding: '12px 14px', minWidth: 0 }}>
        <ValueCell field={field} side="current" value={field.current} dim strike={applied} />
      </div>
      {/* accept toggle / revert */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: editing ? 12 : 0 }}>
        {edited ? (
          <button onClick={onRevert} title="Revert to source value" style={{
            width: 26, height: 26, borderRadius: 13, cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: `1.5px solid ${ONYX.lineStrong}` }}>
            <Glyph name="revert" size={13} color={ONYX.textDim} />
          </button>
        ) : changed ? (
          <button onClick={onToggle} title={base === 'incoming' ? 'Using new value' : 'Keeping current'} style={{
            width: 26, height: 26, borderRadius: 13, cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: base === 'incoming' ? accent : 'transparent',
            border: `1.5px solid ${base === 'incoming' ? accent : ONYX.lineStrong}`, transition: 'all .12s' }}>
            <Glyph name={base === 'incoming' ? 'check' : 'right'} size={13} color={base === 'incoming' ? ONYX.bg : ONYX.textMute} sw={2} />
          </button>
        ) : (
          <Glyph name="check" size={12} color={ONYX.textMute} />
        )}
      </div>
      {/* result (editable) */}
      <div style={{ padding: editing ? '10px 16px 12px 14px' : '12px 16px 12px 14px', minWidth: 0,
        alignSelf: 'stretch', display: 'flex', alignItems: editing ? 'stretch' : 'center', gap: 8,
        background: editing ? 'transparent' : tintBg,
        boxShadow: (!editing && applied) ? `inset 2px 0 0 ${tintBar}` : 'none' }}>
        {editing ? (
          <EditField field={field} value={resolved} onSave={onSaveEdit} onCancel={onCancelEdit} />
        ) : (
          <React.Fragment>
            <div style={{ minWidth: 0, flex: 1 }}>
              <ValueCell field={field} side="incoming" value={resolved} dim={!applied && !edited} />
            </div>
            {canEdit && (
              <button onClick={onStartEdit} title="Edit value" style={{ background: 'none', border: 'none',
                cursor: 'pointer', padding: 3, marginRight: -3, display: 'flex', color: ONYX.textMute,
                flexShrink: 0, alignSelf: 'flex-start' }}
                onMouseEnter={e => e.currentTarget.style.color = ONYX.accent}
                onMouseLeave={e => e.currentTarget.style.color = ONYX.textMute}>
                <Glyph name="edit" size={13} />
              </button>
            )}
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

function OptionB() {
  const [base, setBase] = React.useState(() =>
    Object.fromEntries(CHANGED_FIELDS.map(f => [f.key, 'incoming'])));   // 'incoming' | 'current'
  const [edits, setEdits] = React.useState({});                          // key -> custom value
  const [editingKey, setEditingKey] = React.useState(null);
  const [onlyChanges, setOnlyChanges] = React.useState(true);

  // The value that will be saved for a field.
  const resolve = (f) => {
    if (edits[f.key] !== undefined) return edits[f.key];
    if (f.status === 'same') return f.current;
    return base[f.key] === 'incoming' ? f.incoming : f.current;
  };
  const isEdited = (f) => edits[f.key] !== undefined && normVal(edits[f.key]) !== normVal(f.incoming);
  const isApplied = (f) => normVal(resolve(f)) !== normVal(f.current);

  const toggle = (k) => setBase(b => ({ ...b, [k]: b[k] === 'incoming' ? 'current' : 'incoming' }));
  const saveEdit = (k, v) => { setEdits(e => ({ ...e, [k]: v })); setEditingKey(null); };
  const revert = (k) => setEdits(e => { const n = { ...e }; delete n[k]; return n; });

  const visible = onlyChanges ? CHANGED_FIELDS : FIELDS;
  const appliedCount = FIELDS.filter(isApplied).length;
  const editedCount = FIELDS.filter(isEdited).length;
  const allOn = CHANGED_FIELDS.every(f => base[f.key] === 'incoming' && edits[f.key] === undefined);

  const acceptAll = () => {
    if (allOn) { setBase(Object.fromEntries(CHANGED_FIELDS.map(f => [f.key, 'current']))); }
    else {
      setBase(Object.fromEntries(CHANGED_FIELDS.map(f => [f.key, 'incoming'])));
      setEdits({}); setEditingKey(null);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', background: ONYX.bg, color: ONYX.text,
      fontFamily: ONYX.sans, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <MatchWash />
      {/* header */}
      <div style={{ position: 'relative', padding: '16px 18px 0', borderBottom: `1px solid ${ONYX.line}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 14 }}>
          <button style={{ background: 'none', border: 'none', color: ONYX.textDim, cursor: 'pointer',
            padding: 4, marginLeft: -4, display: 'flex' }} title="Back"><Glyph name="back" size={17} /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: ONYX.serif, fontSize: 19, fontWeight: 600, lineHeight: 1.1 }}>Review Match</div>
            <div style={{ fontFamily: ONYX.mono, fontSize: 10, color: ONYX.textMute, marginTop: 5, letterSpacing: '0.04em' }}>
              {MATCH_SOURCE.name} · {Math.round(MATCH_SOURCE.confidence * 100)}% match · {CHANGED_FIELDS.length} differ · edit any field</div>
          </div>
          {/* segmented filter */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 3,
            border: `1px solid ${ONYX.line}` }}>
            {[['Changes', true], ['All fields', false]].map(([lbl, v]) => (
              <button key={lbl} onClick={() => setOnlyChanges(v)} style={{
                padding: '5px 11px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontFamily: ONYX.mono, fontSize: 9.5, letterSpacing: '0.05em', textTransform: 'uppercase',
                background: onlyChanges === v ? ONYX.accentDim : 'transparent',
                color: onlyChanges === v ? ONYX.accent : ONYX.textMute, transition: 'all .12s' }}>{lbl}</button>
            ))}
          </div>
          <button style={{ background: 'none', border: 'none', color: ONYX.textDim, cursor: 'pointer',
            padding: 4, marginRight: -4, display: 'flex' }} title="Close"><Glyph name="close" size={16} /></button>
        </div>
        {/* column heads */}
        <div style={{ display: 'grid', gridTemplateColumns: '78px 1fr 38px 1fr', alignItems: 'center' }}>
          <span />
          <span style={{ padding: '8px 14px', fontFamily: ONYX.mono, fontSize: 9, letterSpacing: '0.12em',
            color: ONYX.textMute }}>CURRENT</span>
          <span />
          <span style={{ padding: '8px 16px', fontFamily: ONYX.mono, fontSize: 9, letterSpacing: '0.12em',
            color: ONYX.accent, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Glyph name="sparkle" size={9} color={ONYX.accent} />RESULT
            <span style={{ color: ONYX.textMute, letterSpacing: '0.04em' }}>· editable</span></span>
        </div>
      </div>

      {/* rows */}
      <div style={{ position: 'relative', flex: 1, overflowY: 'auto' }}>
        {visible.map(f => (
          <CompareRow key={f.key} field={f}
            base={base[f.key]} resolved={resolve(f)} edited={isEdited(f)} applied={isApplied(f)}
            editing={editingKey === f.key}
            onToggle={() => toggle(f.key)}
            onStartEdit={() => setEditingKey(f.key)}
            onSaveEdit={(v) => saveEdit(f.key, v)}
            onCancelEdit={() => setEditingKey(null)}
            onRevert={() => revert(f.key)} />
        ))}
        {onlyChanges && (
          <div style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Glyph name="check" size={12} color={ONYX.textMute} />
            <span style={{ fontFamily: ONYX.mono, fontSize: 10, color: ONYX.textMute, letterSpacing: '0.05em' }}>
              {SAME_FIELDS.length} more fields already match</span>
            <button onClick={() => setOnlyChanges(false)} style={{ background: 'none', border: 'none',
              color: ONYX.accent, cursor: 'pointer', fontFamily: ONYX.mono, fontSize: 10, letterSpacing: '0.05em' }}>
              show all</button>
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{ position: 'relative', padding: '12px 18px', borderTop: `1px solid ${ONYX.line}`,
        display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(8,8,11,0.6)' }}>
        <div onClick={acceptAll}
          style={{ display: 'flex', alignItems: 'center', gap: 7,
            cursor: 'pointer', fontFamily: ONYX.mono, fontSize: 10, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: allOn ? ONYX.accent : ONYX.textDim }}>
          <Check on={allOn} onClick={() => {}} size={15} /> Accept all
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: ONYX.textMute }}>
          <strong style={{ color: ONYX.text, fontWeight: 600 }}>{appliedCount}</strong> change{appliedCount === 1 ? '' : 's'}
          {editedCount > 0 && <span style={{ color: ONYX.textMute }}> · {editedCount} edited</span>}</span>
        <button style={{ padding: '9px 18px', borderRadius: 8, background: 'transparent',
          border: `1px solid ${ONYX.glassEdge}`, color: ONYX.textDim, cursor: 'pointer',
          fontFamily: ONYX.sans, fontSize: 13 }}>Cancel</button>
        <button style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: appliedCount ? ONYX.accent : ONYX.glassStrong,
          color: appliedCount ? ONYX.bg : ONYX.textMute, fontFamily: ONYX.sans, fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 7 }}>
          <Glyph name="check" size={14} color={appliedCount ? ONYX.bg : ONYX.textMute} sw={2} />
          Apply {appliedCount}
        </button>
      </div>
    </div>
  );
}

window.OptionB = OptionB;
