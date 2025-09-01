import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './styles/global.css';

// 保存 root 实例，避免热加载时重复创建
let root = window.__REACT_ROOT__;

if (!root) {
  root = ReactDOM.createRoot(document.getElementById('root'));
  window.__REACT_ROOT__ = root;
}

function render() {
  root.render(
    <ConfigProvider 
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 4,
        },
      }}
    >
      <App />
    </ConfigProvider>
  );
}

render();

// 热模块替换
if (module.hot) {
  module.hot.accept('./App', () => {
    // App 组件更新时重新渲染
    render();
  });
  
  // 接受自身的更新
  module.hot.accept(() => {
    render();
  });
}