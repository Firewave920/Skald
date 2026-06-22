// Background "wash" for the Metadata Match window — two large blurred radial
// glows (a warm brass glow top-left, a deep amber glow bottom-right) sitting
// behind the panel content. pointerEvents:none so it never intercepts clicks.
// Extracted from the prototype's shared chrome; exported to window.

function MatchWash() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: '-15%', top: '-30%', width: '70%', height: '120%',
        background: 'radial-gradient(50% 50% at 50% 50%, rgba(212,166,74,0.10), transparent 65%)', filter: 'blur(80px)' }} />
      <div style={{ position: 'absolute', right: '-15%', bottom: '-30%', width: '65%', height: '90%',
        background: 'radial-gradient(50% 50% at 50% 50%, rgba(60,40,20,0.5), transparent 65%)', filter: 'blur(100px)' }} />
    </div>
  );
}

window.MatchWash = MatchWash;
