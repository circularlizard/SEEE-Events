import { parseCustomDataGroups } from '../member-data-parser'
import {
  createNormalizedMemberFromSummary,
  updateMemberWithIndividualData,
  updateMemberWithCustomData,
  markMemberError,
} from '../member-data-parser'
import type { CustomDataGroup, NormalizedMember, IndividualData, Member } from '../schemas'

function group(overrides: Partial<CustomDataGroup>): CustomDataGroup {
  // Minimal stub that satisfies the CustomDataGroup type used by the parser
  return {
    group_id: 1,
    config: null,
    group_type: 'grouped',
    identifier: 'unknown',
    name: 'Unknown',
    description: '',
    description_mymember: '',
    is_considered_core: 'yes',
    allow_new_columns: 'yes',
    display: 'always',
    columns: [],
    custom_order: 0,
    ...overrides,
  }
}

describe('member-data-parser', () => {
  it('parses contact + doctor info from real-ish custom data groups', () => {
    const groups: CustomDataGroup[] = [
      group({
        identifier: 'contact_primary_member',
        name: 'Member',
        columns: [
          { column_id: 1, type: 'text', required: 'no', display_in_advanced_view: 'yes', display_if_empty: 'no', hide_from_group_display: 'no', config: [], varname: 'email1', label: 'Email 1', value: ' person@example.com ', is_core: 'yes', order: '1', force_read_only: 'no', special_permissions: 'no', permissions: [], orig_label: 'Email 1' },
          { column_id: 2, type: 'text', required: 'no', display_in_advanced_view: 'yes', display_if_empty: 'no', hide_from_group_display: 'no', config: [], varname: 'phone1', label: 'Phone 1', value: ' 01234 567890 ', is_core: 'yes', order: '2', force_read_only: 'no', special_permissions: 'no', permissions: [], orig_label: 'Phone 1' },
          { column_id: 5, type: 'text', required: 'no', display_in_advanced_view: 'yes', display_if_empty: 'yes', hide_from_group_display: 'no', config: [], varname: 'cf_medical_notes', label: 'Medical notes', value: 'None', is_core: 'no', order: '3', force_read_only: 'no', special_permissions: 'no', permissions: [], orig_label: 'Medical notes' },
          { column_id: 6, type: 'text', required: 'no', display_in_advanced_view: 'yes', display_if_empty: 'yes', hide_from_group_display: 'no', config: [], varname: 'cf_dietary_notes', label: 'Dietary notes', value: 'None', is_core: 'no', order: '4', force_read_only: 'no', special_permissions: 'no', permissions: [], orig_label: 'Dietary notes' },
          { column_id: 7, type: 'text', required: 'no', display_in_advanced_view: 'yes', display_if_empty: 'yes', hide_from_group_display: 'no', config: [], varname: 'cf_allergy_notes', label: 'Allergy notes', value: 'None', is_core: 'no', order: '5', force_read_only: 'no', special_permissions: 'no', permissions: [], orig_label: 'Allergy notes' },
        ],
      }),
      group({
        identifier: 'doctor',
        name: 'Doctor',
        columns: [
          { column_id: 3, type: 'text', required: 'no', display_in_advanced_view: 'yes', display_if_empty: 'no', hide_from_group_display: 'no', config: [], varname: 'surgery', label: 'Surgery', value: 'Bruntsfield Medical Practice', is_core: 'yes', order: '1', force_read_only: 'no', special_permissions: 'no', permissions: [], orig_label: 'Surgery' },
          { column_id: 4, type: 'text', required: 'no', display_in_advanced_view: 'yes', display_if_empty: 'no', hide_from_group_display: 'no', config: [], varname: 'phone1', label: 'Phone 1', value: '0131 228 6081', is_core: 'yes', order: '2', force_read_only: 'no', special_permissions: 'no', permissions: [], orig_label: 'Phone 1' },
        ],
      }),
      group({
        identifier: 'contact_primary_1',
        name: 'Primary Contact 1',
        columns: [
          { column_id: 10, type: 'text', required: 'no', display_in_advanced_view: 'yes', display_if_empty: 'yes', hide_from_group_display: 'no', config: [], varname: 'cf_relationship', label: 'Relationship', value: 'Mother', is_core: 'no', order: '1', force_read_only: 'no', special_permissions: 'no', permissions: [], orig_label: 'Relationship' },
        ],
      }),
      group({
        identifier: 'consents',
        name: 'Consents',
        columns: [
          { column_id: 20, type: 'select', required: 'no', display_in_advanced_view: 'yes', display_if_empty: 'yes', hide_from_group_display: 'no', config: [], varname: 'photographs_all', label: 'Photographs', value: 'Yes', is_core: 'yes', order: '1', force_read_only: 'no', special_permissions: 'no', permissions: [], orig_label: 'Photographs' },
          { column_id: 21, type: 'select', required: 'no', display_in_advanced_view: 'yes', display_if_empty: 'yes', hide_from_group_display: 'no', config: [], varname: 'sensitive', label: 'Sensitive information', value: 'Yes', is_core: 'yes', order: '2', force_read_only: 'no', special_permissions: 'no', permissions: [], orig_label: 'Sensitive information' },
        ],
      }),
    ]

    const parsed = parseCustomDataGroups(groups)

    expect(parsed.memberContact?.email1).toBe('person@example.com')
    expect(parsed.memberContact?.phone1).toBe('01234 567890')
    expect(parsed.medicalNotes).toBe('None')
    expect(parsed.dietaryNotes).toBe('None')
    expect(parsed.allergyNotes).toBe('None')
    expect(parsed.doctorName).toBe('Bruntsfield Medical Practice')
    expect(parsed.doctorPhone).toBe('0131 228 6081')
    expect(parsed.primaryContact1?.relationship).toBe('Mother')
    expect(parsed.consents?.photoConsent).toBe(true)
    expect(parsed.consents?.medicalConsent).toBe(true)
  })

  it('fills normalized member stages across data sources', () => {
    const summaryMember: Member = {
      scoutid: 99,
      firstname: 'Delta',
      lastname: 'Tester',
      photo_guid: '123e4567-e89b-12d3-a456-426614174000',
      patrolid: 1,
      patrol: 'Raptors',
      sectionid: 42,
      enddate: null,
      age: '14 / 6',
      patrol_role_level_label: 'Member',
      active: true,
    }

    const normalized = createNormalizedMemberFromSummary(summaryMember)
    expect(normalized.firstName).toBe('Delta')
    expect(normalized.dateOfBirth).toBeNull()

    const individual: IndividualData = {
      scoutid: '99',
      firstname: 'Delta',
      lastname: 'Tester',
      photo_guid: null,
      dob: '2010-01-01',
      started: '2020-01-01',
      created_date: '2024-01-01',
      last_accessed: '2024-02-01',
      patrolid: '1',
      patrolleader: '0',
      startedsection: '2020-01-01',
      enddate: null,
      age: '14 / 6',
      age_simple: '14/6',
      sectionid: 42,
      active: true,
      meetings: '0',
      others: [],
    }

    const withIndividual = updateMemberWithIndividualData(normalized, individual)
    expect(withIndividual.dateOfBirth).toBe('2010-01-01')
    expect(withIndividual.loadingState).toBe('individual')

    const withCustom = updateMemberWithCustomData(withIndividual, {
      memberContact: { firstName: 'Tester', lastName: 'Parent' } as NormalizedMember['memberContact'],
      primaryContact1: null,
      primaryContact2: null,
      emergencyContact: null,
      doctorName: 'Dr Who',
      doctorPhone: '000',
      doctorAddress: 'Somewhere',
      medicalNotes: 'None',
      dietaryNotes: 'Vegan',
      allergyNotes: '',
      consents: { photoConsent: true, medicalConsent: true },
    })
    expect(withCustom.memberContact?.firstName).toBe('Tester')
    expect(withCustom.loadingState).toBe('complete')

    const errored = markMemberError(withCustom, 'boom')
    expect(errored.loadingState).toBe('error')
    expect(errored.errorMessage).toBe('boom')
  })
})
