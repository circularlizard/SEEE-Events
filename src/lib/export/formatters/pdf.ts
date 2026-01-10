/**
 * PDF Formatter (REQ-VIEW-12)
 *
 * Generates PDF exports using jsPDF with autoTable plugin.
 * Lazy-loaded to avoid bundling the library unless needed.
 */

import type { ExportViewContext, ExportFormatter, ExportColumn } from '../types'

/**
 * Format a cell value for PDF display
 */
function formatCellValue(value: unknown, column: ExportColumn): string {
  if (value == null) return '—'

  // Use custom formatter if provided
  if (column.formatter) {
    return column.formatter(value)
  }

  switch (column.type) {
    case 'currency':
      const num = Number(value)
      return Number.isFinite(num) ? `£${num.toFixed(2)}` : String(value)
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'number':
    case 'date':
    case 'string':
    default:
      return String(value)
  }
}

/**
 * Create the PDF formatter
 */
export async function createPdfFormatter(): Promise<ExportFormatter> {
  // Lazy load jsPDF and autoTable
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const formatter: ExportFormatter = {
    format: 'pdf',
    extension: 'pdf',
    mimeType: 'application/pdf',

    async generate(context: ExportViewContext): Promise<Blob> {
      const { columns, rows, title, subtitle, filters } = context

      // Create PDF document (A4 landscape for tables)
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      // Add title
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(title, 14, 15)

      let yOffset = 22

      // Add subtitle if present
      if (subtitle) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(subtitle, 14, yOffset)
        yOffset += 6
      }

      // Add filter info if present
      if (filters.length > 0) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        const filterText = filters
          .map((f) => `${f.label}: ${f.value}`)
          .join(' | ')
        doc.text(`Filters: ${filterText}`, 14, yOffset)
        yOffset += 6
      }

      // Prepare table data
      const headers = columns.map((col) => col.label)
      const body = rows.map((row) =>
        columns.map((col) => formatCellValue(row[col.id], col))
      )

      // Generate table using autoTable
      autoTable(doc, {
        head: [headers],
        body,
        startY: yOffset + 2,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [51, 65, 85], // slate-700
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252], // slate-50
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data: { pageNumber: number }) => {
          // Add page numbers
          const pageCount = doc.getNumberOfPages()
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            doc.internal.pageSize.width - 30,
            doc.internal.pageSize.height - 10
          )

          // Add generation timestamp on first page
          if (data.pageNumber === 1) {
            doc.text(
              `Generated: ${new Date().toLocaleString()}`,
              14,
              doc.internal.pageSize.height - 10
            )
          }
        },
      })

      // Return as blob
      return doc.output('blob')
    },
  }

  return formatter
}
