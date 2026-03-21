export default function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-lg)',
    }}>
      <img
        src="/loading.gif"
        alt="Loading…"
        style={{
          width: 160,
          height: 160,
          objectFit: 'contain',
          borderRadius: 'var(--radius-xl)',
          mixBlendMode: 'multiply',
          filter: 'brightness(1.08)',
        }}
      />
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '1rem',
        color: 'var(--text-muted)',
        letterSpacing: '0.06em',
        fontStyle: 'italic',
      }}>
        loading…
      </p>
    </div>
  )
}
