import api from './api';
import type { ActionItem, UpdateActionRequest, ActionStatus } from '../../shared/types';

export const actionsApi = {
  async list(params?: {
    status?: ActionStatus;
    assigneeId?: number;
    meetingId?: number;
  }): Promise<ActionItem[]> {
    return await api.get<ActionItem[]>('/actions', { params });
  },

  async board(params?: {
    projectIds?: number[];
    participantIds?: number[];
  }): Promise<ActionItem[]> {
    return await api.get<ActionItem[]>('/actions/board', { params });
  },

  async get(id: number): Promise<ActionItem> {
    return await api.get<ActionItem>(`/actions/${id}`);
  },

  async update(id: number, data: UpdateActionRequest): Promise<ActionItem> {
    return await api.put<ActionItem>(`/actions/${id}`, data);
  },

  async updateStatus(id: number, status: ActionStatus): Promise<ActionItem> {
    return await api.patch<ActionItem>(`/actions/${id}/status`, { status });
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/actions/${id}`);
  },
};

export default actionsApi;
