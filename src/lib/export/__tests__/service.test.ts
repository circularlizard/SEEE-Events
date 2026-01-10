/**
 * Export Service Tests (REQ-VIEW-10, REQ-VIEW-12)
 */

import {
  generateFilename,
  registerFormatter,
  executeExport,
  isFormatSupported,
  getSupportedFormats,
} from '../service'
import type { ExportViewContext, ExportFormatter } from '../types'

describe('Export Service (REQ-VIEW-10, REQ-VIEW-12)', () => {
  describe('generateFilename', () => {
    it('should generate filename with sanitized view id and timestamp', () => {
      const filename = generateFilename('event-participants-123', 'xlsx')

      expect(filename).toMatch(/^event-participants-123-\d{8}-\d{6}\.xlsx$/)
    })

    it('should sanitize special characters in view id', () => {
      const filename = generateFilename('Event Participants (Test)', 'pdf')

      expect(filename).toMatch(/^event-participants-test-\d{8}-\d{6}\.pdf$/)
    })

    it('should truncate long view ids to 50 characters', () => {
      const longId = 'a'.repeat(100)
      const filename = generateFilename(longId, 'xlsx')

      // 50 chars + dash + timestamp + extension
      expect(filename.split('-')[0].length).toBeLessThanOrEqual(50)
    })

    it('should collapse multiple dashes', () => {
      const filename = generateFilename('test---multiple---dashes', 'xlsx')

      expect(filename).toMatch(/^test-multiple-dashes-\d{8}-\d{6}\.xlsx$/)
    })
  })

  describe('registerFormatter', () => {
    it('should register a formatter factory', async () => {
      const mockFormatter: ExportFormatter = {
        format: 'xlsx',
        extension: 'xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        generate: jest.fn().mockResolvedValue(new Blob(['test'])),
      }

      registerFormatter('xlsx', async () => mockFormatter)

      expect(isFormatSupported('xlsx')).toBe(true)
    })
  })

  describe('isFormatSupported', () => {
    it('should return true for registered formats', () => {
      registerFormatter('xlsx', async () => ({
        format: 'xlsx',
        extension: 'xlsx',
        mimeType: 'test',
        generate: jest.fn(),
      }))

      expect(isFormatSupported('xlsx')).toBe(true)
    })

    it('should return false for unregistered formats', () => {
      // @ts-expect-error - testing invalid format
      expect(isFormatSupported('csv')).toBe(false)
    })
  })

  describe('getSupportedFormats', () => {
    it('should return array of registered format keys', () => {
      registerFormatter('xlsx', async () => ({
        format: 'xlsx',
        extension: 'xlsx',
        mimeType: 'test',
        generate: jest.fn(),
      }))
      registerFormatter('pdf', async () => ({
        format: 'pdf',
        extension: 'pdf',
        mimeType: 'test',
        generate: jest.fn(),
      }))

      const formats = getSupportedFormats()

      expect(formats).toContain('xlsx')
      expect(formats).toContain('pdf')
    })
  })

  describe('executeExport', () => {
    const mockContext: ExportViewContext = {
      id: 'test-export',
      title: 'Test Export',
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
      // Mock URL.createObjectURL and document methods for download
      global.URL.createObjectURL = jest.fn(() => 'blob:test')
      global.URL.revokeObjectURL = jest.fn()

      // Mock document.createElement and appendChild
      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: jest.fn(),
      }
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement)
      jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as Node)
      jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as Node)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should return error for unsupported format', async () => {
      // @ts-expect-error - testing invalid format
      const result = await executeExport(mockContext, 'csv')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unsupported export format')
    })

    it('should return error for empty rows', async () => {
      const emptyContext = { ...mockContext, rows: [] }

      registerFormatter('xlsx', async () => ({
        format: 'xlsx',
        extension: 'xlsx',
        mimeType: 'test',
        generate: jest.fn(),
      }))

      const result = await executeExport(emptyContext, 'xlsx')

      expect(result.success).toBe(false)
      expect(result.error).toBe('No data to export')
    })

    it('should execute export and trigger download', async () => {
      const mockBlob = new Blob(['test data'])
      const mockGenerate = jest.fn().mockResolvedValue(mockBlob)

      registerFormatter('xlsx', async () => ({
        format: 'xlsx',
        extension: 'xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        generate: mockGenerate,
      }))

      const result = await executeExport(mockContext, 'xlsx')

      expect(result.success).toBe(true)
      expect(result.filename).toMatch(/^test-export-\d{8}-\d{6}\.xlsx$/)
      expect(mockGenerate).toHaveBeenCalledWith(mockContext)
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
    })

    it('should handle formatter errors gracefully', async () => {
      registerFormatter('xlsx', async () => ({
        format: 'xlsx',
        extension: 'xlsx',
        mimeType: 'test',
        generate: jest.fn().mockRejectedValue(new Error('Formatter error')),
      }))

      const result = await executeExport(mockContext, 'xlsx')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Formatter error')
    })
  })
})
