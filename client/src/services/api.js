// client/src/services/api.js
import axios from 'axios';

// 创建 axios 实例
const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ========== 认证相关 ==========
export const login = (username, password) => {
  return request.post('/login', { username, password });
};

export const checkAuth = () => {
  return request.get('/check-auth');
};

// ========== 设备管理 ==========
export const getDevices = (params) => {
  return request.get('/devices', { params });
};

export const getDevice = (id) => {
  return request.get(`/devices/${id}`);
};

export const createDevice = (data) => {
  return request.post('/devices', data);
};

export const updateDevice = (id, data) => {
  return request.put(`/devices/${id}`, data);
};

export const deleteDevice = (id) => {
  return request.delete(`/devices/${id}`);
};

// ========== SIM卡管理 ==========
export const getSimCards = (params) => {
  return request.get('/simcards', { params });
};

export const getSimCard = (id) => {
  return request.get(`/simcards/${id}`);
};

export const createSimCard = (data) => {
  return request.post('/simcards', data);
};

export const updateSimCard = (id, data) => {
  return request.put(`/simcards/${id}`, data);
};

export const deleteSimCard = (id) => {
  return request.delete(`/simcards/${id}`);
};

// ========== 短信管理 ==========
export const getSmsMessages = (params) => {
  return request.get('/sms-messages', { params });
};

export const getSmsMessage = (id) => {
  return request.get(`/sms-messages/${id}`);
};

export const getSmsStatistics = (params) => {
  return request.get('/sms-messages/statistics', { params });
};

export const deleteSmsMessage = (id) => {
  return request.delete(`/sms-messages/${id}`);
};

// ========== 转发设置 ==========
export const getForwardSettings = () => {
  return request.get('/forward-settings');
};

export const getForwardSetting = (platform) => {
  return request.get(`/forward-settings/${platform}`);
};

export const updateForwardSetting = (platform, data) => {
  return request.put(`/forward-settings/${platform}`, data);
};

export const testForwardSetting = (platform, config) => {
  return request.post(`/forward-settings/${platform}/test`, { config });
};

export const getForwardStatistics = () => {
  return request.get('/forward-settings/statistics');
};

export const getAvailableFilters = () => {
  return request.get('/forward-settings/filters');
};

// ========== Webhook 日志 ==========
export const getWebhookLogs = (params) => {
  return request.get('/webhook-logs', { params });
};

// ========== 系统日志 ==========
export const getLogFiles = () => {
  return request.get('/logs');
};

export const readLogFile = (filename, params) => {
  return request.get(`/logs/${filename}`, { params });
};

export const tailLog = (params) => {
  return request.get('/logs/tail', { params });
};

export const downloadLogFile = (filename) => {
  const token = localStorage.getItem('token');
  window.open(`/api/logs/${filename}/download?token=${token}`);
};

export const cleanOldLogs = (days) => {
  return request.post('/logs/clean', { days });
};

// 默认导出
export default request;