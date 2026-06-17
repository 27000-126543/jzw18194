import { create } from 'zustand';
import type { User, Notification } from '../../shared/types';
import { usersApi } from '../services/usersApi';

export interface Filters {
  projectIds: number[];
  participantIds: number[];
  keyword: string;
  dateFrom?: string;
  dateTo?: string;
}

interface AppState {
  currentUser: User;
  filters: Filters;
  notifications: Notification[];
  unreadCount: number;

  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;

  fetchNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

const DEFAULT_USER: User = {
  id: 1,
  name: '张伟',
  email: 'zhangwei@demo.com',
  avatarColor: 'sky-600',
  role: 'admin',
};

const DEFAULT_FILTERS: Filters = {
  projectIds: [],
  participantIds: [],
  keyword: '',
  dateFrom: undefined,
  dateTo: undefined,
};

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: DEFAULT_USER,
  filters: { ...DEFAULT_FILTERS },
  notifications: [],
  unreadCount: 0,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  resetFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
  },

  fetchNotifications: async () => {
    try {
      const userId = get().currentUser.id;
      const res = await usersApi.listNotifications(userId);
      const items = res.items;
      const unreadCount = res.unreadCount;
      set({ notifications: items, unreadCount });
    } catch (error) {
      console.error('获取通知失败:', error);
    }
  },

  markAllRead: async () => {
    try {
      const userId = get().currentUser.id;
      await usersApi.markNotificationsRead(userId);
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: 1 })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  },
}));

export default useAppStore;
