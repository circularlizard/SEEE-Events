import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/**
 * MSW Browser Worker
 * 
 * This configures Mock Service Worker for browser environments.
 * Used during development to intercept API calls and return mock data.
 */
export const worker = setupWorker(...handlers)
