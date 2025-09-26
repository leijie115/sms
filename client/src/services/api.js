// client/src/services/api.js
import axios from 'axios';

// 获取 token 的辅助函数 - 同时检查 localStorage 和 sessionStorage
const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 请求拦截器 - 动态添加 token
api.interceptors.request.use(
  config => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 保持原始响应结构，让页面能用 response.data.xxx
api.interceptors.response.use(
  response => {
    // 🔧 关键：返回完整的 response，而不是 response.data
    // 这样页面代码可以继续使用 response.data.xxx
    return response;
  },
  error => {
    if (error.response) {
      const { status, data } = error.response;
      
      // token 无效或过期
      if (status === 401) {
        // 清理所有存储的 token
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        
        // 跳转到登录页
        window.location.href = '/login';
        return Promise.reject(new Error('登录已过期，请重新登录'));
      }
      
      // 其他错误 - 返回错误信息
      return Promise.reject(data || error);
    }
    
    // 网络错误
    return Promise.reject(new Error('网络错误，请检查网络连接'));
  }
);

// 认证相关 API - 特殊处理，因为登录组件可能直接使用返回值
export const login = async (username, password) => {
  const response = await api.post('/login', { username, password });
  // 登录接口特殊处理：直接返回 data
  return response.data;
};

export const checkAuth = async () => {
  const response = await api.get('/check-auth');
  // checkAuth 也直接返回 data
  return response.data;
};

// 设备相关 API - 返回完整 response，让页面使用 response.data
export const getDevices = async (params) => {
  return await api.get('/devices', { params });
};

export const getDevice = async (id) => {
  return await api.get(`/devices/${id}`);
};

export const createDevice = async (data) => {
  return await api.post('/devices', data);
};

export const updateDevice = async (id, data) => {
  return await api.put(`/devices/${id}`, data);
};

export const deleteDevice = async (id) => {
  return await api.delete(`/devices/${id}`);
};

// SIM卡相关 API
export const getSimCards = async (params) => {
  return await api.get('/simcards', { params });
};

export const getSimCard = async (id) => {
  return await api.get(`/simcards/${id}`);
};

export const createSimCard = async (data) => {
  return await api.post('/simcards', data);
};

export const updateSimCard = async (id, data) => {
  return await api.put(`/simcards/${id}`, data);
};

export const sendSms = async (id, data) => {
  return await api.post(`/simcards/${id}/send-sms`, data);
};

// 短信相关 API
export const getSmsMessages = async (params) => {
  return await api.get('/sms-messages', { params });
};

export const getSmsMessage = async (id) => {
  return await api.get(`/sms-messages/${id}`);
};

export const getSmsStatistics = async (params) => {
  return await api.get('/sms-messages/statistics', { params });
};

export const deleteSmsMessage = async (id) => {
  return await api.delete(`/sms-messages/${id}`);
};

// 转发设置相关 API
export const getForwardSettings = async () => {
  return await api.get('/forward-settings');
};

export const getForwardSetting = async (platform) => {
  return await api.get(`/forward-settings/${platform}`);
};

export const updateForwardSetting = async (platform, data) => {
  return await api.put(`/forward-settings/${platform}`, data);
};

export const testForwardSetting = async (platform, data) => {
  return await api.post(`/forward-settings/${platform}/test`, data);
};

export const getForwardStatistics = async () => {
  return await api.get('/forward-settings/statistics');
};

export const getAvailableFilters = async () => {
  return await api.get('/forward-settings/filters');
};

// 日志相关 API
export const getLogFiles = async () => {
  return await api.get('/logs');
};

export const readLogFile = async (filename, params) => {
  return await api.get(`/logs/${filename}`, { params });
};

export const downloadLogFile = async (filename) => {
  const token = getToken();
  window.open(`/api/logs/${filename}/download?token=${token}`);
};

export const cleanOldLogs = async (days) => {
  return await api.post('/logs/clean', { days });
};

export const tailLog = async (params) => {
  return await api.get('/logs/tail', { params });
};

// TTS 模板相关 API
export const getTtsTemplates = async (params) => {
  return await api.get('/tts-templates', { params });
};

export const createTtsTemplate = async (data) => {
  return await api.post('/tts-templates', data);
};

export const updateTtsTemplate = async (id, data) => {
  return await api.put(`/tts-templates/${id}`, data);
};

export const deleteTtsTemplate = async (id) => {
  return await api.delete(`/tts-templates/${id}`);
};

export const setDefaultTtsTemplate = async (id) => {
  return await api.post(`/tts-templates/${id}/set-default`);
};

// 导出 api 实例和 token 获取函数
export { api as default, getToken };