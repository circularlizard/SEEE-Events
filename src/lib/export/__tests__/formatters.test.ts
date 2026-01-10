/**
 * Export Formatters Tests (REQ-VIEW-10, REQ-VIEW-12)
 */

import type { ExportViewContext } from '../types'

// Mock xlsx module
const mockAoaToSheet = jest.fn(() => ({}))
const mockBookNew = jest.fn(() => ({}))
const mockBookAppendSheet = jest.fn()
const mockWrite = jest.fn(() => new ArrayBuffer(8))

jest.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: mockAoaToSheet,
    book_new: mockBookNew,
    book_append_sheet: mockBookAppendSheet,
  },
  write: mockWrite,
}))

// Mock jspdf module - must return a class/constructor
const mockJsPdfInstance = {
  setFontSize: jest.fn(),
  setFont: jest.fn(),
  text: jest.fn(),
  getNumberOfPages: jest.fn(() => 1),
  internal: {
    pageSize: { width: 297, height: 210 },
  },
  output: jest.fn(() => new Blob(['pdf content'])),
}

jest.mock('jspdf', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockJsPdfInstance),
  }
})

// Mock jspdf-autotable
const mockAutoTable = jest.fn()
jest.mock('jspdf-autotable', () => ({
  __esModule: true,
  default: mockAutoTable,
}))

