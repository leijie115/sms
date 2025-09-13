// client/src/components/Login/Login.js
import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Checkbox } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../../services/api';

const { Text } = Typography;

function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [form] = Form.useForm();

  const navigate = useNavigate();
  const location = useLocation();

  // 兼容 state.from 或 ?redirect=/xxx
  const searchParams = new URLSearchParams(location.search);
  const redirectQS = searchParams.get('redirect');
  const fromState = location.state?.from;
  const from =
    (fromState && fromState !== '/login' && fromState !== '/login/') ? fromState :
    (redirectQS || '/');

  // 读取已记住的用户名（可选：顺便复用到“记住我”默认值）
  const rememberedUsername = localStorage.getItem('remembered_username') || '';
  const initialRemember = !!localStorage.getItem('token'); // 有持久 token 则默认勾选

  const onFinish = async ({ username, password, remember }) => {
    setLoading(true);
    try {
      const res = await login(username, password);
      if (!res?.token) throw new Error('登录响应缺少 token');

      // ✅ token 存放策略
      if (remember) {
        localStorage.setItem('token', res.token);
        sessionStorage.removeItem('token');
        localStorage.setItem('remembered_username', username);
      } else {
        sessionStorage.setItem('token', res.token);
        localStorage.removeItem('token');
        localStorage.removeItem('remembered_username');
      }

      message.success('登录成功');
      if (typeof onLogin === 'function') onLogin();
      navigate(from, { replace: true });
    } catch (error) {
      const apiMsg = error?.response?.data?.message;
      message.error(apiMsg || '用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyEvent = (e) => {
    const isOn = e.getModifierState && e.getModifierState('CapsLock');
    setCapsLockOn(!!isOn);
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        background: '#f5f7fb',
      }}
    >
      <Card
        title="后台管理系统"
        style={{ width: '100%', maxWidth: 400 }}
        headStyle={{ textAlign: 'center' }}
        bodyStyle={{ paddingTop: 20 }}
      >
        <Form
          form={form}
          name="login"
          layout="vertical"
          onFinish={onFinish}
          autoComplete="on"
          requiredMark={false}
          initialValues={{
            username: rememberedUsername,
            remember: initialRemember,
          }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
              autoComplete="username"
              autoFocus
              allowClear
              disabled={loading}
              onKeyUp={handleKeyEvent}
              onKeyDown={handleKeyEvent}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
            extra={capsLockOn ? <Text type="warning">检测到 Caps Lock 已开启，可能会导致密码输入错误</Text> : null}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
              autoComplete="current-password"
              disabled={loading}
              onKeyUp={handleKeyEvent}
              onKeyDown={handleKeyEvent}
            />
          </Form.Item>

          {/* 记住我（持久登录） */}
          <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 8 }}>
            <Checkbox disabled={loading}>记住我</Checkbox>
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              disabled={loading}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        {from !== '/' && (
          <div style={{ textAlign: 'center', color: '#888', fontSize: 12, marginTop: 10 }}>
            登录后将返回到之前的页面
          </div>
        )}
      </Card>
    </div>
  );
}

export default Login;