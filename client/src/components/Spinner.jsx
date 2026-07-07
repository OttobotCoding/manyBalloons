/**
 * client/src/components/Spinner.jsx
 * Simple CSS loading spinner.
 */

export function Spinner({ size = 40 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
      <div
        style={{
          width: size,
          height: size,
          border: '4px solid #ede9ff',
          borderTop: '4px solid #6c47ff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default Spinner;