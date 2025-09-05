// client/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login/Login';
import AdminLayout from './components/Layout/AdminLayout';
import Dashboard from './pages/Dashboard';
import DeviceManagement from './pages/DeviceManagement';
import SimCardManagement from './pages/SimCardManagement';
import SmsMessageManagement from './pages/SmsMessageManagement';
import ForwardSetting from './pages/ForwardSetting';
import LogViewer from './pages/LogViewer';
import { checkAuth } from './services/api';

import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';


dayjs.locale('zh-cn');

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          await checkAuth();
          setIsAuthenticated(true);
        } catch (error) {
          console.log('Token 验证失败:', error);
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      
      setLoading(false);
    };

    validateToken();
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '16px',
        color: '#1890ff'
      }}>
        加载中...
      </div>
    );
  }

  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
              <Navigate to="/" replace /> : 
              <Login onLogin={handleLogin} />
            } 
          />
          <Route
            path="/*"
            element={
              isAuthenticated ? 
              <AdminLayout onLogout={handleLogout}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/devices" element={<DeviceManagement />} />
                  <Route path="/simcards" element={<SimCardManagement />} />
                  <Route path="/sms-messages" element={<SmsMessageManagement />} />
                  <Route path="/forward-settings" element={<ForwardSetting />} />
                  <Route path="/logs" element={<LogViewer />} />
                </Routes>
              </AdminLayout> : 
              <Navigate to="/login" replace />
            }
          />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;