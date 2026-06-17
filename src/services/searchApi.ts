import api from './api';
import type { SearchResponse } from '../../shared/types';

export const searchApi = {
  async search(keyword: string): Promise<SearchResponse> {
    return await api.get<SearchResponse>('/search', { params: { q: keyword } });
  },
};

export default searchApi;
