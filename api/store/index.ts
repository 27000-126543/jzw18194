export * from './dataStore'
export * from './userStore'
export * from './projectStore'
export * from './actionStore'
export * from './meetingStore'
export * from './notificationStore'

import meetingStore from './meetingStore'
import actionStore from './actionStore'
import userStore from './userStore'
import projectStore from './projectStore'
import notificationStore from './notificationStore'

export const stores = {
  meeting: meetingStore,
  action: actionStore,
  user: userStore,
  project: projectStore,
  notification: notificationStore,
}
