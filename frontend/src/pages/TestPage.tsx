export default function TestPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0f172a',
      color: 'white',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Test Page - No Dependencies
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
        If you can see this with dark background and white text, basic rendering works.
      </p>
      <div style={{ 
        backgroundColor: '#1e293b',
        padding: '1rem',
        borderRadius: '0.5rem',
        border: '1px solid #334155'
      }}>
        <p>This is a simple test component with inline styles.</p>
        <p>No Tailwind, no complex state, just HTML and inline CSS.</p>
      </div>
    </div>
  )
}
