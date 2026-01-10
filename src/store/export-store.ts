/**
 * Export Store (REQ-VIEW-10, REQ-VIEW-12)
 *
 * Lightweight Zustand store for export state management.
 * Stores the latest ExportViewContext keyed by route id.
 *
 * For MVP, views pass context directly to <ExportMenu> via props.
 * This store enables future global header/shell integration.
 */

import { create } from 'zustand'
import type { ExportViewContext } from '@/lib/export/types'

interface ExportState {
  /** Map of route id to export context */
  contexts: Record<string, ExportViewContext>

  /** Currently active export operation */
  isExporting: boolean

  /** Last export error message */
  lastError: string | null

  /** Register or update an export context */
  setContext: (context: ExportViewContext) => void

  /** Remove an export context by id */
  removeContext: (id: string) => void

  /** Get context by id */
  getContext: (id: string) => ExportViewContext | undefined

  /** Set exporting state */
  setIsExporting: (isExporting: boolean) => void

  /** Set last error */
  setLastError: (error: string | null) => void

  /** Clear all contexts */
  clearContexts: () => void
}

export const useExportStore = create<ExportState>((set, get) => ({
  contexts: {},
  isExporting: false,
  lastError: null,

  setContext: (context) =>
    set((state) => ({
      contexts: {
        ...state.contexts,
        [context.id]: context,
      },
    })),

  removeContext: (id) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...rest } = state.contexts
      return { contexts: rest }
    }),

  getContext: (id) => get().contexts[id],

  setIsExporting: (isExporting) => set({ isExporting }),

  setLastError: (lastError) => set({ lastError }),

  clearContexts: () => set({ contexts: {}, lastError: null }),
}))

/**
 * Selector hooks for convenience
 */
export const useExportContext = (id: string) =>
  useExportStore((state) => state.contexts[id])

export const useIsExporting = () =>
  useExportStore((state) => state.isExporting)

export const useExportError = () =>
  useExportStore((state) => state.lastError)
