import { getStore } from './dataStore'
import type { User } from '../../shared/types'

export function findAllUsers(): User[] {
  const store = getStore()
  return [...store.users]
}

export function findUserById(id: number): User | undefined {
  const store = getStore()
  return store.users.find((u) => u.id === id)
}

export default {
  findAll: findAllUsers,
  findById: findUserById,
}
