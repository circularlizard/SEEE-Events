import {
  MemberSchema,
  EventSchema,
  FlexiDataItemSchema,
  BadgeRecordSchema,
  parseStrict,
  parsePermissive,
} from '../schemas'

describe('Zod Schemas - Two-Tier Validation', () => {
  describe('Tier 1: Strict Validation (Members)', () => {
    const validMember = {
      scoutid: 12345,
      firstname: 'John',
      lastname: 'Doe',
      photo_guid: '123e4567-e89b-12d3-a456-426614174000',
      patrolid: 1,
      patrol: 'Eagles',
      sectionid: 100,
      enddate: null,
      age: '14 / 6',
      patrol_role_level_label: 'Member',
      active: true,
    }

    it('should validate correct member data', () => {
      const result = MemberSchema.safeParse(validMember)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.scoutid).toBe(12345)
        expect(result.data.firstname).toBe('John')
      }
    })

    it('should fail when required field is missing', () => {
      const invalidMember = { ...validMember }
      delete (invalidMember as Partial<typeof validMember>).firstname
      
      const result = MemberSchema.safeParse(invalidMember)
      expect(result.success).toBe(false)
    })

    it('should fail when ID is wrong type', () => {
      const invalidMember = { ...validMember, scoutid: '12345' } // string instead of number
      
      const result = MemberSchema.safeParse(invalidMember)
      expect(result.success).toBe(false)
    })

    it('should gracefully handle invalid UUID by defaulting to null', () => {
      const invalidMember = { ...validMember, photo_guid: 'not-a-uuid' }
      
      const result = MemberSchema.safeParse(invalidMember)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.photo_guid).toBeNull()
      }
    })

    it('parseStrict should throw on invalid data', () => {
      const invalidData = { scoutid: 'invalid' }
      
      expect(() => {
        parseStrict(MemberSchema, invalidData, 'TestMember')
      }).toThrow()
    })

    it('parseStrict should return valid data', () => {
      const result = parseStrict(MemberSchema, validMember, 'TestMember')
      expect(result.scoutid).toBe(12345)
    })
  })

  describe('Tier 1: Strict Validation (Events)', () => {
    const validEvent = {
      eventid: '1001',
      name: 'Summer Camp',
      date: '01/08/2025',
      startdate_g: '2025-08-01',
      startdate: '01/08/2025',
      enddate: '07/08/2025',
      starttime: '10:00:00',
      endtime: '16:00:00',
      cost: '50.00',
      location: 'Camp Site',
      approval_status: null,
      rota_offered: 0,
      rota_accepted: 0,
      rota_required: null,
      yes: 25,
      yes_members: 20,
      yes_yls: 2,
      yes_leaders: 3,
      reserved: 0,
      no: 5,
      invited: 0,
      shown: 0,
      x: 0,
    }

    it('should validate correct event data', () => {
      const result = EventSchema.safeParse(validEvent)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.eventid).toBe('1001')
        expect(result.data.name).toBe('Summer Camp')
      }
    })

    it('should fail when event name is empty', () => {
      const invalidEvent = { ...validEvent, name: '' }
      
      const result = EventSchema.safeParse(invalidEvent)
      expect(result.success).toBe(false)
    })
  })

  describe('Tier 2: Permissive Validation (FlexiData)', () => {
    it('should accept valid flexi data', () => {
      const validData = {
        scoutid: '12345',
        firstname: 'Jane',
        lastname: 'Smith',
        dob: '2010-01-15',
        photo_guid: '123e4567-e89b-12d3-a456-426614174000',
        patrolid: '1',
        age: '15 / 3',
        total: '10',
        completed: '8',
        f_1: 'Group A',
        f_2: 'Yes',
        f_3: 'Medical notes here',
      }

      const result = FlexiDataItemSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should use default values for missing fields (graceful degradation)', () => {
      const incompleteData = {
        scoutid: '12345',
        // Missing firstname, lastname, etc.
      }

      const result = FlexiDataItemSchema.safeParse(incompleteData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.scoutid).toBe('12345')
        expect(result.data.firstname).toBe('') // Default value
      }
    })

    it('should handle corrupted fields gracefully', () => {
      const corruptedData = {
        scoutid: '12345',
        firstname: 123, // Wrong type - should catch to ''
        lastname: null, // Wrong type - should catch to ''
        dob: undefined, // Wrong type - should catch to ''
        photo_guid: ['array'], // Wrong type - should catch to ''
        patrolid: {},  // Wrong type - should catch to ''
        age: true, // Wrong type - should catch to ''
        total: '', // Valid (empty string)
        completed: '', // Valid (empty string)
      }

      const result = FlexiDataItemSchema.safeParse(corruptedData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.scoutid).toBe('12345')
        expect(result.data.firstname).toBe('')
        expect(result.data.lastname).toBe('')
      }
    })

    it('parsePermissive should return default on invalid data', () => {
      const invalidData = { scoutid: 123 } // scoutid should be string

      const result = parsePermissive(
        FlexiDataItemSchema,
        invalidData,
        {
          scoutid: '0',
          firstname: '',
          lastname: '',
          dob: '',
          photo_guid: '',
          patrolid: '',
          age: '',
          total: '',
          completed: '',
        },
        'TestFlexiData'
      )

      // Should not throw, but return data (catchall will handle extra fields)
      expect(result.scoutid).toBeDefined()
    })
  })

  describe('Tier 2: Permissive Validation (BadgeRecords)', () => {
    it('should handle missing badge data gracefully', () => {
      const incompleteRecord = {
        scoutid: '12345',
        // Missing other fields
        items: [],
      }

      const result = BadgeRecordSchema.safeParse(incompleteRecord)
      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.scoutid).toBe('12345')
        expect(result.data.firstname).toBe('') // Caught default
        expect(result.data.items).toEqual([])
      }
    })

    it('should return failure for non-object badge record', () => {
      const invalidData = 'not an object'

      const result = BadgeRecordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('Two-Tier Strategy Comparison', () => {
    it('Tier 1 should throw on invalid data', () => {
      const invalidData = { scoutid: 'not-a-number' }

      expect(() => {
        parseStrict(MemberSchema, invalidData, 'ComparisonTest')
      }).toThrow()
    })

    it('Tier 2 should gracefully degrade on invalid data', () => {
      const invalidData = { scoutid: 123 }

      const result = parsePermissive(
        FlexiDataItemSchema,
        invalidData,
        {
          scoutid: '0',
          firstname: '',
          lastname: '',
          dob: '',
          photo_guid: '',
          patrolid: '',
          age: '',
          total: '',
          completed: '',
        },
        'ComparisonTest'
      )

      // Should not throw
      expect(result).toBeDefined()
    })
  })
})
