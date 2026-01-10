/**
 * Export Service Layer (REQ-VIEW-10, REQ-VIEW-12)
 *
 * Orchestrates export operations by dispatching to format-specific handlers.
 * Handles filename generation and browser download triggering.
 */

import type {
  ExportViewContext,
  ExportFormat,
  ExportResult,
  ExportFormatter,
} from './types'

/**
 * Registry of available formatters (populated by lazy imports)
 */
const formatters: Map<ExportFormat, () => Promise<ExportFormatter>> = new Map()

/**
 * Register a formatter factory for lazy loading
 */
export function registerFormatter(
  format: ExportFormat,
  factory: () => Promise<ExportFormatter>
): void {
  formatters.set(format, factory)
}

/**
 * Generate a filename for the export
 * Format: {viewId}-{YYYY-MM-DD-HHmmss}.{extension}
 */
export function generateFilename(viewId: string, extension: string): string {
  const sanitized = viewId
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') // Remove leading/trailing dashes
    .slice(0, 50)

  const now = new Date()
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')

  return `${sanitized}-${timestamp}.${extension}`
}

/**
 * Trigger browser download of a blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } finally {
    // Revoke after a short delay to ensure download starts
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

/**
 * Execute an export operation
 *
 * @param context - View context containing data to export
 * @param format - Desired output format
 * @returns Export result with success status and filename
 */
export async function executeExport(
  context: ExportViewContext,
  format: ExportFormat
): Promise<ExportResult> {
  const factory = formatters.get(format)
  if (!factory) {
    return {
      success: false,
      error: `Unsupported export format: ${format}`,
    }
  }

  if (context.rows.length === 0) {
    return {
      success: false,
      error: 'No data to export',
    }
  }

  try {
    // Lazy load the formatter
    const formatter = await factory()

    // Generate the export blob
    const blob = await formatter.generate(context)

    // Generate filename and trigger download
    const filename = generateFilename(context.id, formatter.extension)
    downloadBlob(blob, filename)

    return {
      success: true,
      filename,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed'
    console.error('[Export Service] Export failed:', error)
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Check if a format is supported
 */
export function isFormatSupported(format: ExportFormat): boolean {
  return formatters.has(format)
}

/**
 * Get list of supported formats
 */
export function getSupportedFormats(): ExportFormat[] {
  return Array.from(formatters.keys())
}
