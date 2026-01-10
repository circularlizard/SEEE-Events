/**
 * useExportContext Hook (REQ-VIEW-10, REQ-VIEW-12)
 *
 * Helper hook for views to construct ExportViewContext from their data.
 * Handles memoization and automatic context registration.
 */

import { useMemo, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type {
  ExportViewContext,
  ExportColumn,
  ExportRow,
  ExportFilter,
} from '@/lib/export/types'
import { useExportStore } from '@/store/export-store'

export interface UseExportContextOptions {
  /** Unique identifier for this view (e.g., 'event-participants-123') */
  id: string
  /** Display title for the export */
  title: string
  /** Optional subtitle (e.g., date range) */
  subtitle?: string
  /** Column definitions */
  columns: ExportColumn[]
  /** Row data (already filtered/sorted) */
  rows: ExportRow[]
  /** Active filters */
  filters?: ExportFilter[]
  /** Whether to register context in global store (default: false for MVP) */
  registerGlobally?: boolean
}

/**
 * Build an ExportViewContext from view data
 *
 * @example
 * ```tsx
 * const exportContext = useExportViewContext({
 *   id: `event-${eventId}`,
 *   title: eventName,
 *   columns: [
 *     { id: 'name', label: 'Name', type: 'string' },
 *     { id: 'unit', label: 'Unit', type: 'string' },
 *   ],
 *   rows: participants.map(p => ({ name: p.name, unit: p.patrol })),
 *   filters: [{ field: 'status', label: 'Status', value: 'Yes' }],
 * })
 *
 * return <ExportMenu context={exportContext} />
 * ```
 */
export function useExportViewContext(
  options: UseExportContextOptions
): ExportViewContext {
  const pathname = usePathname()
  const setContext = useExportStore((state) => state.setContext)
  const removeContext = useExportStore((state) => state.removeContext)

  const context = useMemo<ExportViewContext>(
    () => ({
      id: options.id,
      title: options.title,
      subtitle: options.subtitle,
      columns: options.columns,
      rows: options.rows,
      filters: options.filters ?? [],
      source: pathname,
      timestamp: new Date(),
    }),
    [
      options.id,
      options.title,
      options.subtitle,
      options.columns,
      options.rows,
      options.filters,
      pathname,
    ]
  )

  // Optionally register in global store for header/shell integration
  useEffect(() => {
    if (options.registerGlobally) {
      setContext(context)
      return () => removeContext(context.id)
    }
  }, [context, options.registerGlobally, setContext, removeContext])

  return context
}

/**
 * Convenience function to create column definitions
 */
export function createExportColumn(
  id: string,
  label: string,
  type: ExportColumn['type'] = 'string',
  options?: Partial<Omit<ExportColumn, 'id' | 'label' | 'type'>>
): ExportColumn {
  return {
    id,
    label,
    type,
    ...options,
  }
}

/**
 * Convenience function to create filter definitions
 */
export function createExportFilter(
  field: string,
  label: string,
  value: string
): ExportFilter {
  return { field, label, value }
}
