import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Global Error Caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF6F0', color: '#2C1810', fontFamily: 'sans-serif', padding: '24px' }}>
          <div style={{ maxWidth: '480px', width: '100%', background: '#FFFDF9', padding: '24px', borderRadius: '16px', border: '1px solid #EADBCE', boxShadow: '0 10px 25px rgba(44, 24, 16, 0.08)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#9E2A2B' }}>UrbanFlow Engine Notice</h2>
            <p style={{ fontSize: '13px', color: '#7D5138', marginBottom: '16px' }}>{this.state.error?.message || "Application encountered an unexpected state."}</p>
            <button 
              onClick={() => window.location.reload()} 
              style={{ background: '#5C331E', color: '#FFFDF9', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
)
