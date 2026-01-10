/**
 * Spreadsheet Formatter (REQ-VIEW-10)
 *
 * Generates XLSX exports using SheetJS (xlsx library).
 * Lazy-loaded to avoid bundling the library unless needed.
 */

import type { ExportViewContext, ExportFormatter, ExportColumn } from '../types'

/**
 * Estimate column width based on content
 */
function estimateColumnWidth(column: ExportColumn, rows: ExportViewContext['rows']): number {
  // Start with header length
  let maxLen = column.label.length

  // Sample rows for content width (limit to first 100 for performance)
  const sampleRows = rows.slice(0, 100)
  for (const row of sampleRows) {
    const value = row[column.id]
    const len = value != null ? String(value).length : 0
    if (len > maxLen) maxLen = len
  }

  // Use explicit width if provided, otherwise estimate
  if (column.width) return column.width

  // Clamp between 8 and 50 characters
  return Math.min(50, Math.max(8, maxLen + 2))
}

/**
 * Format a cell value based on column type
 */
function formatCellValue(
  value: unknown,
  column: ExportColumn
): string | number | boolean | null {
  if (value == null) return null

  // Use custom formatter if provided
  if (column.formatter) {
    return column.formatter(value)
  }

  switch (column.type) {
    case 'number':
    case 'currency':
      const num = Number(value)
      return Number.isFinite(num) ? num : String(value)
    case 'boolean':
      return Boolean(value)
    case 'date':
    case 'string':
    default:
      return String(value)
  }
}

/**
 * Create the spreadsheet formatter
 */
export async function createSpreadsheetFormatter(): Promise<ExportFormatter> {
  // Lazy load xlsx library
  const XLSX = await import('xlsx')

  const formatter: ExportFormatter = {
    format: 'xlsx',
    extension: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    async generate(context: ExportViewContext): Promise<Blob> {
      const { columns, rows, title, subtitle, filters } = context

      // Build header row
      const headers = columns.map((col) => col.label)

      // Build data rows
      const dataRows = rows.map((row) =>
        columns.map((col) => formatCellValue(row[col.id], col))
      )

      // Create worksheet data
      const wsData: (string | number | boolean | null)[][] = []

      // Add title row
      wsData.push([title])

      // Add subtitle if present
      if (subtitle) {
        wsData.push([subtitle])
      }

      // Add filter info if present
      if (filters.length > 0) {
        const filterText = filters
          .map((f) => `${f.label}: ${f.value}`)
          .join(' | ')
        wsData.push([`Filters: ${filterText}`])
      }

      // Add empty row before data
      wsData.push([])

      // Add headers and data
      wsData.push(headers)
      wsData.push(...dataRows)

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData)

      // Set column widths
      const colWidths = columns.map((col) => ({
        wch: estimateColumnWidth(col, rows),
      }))
      ws['!cols'] = colWidths

      // Create workbook
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Export')

      // Generate buffer
      const buffer = XLSX.write(wb, {
        type: 'array',
        bookType: 'xlsx',
      })

      return new Blob([buffer], {
        type: formatter.mimeType,
      })
    },
  }

  return formatter
}
