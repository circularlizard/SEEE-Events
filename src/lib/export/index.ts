/**
 * Export Framework Entry Point
 *
 * Registers formatters and re-exports public API.
 */

import { registerFormatter } from './service'

// Register formatters with lazy loading
registerFormatter('xlsx', async () => {
  const { createSpreadsheetFormatter } = await import('./formatters/spreadsheet')
  return createSpreadsheetFormatter()
})

registerFormatter('pdf', async () => {
  const { createPdfFormatter } = await import('./formatters/pdf')
  return createPdfFormatter()
})

// Re-export public API
export * from './types'
export {
  executeExport,
  generateFilename,
  isFormatSupported,
  getSupportedFormats,
} from './service'
