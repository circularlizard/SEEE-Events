import '@testing-library/jest-dom'

// Polyfill for Pino in Node test environment
if (typeof setImmediate === 'undefined') {
  (global as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) =>
    setTimeout(fn, 0, ...args)
}// Polyfill Web Fetch API for NextRequest usage in tests
try {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { fetch, Request, Response, Headers } = require('undici')
	// Assign if not present
	if (!(global as any).fetch) (global as any).fetch = fetch
	if (!(global as any).Request) (global as any).Request = Request
	if (!(global as any).Response) (global as any).Response = Response
	if (!(global as any).Headers) (global as any).Headers = Headers
} catch {
	// ignore if undici not available
}

// MSW setup is only imported in integration tests that need it
// This avoids issues with Response not being defined in Node environment for unit tests
