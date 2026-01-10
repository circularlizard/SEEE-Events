'use client'

/**
 * ExportMenu Component (REQ-VIEW-10, REQ-VIEW-12)
 *
 * Dropdown menu for exporting view data in various formats.
 * Accepts ExportViewContext directly as prop for MVP.
 */

import { useState, useCallback } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ExportViewContext, ExportFormat } from '@/lib/export/types'
import { executeExport } from '@/lib/export'

export interface ExportMenuProps {
  /** Export context containing data to export */
  context: ExportViewContext | null
  /** Optional className for the trigger button */
  className?: string
  /** Optional label override (default: "Export") */
  label?: string
  /** Callback when export completes */
  onExportComplete?: (success: boolean, filename?: string, error?: string) => void
}

export function ExportMenu({
  context,
  className,
  label = 'Export',
  onExportComplete,
}: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null)

  const isDisabled = !context || context.rows.length === 0

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!context || isExporting) return

      setIsExporting(true)
      setExportingFormat(format)

      try {
        const result = await executeExport(context, format)
        onExportComplete?.(result.success, result.filename, result.error)

        if (!result.success) {
          console.error('[ExportMenu] Export failed:', result.error)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Export failed'
        console.error('[ExportMenu] Export error:', error)
        onExportComplete?.(false, undefined, message)
      } finally {
        setIsExporting(false)
        setExportingFormat(null)
      }
    },
    [context, isExporting, onExportComplete]
  )

  const rowCount = context?.rows.length ?? 0
  const filterCount = context?.filters.length ?? 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          disabled={isDisabled || isExporting}
          aria-label={`${label} data as spreadsheet or PDF`}
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="mr-2 h-4 w-4" aria-hidden />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Download Format</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => handleExport('xlsx')}
          disabled={isExporting}
          className="cursor-pointer"
        >
          {exportingFormat === 'xlsx' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden />
          )}
          <span>Spreadsheet (.xlsx)</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
          className="cursor-pointer"
        >
          {exportingFormat === 'pdf' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <FileText className="mr-2 h-4 w-4" aria-hidden />
          )}
          <span>PDF Document (.pdf)</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {rowCount > 0 ? (
            <>
              {rowCount} row{rowCount !== 1 ? 's' : ''}
              {filterCount > 0 && ` (${filterCount} filter${filterCount !== 1 ? 's' : ''} applied)`}
            </>
          ) : (
            'No data to export'
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
