import { getStore } from './dataStore'
import type { Project } from '../../shared/types'

export function findAllProjects(): Project[] {
  const store = getStore()
  return [...store.projects]
}

export function findProjectById(id: number): Project | undefined {
  const store = getStore()
  return store.projects.find((p) => p.id === id)
}

export default {
  findAll: findAllProjects,
  findById: findProjectById,
}
