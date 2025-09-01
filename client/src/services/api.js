import axios from 'axios';

const API_BASE_URL = '/api';

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证相关
export const login = (username, password) => {
  return api.post('/login', { username, password });
};

export const checkAuth = () => {
  return api.get('/check-auth');
};

// 文章相关
export const getArticles = (params) => {
  return api.get('/articles', { params });
};

export const getArticle = (id) => {
  return api.get(`/articles/${id}`);
};

export const createArticle = (data) => {
  return api.post('/articles', data);
};

export const updateArticle = (id, data) => {
  return api.put(`/articles/${id}`, data);
};

export const deleteArticle = (id) => {
  return api.delete(`/articles/${id}`);
};

export default api;