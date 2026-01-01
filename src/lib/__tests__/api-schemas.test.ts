jest.mock('../logger', () => ({
  logValidationError: jest.fn(),
}))

import { logValidationError } from '../logger'
import { parseStrict } from '../schemas'
import { EventsResponseSchema, type EventsResponse, MemberSchema } from '../schemas'

const mockLogValidationError = logValidationError as jest.Mock

describe('api schemas integration', () => {
  beforeEach(() => {
    mockLogValidationError.mockClear()
  })

  it('validates normalized events response via parseStrict', () => {
    const payload = {
      identifier: 'eventid',
      items: [
        {
          eventid: '1385068',
          name: 'Test Event',
          date: '10/10/2024',
          startdate_g: '2024-10-10',
          startdate: '10/10/2024',
          enddate: '10/10/2024',
          starttime: '19:30:00',
          endtime: '20:00:00',
          cost: '25.00',
          location: 'Test Location',
          approval_status: null,
          rota_offered: 0,
          rota_accepted: 0,
          rota_required: null,
          yes: 30,
          yes_members: 19,
          yes_yls: 0,
          yes_leaders: 2,
          reserved: 0,
          no: 6,
          invited: 0,
          shown: 7,
          x: 2,
        },
      ],
    }

    const parsed = parseStrict(EventsResponseSchema, payload, 'EventsTest')
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0].name).toBe('Test Event')
  })

  it('logs validation error for malformed event data', () => {
    const badPayload = {
      identifier: 'eventid',
      items: [
        {
          eventid: null,
          name: '',
        },
      ],
    }

    expect(() => parseStrict(EventsResponseSchema, badPayload, 'EventsBad')).toThrow()
    expect(mockLogValidationError).toHaveBeenCalledWith(
      expect.objectContaining({ context: 'EventsBad', tier: 1 })
    )
  })

  it('validates Member schema with raw API payload', () => {
    const memberPayload = {
      scoutid: 123,
      firstname: 'Scout',
      lastname: 'Example',
      photo_guid: null,
      patrolid: 42,
      patrol: 'Eagles',
      sectionid: 99,
      enddate: null,
      age: '14 / 5',
      patrol_role_level_label: 'Member',
      active: true,
    }

    const parsed = parseStrict(MemberSchema, memberPayload, 'MemberTest')
    expect(parsed.firstname).toBe('Scout')
  })
})
