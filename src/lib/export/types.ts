/**
 * Export Framework Types (REQ-VIEW-10, REQ-VIEW-12)
 *
 * Defines the contract for exportable view data. Any dashboard view can
 * expose "download what I see" functionality by constructing an ExportViewContext.
 */

/**
 * Supported export formats
 */
export type ExportFormat = 'xlsx' | 'pdf'

/**
 * Column data types for formatting hints
 */
export type ExportColumnType = 'string' | 'number' | 'date' | 'currency' | 'boolean'

/**
 * Defines a single exportable column
 */
export interface ExportColumn {
  /** Unique column identifier (used as key in ExportRow) */
  id: string
  /** Display label for column header */
  label: string
  /** Data type hint for formatting */
  type: ExportColumnType
  /** Optional custom formatter function */
  formatter?: (value: unknown) => string
  /** Column width hint (characters) for spreadsheet */
  width?: number
}

/**
 * A single row of exportable data
 * Keys correspond to ExportColumn.id values
 */
export type ExportRow = Record<string, string | number | boolean | null | undefined>

/**
 * Filter metadata for audit trail
 */
export interface ExportFilter {
  /** Filter field identifier */
  field: string
  /** Display label */
  label: string
  /** Current filter value */
  value: string
}

/**
 * Complete context for an exportable view
 * Consumer pages construct this to enable exports
 */
export interface ExportViewContext {
  /** Unique view identifier (e.g., 'event-participants-123') */
  id: string
  /** Display title for the export (e.g., 'Summer Camp Participants') */
  title: string
  /** Optional subtitle (e.g., event date range) */
  subtitle?: string
  /** Column definitions in display order */
  columns: ExportColumn[]
  /** Row data matching current filters/sort */
  rows: ExportRow[]
  /** Active filters for metadata inclusion */
  filters: ExportFilter[]
  /** Source route for audit trail */
  source: string
  /** Timestamp when context was created */
  timestamp: Date
}

/**
 * Export request passed to the service
 */
export interface ExportRequest {
  /** View context containing data to export */
  context: ExportViewContext
  /** Desired output format */
  format: ExportFormat
}

/**
 * Result from export operation
 */
export interface ExportResult {
  /** Whether export succeeded */
  success: boolean
  /** Generated filename */
  filename?: string
  /** Error message if failed */
  error?: string
}

/**
 * Formatter interface for pluggable format handlers
 */
export interface ExportFormatter {
  /** Format identifier */
  format: ExportFormat
  /** Generate export blob from context */
  generate: (context: ExportViewContext) => Promise<Blob>
  /** File extension (without dot) */
  extension: string
  /** MIME type for download */
  mimeType: string
}
