/**
 * client/src/setupProxy.js
 * Configures the dev server proxy to forward API and upload requests
 * to the Express backend. This file is automatically picked up by
 * react-scripts - no import needed.
 */

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    const base = 'http://localhost:5000';

    // NOTE: with http-proxy-middleware v4, app.use('/api', ...) strips the
    // '/api' prefix from the request before the proxy ever sees it, so the
    // target must include that prefix back on the end — otherwise every
    // request arrives at the backend without '/api' and 404s (e.g.
    // '/api/auth/setup-status' becomes '/auth/setup-status').
    app.use('/api', createProxyMiddleware({
        target: `${base}/api`,
        changeOrigin: true,
        onError: (err, req, res) => {
            console.error('[proxy] error:', err.message, 'for', req.url);
            res.status(500).json({ error: 'Proxy error', message: err.message });
        },
    }));

    // Forward /uploads requests so profile photos load in the development
    // server too — same fix applies here.
    app.use('/uploads', createProxyMiddleware({
        target: `${base}/uploads`,
        changeOrigin: true,
    }));
};