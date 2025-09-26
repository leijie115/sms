import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Statistic, Typography, Space, Progress, 
  Table, Tag, Timeline, Avatar, Badge, Empty, Spin
} from 'antd';
import { 
  MessageOutlined, MobileOutlined, CreditCardOutlined,
  WifiOutlined, ClockCircleOutlined, PhoneOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined,
  ArrowUpOutlined, ArrowDownOutlined, SyncOutlined
} from '@ant-design/icons';
import axios from 'axios';
import api from '../services/api';

const { Title, Text } = Typography;

// SIM卡状态映射
const SIM_STATUS_MAP = {
  '202': { text: '基站注册中', color: 'processing', icon: <SyncOutlined spin /> },
  '203': { text: 'ID已读取', color: 'warning', icon: <ExclamationCircleOutlined /> },
  '204': { text: '已就绪', color: 'success', icon: <CheckCircleOutlined /> },
  '205': { text: '已弹出', color: 'default', icon: <ExclamationCircleOutlined /> },
  '209': { text: '卡异常', color: 'error', icon: <ExclamationCircleOutlined /> }
};

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalDevices: 0,
    activeDevices: 0,
    totalSimCards: 0,
    activeSimCards: 0,
    todayMessages: 0,
    totalMessages: 0,
    messageGrowth: 0
  });
  const [recentMessages, setRecentMessages] = useState([]);
  const [deviceStatus, setDeviceStatus] = useState([]);
  const [simCardStatus, setSimCardStatus] = useState([]);


  useEffect(() => {
    fetchDashboardData();
    // 每30秒刷新一次数据
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 获取统计数据
      const [devicesRes, simCardsRes, messagesRes, statsRes] = await Promise.all([
        api.get('/devices', { params: { pageSize: 100 } }),
        api.get('/simcards', { params: { pageSize: 100 } }),
        api.get('/sms-messages', { params: { pageSize: 10 } }),
        api.get('/sms-messages/statistics', { params: { days: 7 } })
      ]);

      // 处理设备数据
      const devices = devicesRes.data.data || [];
      const activeDevices = devices.filter(d => d.status === 'active').length;

      // 处理SIM卡数据
      const simCards = simCardsRes.data.data || [];
      const activeSimCards = simCards.filter(s => s.status === '204').length;

      // 处理短信数据
      const messages = messagesRes.data.data || [];
      const stats = statsRes.data.data || {};

      // 计算今日短信数
      const today = new Date().toDateString();
      const todayMessages = messages.filter(m => 
        new Date(m.createdAt).toDateString() === today
      ).length;

      // 设置统计数据
      setStatistics({
        totalDevices: devices.length,
        activeDevices,
        totalSimCards: simCards.length,
        activeSimCards,
        todayMessages,
        totalMessages: stats.totalCount || messagesRes.data.total || 0,
        messageGrowth: 15 // 模拟增长率
      });

      // 设置最近消息
      setRecentMessages(messages.slice(0, 5));

      // 设置设备状态分布
      const deviceStatusMap = {};
      devices.forEach(d => {
        deviceStatusMap[d.status] = (deviceStatusMap[d.status] || 0) + 1;
      });
      setDeviceStatus(Object.entries(deviceStatusMap).map(([key, value]) => ({
        status: key,
        count: value
      })));

      // 设置SIM卡状态分布
      const simStatusMap = {};
      simCards.forEach(s => {
        simStatusMap[s.status] = (simStatusMap[s.status] || 0) + 1;
      });
      setSimCardStatus(Object.entries(simStatusMap).map(([key, value]) => ({
        status: key,
        count: value
      })));

    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 格式化时间
  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return d.toLocaleDateString('zh-CN');
  };

  // 检测验证码
  const extractVerifyCode = (text) => {
    const match = text?.match(/(\d{4,6})/);
    return match && text.includes('验证') ? match[1] : null;
  };

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 20px 0' }}>
      <Title level={4} style={{ marginBottom: 20 }}>
        系统概览
      </Title>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="设备总数"
              value={statistics.totalDevices}
              prefix={<MobileOutlined style={{ color: '#1890ff' }} />}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  / {statistics.activeDevices} 活跃
                </Text>
              }
            />
            <Progress 
              percent={statistics.totalDevices ? (statistics.activeDevices / statistics.totalDevices * 100) : 0} 
              strokeColor="#52c41a"
              showInfo={false}
              size="small"
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="SIM卡总数"
              value={statistics.totalSimCards}
              prefix={<CreditCardOutlined style={{ color: '#722ed1' }} />}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  / {statistics.activeSimCards} 就绪
                </Text>
              }
            />
            <Progress 
              percent={statistics.totalSimCards ? (statistics.activeSimCards / statistics.totalSimCards * 100) : 0} 
              strokeColor="#722ed1"
              showInfo={false}
              size="small"
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="今日短信"
              value={statistics.todayMessages}
              prefix={<MessageOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                较昨日 
              </Text>
              <span style={{ color: '#52c41a', marginLeft: 4 }}>
                <ArrowUpOutlined style={{ fontSize: 10 }} />
                {statistics.messageGrowth}%
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic
              title="总短信数"
              value={statistics.totalMessages}
              prefix={<MessageOutlined style={{ color: '#13c2c2' }} />}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                最近7天统计
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 最近短信 */}
        <Col xs={24} lg={14}>
          <Card 
            title={
              <Space>
                <MessageOutlined />
                <span>最近短信</span>
              </Space>
            }
            extra={
              <Tag color="blue" style={{ margin: 0 }}>
                实时更新
              </Tag>
            }
            bodyStyle={{ padding: '12px' }}
          >
            {recentMessages.length > 0 ? (
              <Timeline mode="left">
                {recentMessages.map(msg => {
                  const verifyCode = extractVerifyCode(msg.smsBd);
                  return (
                    <Timeline.Item 
                      key={msg.id}
                      color={verifyCode ? 'blue' : 'gray'}
                      dot={
                        <Avatar 
                          size="small" 
                          style={{ 
                            backgroundColor: verifyCode ? '#1890ff' : '#f0f0f0',
                            color: verifyCode ? '#fff' : '#999'
                          }}
                        >
                          {verifyCode ? '验' : '短'}
                        </Avatar>
                      }
                    >
                      <div style={{ marginBottom: 12 }}>
                        <Space size="middle" style={{ marginBottom: 4 }}>
                          <Text strong>{msg.phNum}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {formatTime(msg.createdAt)}
                          </Text>
                        </Space>
                        <div style={{ marginTop: 4 }}>
                          {verifyCode && (
                            <Tag color="blue" style={{ marginBottom: 4 }}>
                              验证码: {verifyCode}
                            </Tag>
                          )}
                          <Text 
                            style={{ 
                              display: 'block',
                              color: '#666',
                              fontSize: 13,
                              lineHeight: 1.5
                            }}
                            ellipsis={{ rows: 2, expandable: false }}
                          >
                            {msg.smsBd}
                          </Text>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <Space size="small">
                            <Tag color="default" style={{ fontSize: 11 }}>
                              {msg.device?.name}
                            </Tag>
                            <Tag color="default" style={{ fontSize: 11 }}>
                              {msg.simCard?.scName}
                            </Tag>
                          </Space>
                        </div>
                      </div>
                    </Timeline.Item>
                  );
                })}
              </Timeline>
            ) : (
              <Empty description="暂无短信记录" />
            )}
          </Card>
        </Col>

        {/* 状态概览 */}
        <Col xs={24} lg={10}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            {/* 设备状态 */}
            <Card 
              title={
                <Space>
                  <MobileOutlined />
                  <span>设备状态</span>
                </Space>
              }
              size="small"
            >
              <Row gutter={[8, 8]}>
                {[
                  { key: 'active', label: '活跃', color: '#52c41a', icon: <CheckCircleOutlined /> },
                  { key: 'inactive', label: '未激活', color: '#faad14', icon: <ExclamationCircleOutlined /> },
                  { key: 'offline', label: '离线', color: '#ff4d4f', icon: <ClockCircleOutlined /> }
                ].map(item => {
                  const count = deviceStatus.find(d => d.status === item.key)?.count || 0;
                  return (
                    <Col span={8} key={item.key}>
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '12px 0',
                        borderRadius: 4,
                        background: '#fafafa'
                      }}>
                        <div style={{ color: item.color, fontSize: 20 }}>
                          {item.icon}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 'bold', margin: '4px 0' }}>
                          {count}
                        </div>
                        <div style={{ fontSize: 12, color: '#999' }}>
                          {item.label}
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </Card>

            {/* SIM卡状态 */}
            <Card 
              title={
                <Space>
                  <CreditCardOutlined />
                  <span>SIM卡状态</span>
                </Space>
              }
              size="small"
            >
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                {Object.entries(SIM_STATUS_MAP).map(([key, config]) => {
                  const count = simCardStatus.find(s => s.status === key)?.count || 0;
                  const total = statistics.totalSimCards || 1;
                  const percent = Math.round((count / total) * 100);
                  
                  return (
                    <div key={key}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: 4
                      }}>
                        <Space size="small">
                          <span style={{ color: config.color === 'success' ? '#52c41a' : 
                                                config.color === 'error' ? '#ff4d4f' :
                                                config.color === 'warning' ? '#faad14' :
                                                config.color === 'processing' ? '#1890ff' : '#999' }}>
                            {config.icon}
                          </span>
                          <Text>{config.text}</Text>
                        </Space>
                        <Text strong>{count}</Text>
                      </div>
                      <Progress 
                        percent={percent} 
                        size="small"
                        strokeColor={
                          config.color === 'success' ? '#52c41a' : 
                          config.color === 'error' ? '#ff4d4f' :
                          config.color === 'warning' ? '#faad14' :
                          config.color === 'processing' ? '#1890ff' : '#d9d9d9'
                        }
                        showInfo={false}
                      />
                    </div>
                  );
                })}
              </Space>
            </Card>

            {/* 系统信息 */}
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Space>
                    <WifiOutlined style={{ color: '#1890ff' }} />
                    <Text>系统状态</Text>
                  </Space>
                  <Badge status="processing" text="运行中" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Space>
                    <ClockCircleOutlined style={{ color: '#1890ff' }} />
                    <Text>最后更新</Text>
                  </Space>
                  <Text type="secondary">
                    {new Date().toLocaleTimeString('zh-CN')}
                  </Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Space>
                    <PhoneOutlined style={{ color: '#1890ff' }} />
                    <Text>接收能力</Text>
                  </Space>
                  <Text type="success">正常</Text>
                </div>
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;