import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

function mount() {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    try {
      ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
      );
    } catch (err: any) {
      console.error('React Mount Error:', err);
      rootElement.innerHTML = `
        <div style="padding: 24px; color: #f87171; font-family: sans-serif; background: #0f172a; min-height: 100vh;">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">렌더링 오류 발생</h2>
          <pre style="background: #1e293b; padding: 12px; border-radius: 8px; font-size: 12px; overflow: auto;">${err?.message || err}</pre>
        </div>
      `;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
