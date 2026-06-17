import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export interface ApiResponse<T> {
  ok: boolean;
  data: T;
  error?: string;
}

declare module 'axios' {
  interface AxiosInstance {
    request<T = unknown, R = T, D = unknown>(config: AxiosRequestConfig<D>): Promise<R>;
    get<T = unknown, R = T, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    delete<T = unknown, R = T, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    head<T = unknown, R = T, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    options<T = unknown, R = T, D = unknown>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    post<T = unknown, R = T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    put<T = unknown, R = T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    patch<T = unknown, R = T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
  }
}

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response: AxiosResponse) => {
    const data = response.data;
    if (data && typeof data === 'object' && 'ok' in data) {
      if (data.ok) {
        return data.data;
      }
      return Promise.reject(new Error(data.error || '请求失败'));
    }
    return data;
  },
  (error) => {
    const message = error.response?.data?.error || error.message || '网络错误';
    return Promise.reject(new Error(message));
  }
);

export default api;
