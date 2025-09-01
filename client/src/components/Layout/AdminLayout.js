import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Grid } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  MobileOutlined,
  CreditCardOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

function AdminLayout({ children, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [manualControl, setManualControl] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();

  useEffect(() => {
    if (!manualControl) {
      if (screens.xs) {
        setCollapsed(true);
      } else if (screens.sm && !screens.md) {
        setCollapsed(true);
      } else if (screens.md && !screens.lg) {
        setCollapsed(true);
      } else if (screens.lg || screens.xl || screens.xxl) {
        setCollapsed(false);
      }
    }
  }, [screens, manualControl]);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
    setManualControl(true);
  };

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if ((width < 768 && screens.lg) || (width >= 1024 && screens.xs)) {
        setManualControl(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [screens]);

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/devices',
      icon: <MobileOutlined />,
      label: '设备管理',
    },
    {
      key: '/simcards',
      icon: <CreditCardOutlined />,
      label: 'SIM卡管理',
    },
    {
      key: '/sms-messages',
      icon: <MessageOutlined />,
      label: '短信管理',
    }
  ];

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: () => {
          localStorage.removeItem('token');
          onLogout();
          navigate('/login');
        }
      }
    ]
  };

  const getCollapsedWidth = () => {
    if (screens.xs) {
      return 0;
    }
    return 80;
  };

  return (
    <Layout style={{ minHeight: '100vh', overflow: 'hidden' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        collapsedWidth={getCollapsedWidth()}
        width={200}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
          transition: 'all 0.2s',
        }}
      >
        <div style={{
          height: 32,
          margin: 16,
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // color: '#000',
          fontWeight: 'bold',
          fontSize: collapsed ? '20px' : '16px',
          transition: 'all 0.2s',
        }}>
          {collapsed ? 'A' : 'Admin System'}
        </div>
        <Menu
          // theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      
      <Layout style={{ 
        marginLeft: screens.xs ? 0 : (collapsed ? getCollapsedWidth() : 200),
        transition: 'margin-left 0.2s',
        height: '100vh',
        overflow: 'hidden'
      }}>
        <Header style={{
          padding: 0,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)',
          height: 56,
          lineHeight: '56px',
          position: 'sticky',
          top: 0,
          zIndex: 9
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapsed}
              style={{
                fontSize: '16px',
                width: 56,
                height: 56,
              }}
            />
            <span style={{ 
              fontSize: '18px', 
              fontWeight: 500,
              display: screens.xs ? 'none' : 'inline'
            }}>
              后台管理系统
            </span>
          </div>
          
          <Dropdown menu={userMenu} placement="bottomRight">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginRight: 16,
              cursor: 'pointer',
              padding: '0 8px',
              borderRadius: '4px',
              transition: 'background 0.3s',
              ':hover': {
                background: '#f0f0f0'
              }
            }}>
              <Avatar 
                icon={<UserOutlined />} 
                size="small"
                style={{ marginRight: 8 }} 
              />
              <span style={{ 
                display: screens.xs ? 'none' : 'inline',
                fontSize: '14px'
              }}>
                管理员
              </span>
            </div>
          </Dropdown>
        </Header>
        
        <Content style={{
          margin: 0,
          padding: screens.xs ? '12px' : '16px',
          background: '#f0f2f5',
          height: 'calc(100vh - 56px)',
          overflow: 'auto'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 6,
            padding: screens.xs ? '12px' : '16px',
            height: '100%',
            overflow: 'auto'
          }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default AdminLayout;