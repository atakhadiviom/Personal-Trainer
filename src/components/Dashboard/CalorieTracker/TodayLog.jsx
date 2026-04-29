export const TodayLog = ({ entries, handleDeleteEntry }) => {
  if (entries.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid var(--border-card)',
      borderRadius: '8px',
      padding: '8px 12px',
      margin: '12px 0',
      flexShrink: 0
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
        Today's Log
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {entries.map((entry, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem'
          }}>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.meal}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                {entry.cals || 0} kcal • P:{entry.pro || 0}g C:{entry.carbs || 0}g F:{entry.fat || 0}g
              </span>
              <button
                onClick={() => handleDeleteEntry(index)}
                aria-label={`Delete ${entry.meal}`}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ff6b6b',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  padding: '0 2px',
                  lineHeight: '1',
                  flexShrink: 0
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodayLog;