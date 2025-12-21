/**
 * Shared Selectors
 * 
 * Common selectors used across step definitions
 */

export const selectors = {
  auth: {
    signInButton: 'role=button[name="Sign in with OSM"]',
    adminRole: 'label:has-text("Administrator")',
    standardRole: 'label:has-text("Standard Viewer")',
  },
  
  navigation: {
    eventsLink: 'a[href="/dashboard/events"]',
    membersLink: 'a[href="/dashboard/members"]',
    attendanceLink: 'a[href="/dashboard/events/attendance"]',
  },
  
  sectionPicker: {
    modal: 'text=Select a Section',
  },
}
