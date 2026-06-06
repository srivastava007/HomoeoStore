export default function ComingSoon({ title }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: '16px', color: '#4b5563'
    }}>
      <div style={{ fontSize: '48px' }}>🚧</div>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
        {title || 'Under Development'}
      </h1>
      <p style={{ fontSize: '14px', maxWidth: '400px', textAlign: 'center', lineHeight: '1.5' }}>
        This module is currently under development. It will be available in a future update.
      </p>
    </div>
  )
}
