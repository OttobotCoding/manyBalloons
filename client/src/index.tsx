/**
 * client/src/index.tsx
 * React DOM entry point.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element with id "root" was not found in index.html');
}
const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* ─────────────────────────────────────────────────────────────────────────────
 * client/src/index.css
 * Global resets and base styles.
 * Save this content in a separate file: client/src/index.css
 * ─────────────────────────────────────────────────────────────────────────────

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
               'Helvetica Neue', Arial, sans-serif;
  color: #1a1a2e;
  background: #f8f9fa;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; }

button { font-family: inherit; }

input, select, textarea {
  font-family: inherit;
  font-size: inherit;
}

img { max-width: 100%; display: block; }

*/
