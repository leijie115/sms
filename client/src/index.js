import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './styles/global.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ConfigProvider 
    locale={zhCN}
    theme={{
      // 强制使用亮色主题
      algorithm: theme.defaultAlgorithm,
      token: {
        // 自定义主题色
        colorPrimary: '#1890ff',
        borderRadius: 4,
      },
    }}
  >
    <App />
  </ConfigProvider>
);

if (module.hot) {
  module.hot.accept();
}