describe('Spreadsheet Formatter (REQ-VIEW-10)', () => {
  beforeEach(() => {
    mockAoaToSheet.mockClear()
    mockBookNew.mockClear()
    mockBookAppendSheet.mockClear()
    mockWrite.mockClear()
  })

  const mockContext: ExportViewContext = {
    id: 'test-export',
    title: 'Test Export',
    subtitle: 'Test Subtitle',
    columns: [
      { id: 'name', label: 'Name', type: 'string' },
      { id: 'age', label: 'Age', type: 'number' },
      { id: 'cost', label: 'Cost', type: 'currency' },
    ],
    rows: [
      { name: 'Scout A', age: 14, cost: 25.5 },
      { name: 'Scout B', age: 15, cost: 30 },
    ],
    filters: [{ field: 'status', label: 'Status', value: 'Yes' }],
    source: '/dashboard/events/123',
    timestamp: new Date(),
  }

  it('should create spreadsheet formatter with correct properties', async () => {
    const { createSpreadsheetFormatter } = await import('../formatters/spreadsheet')
    const formatter = await createSpreadsheetFormatter()

    expect(formatter.format).toBe('xlsx')
    expect(formatter.extension).toBe('xlsx')
    expect(formatter.mimeType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  })

  it('should generate blob from context', async () => {
    const { createSpreadsheetFormatter } = await import('../formatters/spreadsheet')
    const formatter = await createSpreadsheetFormatter()

    const blob = await formatter.generate(mockContext)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  })

  it('should include title, subtitle, and filters in worksheet', async () => {
    const { createSpreadsheetFormatter } = await import('../formatters/spreadsheet')
    const formatter = await createSpreadsheetFormatter()

    await formatter.generate(mockContext)

    // Verify aoa_to_sheet was called with data including title, subtitle, filters
    expect(mockAoaToSheet).toHaveBeenCalled()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArg = (mockAoaToSheet.mock.calls[0] as any)?.[0] as unknown[][]

    // First row should be title
    expect(callArg[0]).toEqual(['Test Export'])
    // Second row should be subtitle
    expect(callArg[1]).toEqual(['Test Subtitle'])
    // Third row should be filters
    expect((callArg[2] as unknown[])?.[0]).toContain('Filters:')
  })

  it('should handle context without subtitle', async () => {
    const { createSpreadsheetFormatter } = await import('../formatters/spreadsheet')
    const formatter = await createSpreadsheetFormatter()

    const contextNoSubtitle = { ...mockContext, subtitle: undefined }
    await formatter.generate(contextNoSubtitle)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArg = (mockAoaToSheet.mock.calls[0] as any)?.[0] as unknown[][]
    // Should not have subtitle row between title and filters
    expect((callArg[1] as unknown[])?.[0]).toContain('Filters:')
  })

  it('should handle context without filters', async () => {
    const { createSpreadsheetFormatter } = await import('../formatters/spreadsheet')
    const formatter = await createSpreadsheetFormatter()

    const contextNoFilters = { ...mockContext, filters: [], subtitle: undefined }
    await formatter.generate(contextNoFilters)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArg = (mockAoaToSheet.mock.calls[0] as any)?.[0] as unknown[][]
    // Should have empty row after title (no subtitle, no filters)
    expect(callArg[1]).toEqual([])
  })
})

describe('PDF Formatter (REQ-VIEW-12)', () => {
  const mockContext: ExportViewContext = {
    id: 'test-export',
    title: 'Test Export',
    subtitle: 'Test Subtitle',
    columns: [
      { id: 'name', label: 'Name', type: 'string' },
      { id: 'age', label: 'Age', type: 'number' },
    ],
    rows: [
      { name: 'Scout A', age: 14 },
      { name: 'Scout B', age: 15 },
    ],
    filters: [{ field: 'status', label: 'Status', value: 'Yes' }],
    source: '/dashboard/events/123',
    timestamp: new Date(),
  }

  beforeEach(() => {
    mockAutoTable.mockClear()
    mockJsPdfInstance.setFontSize.mockClear()
    mockJsPdfInstance.setFont.mockClear()
    mockJsPdfInstance.text.mockClear()
    mockJsPdfInstance.output.mockClear()
  })

  it('should create PDF formatter with correct properties', async () => {
    const { createPdfFormatter } = await import('../formatters/pdf')
    const formatter = await createPdfFormatter()

    expect(formatter.format).toBe('pdf')
    expect(formatter.extension).toBe('pdf')
    expect(formatter.mimeType).toBe('application/pdf')
  })

  it('should generate blob from context', async () => {
    const { createPdfFormatter } = await import('../formatters/pdf')
    const formatter = await createPdfFormatter()

    const blob = await formatter.generate(mockContext)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('should create PDF document with landscape orientation', async () => {
    const jsPDF = (await import('jspdf')).default
    const { createPdfFormatter } = await import('../formatters/pdf')
    const formatter = await createPdfFormatter()

    await formatter.generate(mockContext)

    expect(jsPDF).toHaveBeenCalledWith({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })
  })

  it('should call autoTable with headers and body', async () => {
    const { createPdfFormatter } = await import('../formatters/pdf')
    const formatter = await createPdfFormatter()

    await formatter.generate(mockContext)

    expect(mockAutoTable).toHaveBeenCalled()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArg = (mockAutoTable.mock.calls[0] as any)?.[1]

    expect(callArg.head).toEqual([['Name', 'Age']])
    expect(callArg.body).toEqual([
      ['Scout A', '14'],
      ['Scout B', '15'],
    ])
  })

  it('should format currency values with pound sign', async () => {
    const { createPdfFormatter } = await import('../formatters/pdf')
    const formatter = await createPdfFormatter()

    const contextWithCurrency: ExportViewContext = {
      ...mockContext,
      columns: [
        { id: 'name', label: 'Name', type: 'string' },
        { id: 'cost', label: 'Cost', type: 'currency' },
      ],
      rows: [
        { name: 'Scout A', cost: 25.5 },
        { name: 'Scout B', cost: 30 },
      ],
    }

    await formatter.generate(contextWithCurrency)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArg = (mockAutoTable.mock.calls[0] as any)?.[1]
    expect(callArg.body[0][1]).toBe('£25.50')
    expect(callArg.body[1][1]).toBe('£30.00')
  })

  it('should handle null values with dash', async () => {
    const { createPdfFormatter } = await import('../formatters/pdf')
    const formatter = await createPdfFormatter()

    const contextWithNull: ExportViewContext = {
      ...mockContext,
      rows: [
        { name: 'Scout A', age: null },
        { name: null, age: 15 },
      ],
    }

    await formatter.generate(contextWithNull)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArg = (mockAutoTable.mock.calls[0] as any)?.[1]
    expect(callArg.body[0][1]).toBe('—')
    expect(callArg.body[1][0]).toBe('—')
  })
})

describe('Column width estimation', () => {
  beforeEach(() => {
    mockAoaToSheet.mockClear()
  })

  it('should estimate width based on content length', async () => {
    const { createSpreadsheetFormatter } = await import('../formatters/spreadsheet')
    const formatter = await createSpreadsheetFormatter()

    const contextWithLongContent: ExportViewContext = {
      id: 'test',
      title: 'Test',
      columns: [
        { id: 'short', label: 'ID', type: 'string' },
        { id: 'long', label: 'Description', type: 'string' },
      ],
      rows: [
        { short: '1', long: 'This is a very long description that should increase column width' },
      ],
      filters: [],
      source: '/test',
      timestamp: new Date(),
    }

    await formatter.generate(contextWithLongContent)

    // Verify aoa_to_sheet was called (column widths are set on the worksheet)
    expect(mockAoaToSheet).toHaveBeenCalled()
  })

  it('should respect explicit column width', async () => {
    const { createSpreadsheetFormatter } = await import('../formatters/spreadsheet')
    const formatter = await createSpreadsheetFormatter()

    const contextWithExplicitWidth: ExportViewContext = {
      id: 'test',
      title: 'Test',
      columns: [
        { id: 'name', label: 'Name', type: 'string', width: 25 },
      ],
      rows: [{ name: 'Scout A' }],
      filters: [],
      source: '/test',
      timestamp: new Date(),
    }

    // Should not throw
    await expect(formatter.generate(contextWithExplicitWidth)).resolves.toBeInstanceOf(Blob)
  })
})

describe('Unicode handling', () => {
  beforeEach(() => {
    mockAoaToSheet.mockClear()
  })

  it('should handle unicode characters in names', async () => {
    const { createSpreadsheetFormatter } = await import('../formatters/spreadsheet')
    const formatter = await createSpreadsheetFormatter()

    const contextWithUnicode: ExportViewContext = {
      id: 'test',
      title: 'Test Export',
      columns: [
        { id: 'name', label: 'Name', type: 'string' },
        { id: 'patrol', label: 'Patrol', type: 'string' },
      ],
      rows: [
        { name: 'José García', patrol: 'Águilas' },
        { name: "Seán O'Brien", patrol: 'Falcons' },
      ],
      filters: [],
      source: '/test',
      timestamp: new Date(),
    }

    await formatter.generate(contextWithUnicode)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArg = (mockAoaToSheet.mock.calls[0] as any)?.[0] as unknown[][]
    // Find the data rows (after title, empty row, headers)
    const dataRows = callArg.slice(-2)
    expect(dataRows[0]).toContain('José García')
    expect(dataRows[1]).toContain("Seán O'Brien")
  })
})
