import api from './api';
import type { Meeting, CreateMeetingRequest, UpdateMeetingRequest, StatsResponse, ActionItem } from '../../shared/types';

export const meetingsApi = {
  async list(params?: {
    projectId?: number;
    participantId?: number;
    keyword?: string;
    from?: string;
    to?: string;
  }): Promise<Meeting[]> {
    return await api.get<Meeting[]>('/meetings', { params });
  },

  async get(id: number): Promise<Meeting> {
    return await api.get<Meeting>(`/meetings/${id}`);
  },

  async create(data: CreateMeetingRequest): Promise<Meeting> {
    return await api.post<Meeting>('/meetings', data);
  },

  async update(id: number, data: UpdateMeetingRequest): Promise<Meeting> {
    return await api.put<Meeting>(`/meetings/${id}`, data);
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/meetings/${id}`);
  },

  async sendEmail(id: number, data?: { ccCreator?: boolean; customNote?: string }): Promise<void> {
    await api.post(`/meetings/${id}/send-email`, data || {});
  },

  async stats(): Promise<StatsResponse> {
    return await api.get<StatsResponse>('/meetings/stats');
  },

  async getUnfinishedSiblings(id: number): Promise<ActionItem[]> {
    return await api.get<ActionItem[]>(`/meetings/${id}/unfinished-siblings`);
  },

  async getUnfinishedByProject(projectId: number): Promise<ActionItem[]> {
    return await api.get<ActionItem[]>('/meetings/unfinished-by-project', { params: { projectId } });
  },
};

export default meetingsApi;
