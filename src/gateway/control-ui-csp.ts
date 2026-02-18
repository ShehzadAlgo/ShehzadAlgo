export function buildControlUiCspHeader(): string {
  // Control UI: block framing, block inline scripts, keep styles permissive
  // (UI uses a lot of inline style attributes in templates).
  return [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self'",
    // Allow Google Fonts CSS and inline styles used by templates.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    // Allow fetching font binaries from Google font CDN.
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' ws: wss:",
  ].join("; ");
}
