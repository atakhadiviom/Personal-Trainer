import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 1. Log to console
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // 2. Here we could manually log to an external service like Firebase Crashlytics if available
    this.setState({ errorInfo });
  }

  resetBoundary = () => {
    this.setState({ hasError: false, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-espresso)', padding: '20px' }}>
          <div className="glass section-card" style={{ maxWidth: '600px', width: '100%', padding: '40px', borderTop: '4px solid var(--terracotta)' }}>
            <h1 className="super-title" style={{ fontSize: '2rem', color: 'var(--terracotta)', marginBottom: '16px' }}>System Crash.</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
              A fatal rendering error occurred in the application layer. This usually happens if the AI generated malformed JSON data, or if you lost internet connection during a critical save.
            </p>
            
            <button className="btn-primary" onClick={this.resetBoundary} style={{ width: '100%', marginBottom: '16px' }}>
              REBOOT SYSTEM
            </button>

            {this.state.errorInfo && (
              <details style={{ background: 'rgba(0,0,0,0.5)', padding: '16px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                <summary>View Technical Stack Trace</summary>
                <div style={{ marginTop: '12px', whiteSpace: 'pre-wrap' }}>
                  {this.state.errorInfo.componentStack}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
