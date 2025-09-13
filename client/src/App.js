// client/src/App.js
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { checkAuth } from './services/api';

// 直接导入登录和布局组件（因为它们是必需的）
import Login from './components/Login/Login';
import AdminLayout from './components/Layout/AdminLayout';

// 懒加载页面组件
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DeviceManagement = lazy(() => import('./pages/DeviceManagement'));
const SimCardManagement = lazy(() => import('./pages/SimCardManagement'));
const SmsMessageManagement = lazy(() => import('./pages/SmsMessageManagement'));
const ForwardSetting = lazy(() => import('./pages/ForwardSetting'));
const LogViewer = lazy(() => import('./pages/LogViewer'));

dayjs.locale('zh-cn');

// 加载中组件
const PageLoading = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '400px',
  }}>
    <Spin size="large" tip="加载中..." />
  </div>
);

// 受保护的路由组件
function ProtectedRoute({ isAuthenticated, loading, children }) {
  const location = useLocation();
  
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
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }
  
  return children;
}

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

  if (loading && !window.location.pathname.includes('/login')) {
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
              <ProtectedRoute isAuthenticated={isAuthenticated} loading={loading}>
                <AdminLayout onLogout={handleLogout}>
                  <Suspense fallback={<PageLoading />}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/devices" element={<DeviceManagement />} />
                      <Route path="/simcards" element={<SimCardManagement />} />
                      <Route path="/sms-messages" element={<SmsMessageManagement />} />
                      <Route path="/forward-settings" element={<ForwardSetting />} />
                      <Route path="/logs" element={<LogViewer />} />
                    </Routes>
                  </Suspense>
                </AdminLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;