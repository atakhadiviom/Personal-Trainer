export const ChatArea = ({
  error,
  messages,
  loading,
  chatEndRef,
  input,
  setInput,
  handleSend
}) => {
  return (
    <>
      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {error && <div className="alert-box alert-warning" style={{ margin: '0 16px' }}>{error}</div>}
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            padding: '12px 16px',
            borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: msg.role === 'user' ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.06)',
            color: msg.role === 'user' ? '#000' : 'var(--text-primary)',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            border: msg.role === 'ai' ? '1px solid var(--border)' : 'none'
          }}>
            {msg.role === 'ai' && <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>NovaFit AI</span>}
            {msg.text.split('**').map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
          </div>
        ))}
        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '12px 16px',
            borderRadius: '16px 16px 16px 4px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border)',
            color: 'var(--text-dim)',
            fontSize: '0.9rem'
          }}>
            <span style={{ animation: 'pulse-glow 1.5s infinite' }}>🧠 Analyzing your food...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} style={{
        display: 'flex', gap: '8px', padding: '12px 0', borderTop: '1px solid var(--border)', flexShrink: 0
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="I just had 2 eggs and toast with butter..."
          disabled={loading}
          style={{ flex: 1, fontSize: '0.95rem' }}
        />
        <button type="submit" className="btn-primary" disabled={loading || !input.trim()} style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>
          {loading ? '...' : '📤 Send'}
        </button>
      </form>
    </>
  );
};

export default ChatArea;