import api from './api';
import type { SearchResponse } from '../../shared/types';

export interface SearchParams {
  keyword: string;
  projectIds?: number[];
  participantIds?: number[];
  dateFrom?: string;
  dateTo?: string;
}

export const searchApi = {
  async search(params: SearchParams): Promise<SearchResponse> {
    const queryParams: Record<string, string> = {
      keyword: params.keyword,
    };
    if (params.projectIds && params.projectIds.length > 0) {
      queryParams.projectIds = params.projectIds.join(',');
    }
    if (params.participantIds && params.participantIds.length > 0) {
      queryParams.participantIds = params.participantIds.join(',');
    }
    if (params.dateFrom) {
      queryParams.dateFrom = params.dateFrom;
    }
    if (params.dateTo) {
      queryParams.dateTo = params.dateTo;
    }
    return await api.get<SearchResponse>('/search', { params: queryParams });
  },
};

export default searchApi;
