import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * MSW Server
 * 
 * This configures Mock Service Worker for Node.js environments.
 * Used during testing (Jest) to intercept API calls.
 */
export const server = setupServer(...handlers)
