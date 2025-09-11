// client/src/components/Login/Login.js
import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../../services/api';

function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // 获取来源页面，如果没有则默认跳转到首页
  const from = location.state?.from || '/';

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await login(values.username, values.password);
      localStorage.setItem('token', response.token);
      message.success('登录成功');
      
      // 调用父组件的 onLogin 回调
      onLogin();
      
      // 跳转到原来尝试访问的页面
      navigate(from, { replace: true });
    } catch (error) {
      message.error('用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Card title="后台管理系统" style={{ width: 400 }}>
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名"
              size="large"
              onPressEnter={() => document.querySelector('button[type="submit"]').click()}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
              onPressEnter={() => document.querySelector('button[type="submit"]').click()}
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              size="large"
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>
        
        {/* 如果用户是从其他页面跳转过来的，显示提示 */}
        {from !== '/' && (
          <div style={{ 
            textAlign: 'center', 
            color: '#888', 
            fontSize: '12px',
            marginTop: '10px'
          }}>
            登录后将返回到之前的页面
          </div>
        )}
      </Card>
    </div>
  );
}

export default Login;