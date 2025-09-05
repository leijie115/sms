// client/src/pages/SmsMessageManagement.js
import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Space, Modal, Input, Select, DatePicker,
  Tag, message, Row, Col, Typography, Card, Statistic, Descriptions 
} from 'antd';
import { 
  SearchOutlined, ReloadOutlined, MessageOutlined, 
  EyeOutlined, PhoneOutlined, MobileOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

function SmsMessageManagement() {
  const [messages, setMessages] = useState([]);
  const [devices, setDevices] = useState([]);
  const [simCards, setSimCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  
  const [searchText, setSearchText] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [simCardFilter, setSimCardFilter] = useState('');
  const [dateRange, setDateRange] = useState(null);

  const api = axios.create({
    baseURL: '/api',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  // 获取短信列表
  const fetchMessages = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        search: searchText,
        deviceId: deviceFilter,
        simCardId: simCardFilter
      };
      
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      
      const response = await api.get('/sms-messages', { params });
      setMessages(response.data.data);
      setPagination({
        current: response.data.page,
        pageSize: response.data.pageSize,
        total: response.data.total
      });
    } catch (error) {
      message.error('获取短信列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取统计数据
  const fetchStatistics = async () => {
    try {
      const response = await api.get('/sms-messages/statistics', {
        params: { days: 7 }
      });
      setStatistics(response.data.data);
    } catch (error) {
      console.error('获取统计数据失败');
    }
  };

  // 获取设备列表 - 只在组件挂载时调用一次
  const fetchDevices = async () => {
    try {
      const response = await api.get('/devices', { params: { pageSize: 100 } });
      setDevices(response.data.data);
    } catch (error) {
      console.error('获取设备列表失败');
    }
  };

  // 获取SIM卡列表 - 只在组件挂载时调用一次
  const fetchSimCards = async () => {
    try {
      const response = await api.get('/simcards', { params: { pageSize: 100 } });
      setSimCards(response.data.data);
    } catch (error) {
      console.error('获取SIM卡列表失败');
    }
  };

  // 组件挂载时，获取所有初始数据
  useEffect(() => {
    // 初始化加载所有数据
    fetchMessages();
    fetchStatistics();
    fetchDevices();
    fetchSimCards();
  }, []); // 空依赖数组，只在组件挂载时执行

  // 监听筛选条件变化，只重新获取短信列表
  useEffect(() => {
    // 跳过初始渲染
    if (searchText === '' && deviceFilter === '' && simCardFilter === '' && dateRange === null) {
      return;
    }
    // 筛选条件变化时，只重新获取短信列表，不再请求设备和SIM卡
    fetchMessages();
  }, [searchText, deviceFilter, simCardFilter, dateRange]);

  // 手动刷新函数
  const handleRefresh = () => {
    fetchMessages(pagination.current, pagination.pageSize);
    fetchStatistics(); // 同时刷新统计数据
  };

  // 查看详情
  const handleViewDetail = async (record) => {
    try {
      const response = await api.get(`/sms-messages/${record.id}`);
      setSelectedMessage(response.data.data);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('获取短信详情失败');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '设备',
      key: 'device',
      width: 150,
      ellipsis: true,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: 12 }}>{record.device?.name}</div>
          <div style={{ fontSize: 11, color: '#999' }}>
            {record.simCard?.scName} (卡槽{record.simCard?.slot})
          </div>
        </div>
      ),
    },
    {
      title: '发送方',
      dataIndex: 'phNum',
      key: 'phNum',
      width: 140,
      render: (text) => (
        <span style={{ fontFamily: 'monospace' }}>
          <PhoneOutlined /> {text}
        </span>
      ),
    },
    {
      title: '短信内容',
      dataIndex: 'smsBd',
      key: 'smsBd',
      ellipsis: true,
      render: (text) => {
        // 检测验证码
        const codeMatch = text?.match(/(\d{4,6})/);
        const hasCode = codeMatch && text.includes('验证');
        
        return (
          <div>
            {hasCode && (
              <Tag color="blue" style={{ marginBottom: 4 }}>
                验证码: {codeMatch[1]}
              </Tag>
            )}
            <div style={{ 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {text}
            </div>
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <MessageOutlined /> 短信管理
        </Title>
      </div>

      {/* 统计卡片 */}
      {statistics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="今日短信"
                value={statistics.todayCount || 0}
                prefix={<MessageOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="本周短信"
                value={statistics.weekCount || 0}
                prefix={<MessageOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="总短信数"
                value={statistics.totalCount || 0}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="活跃设备"
                value={statistics.activeDevices || 0}
                prefix={<MobileOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 筛选区域 */}
      <div style={{ 
        marginBottom: 16, 
        background: '#fafafa', 
        padding: 12, 
        borderRadius: 6 
      }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="搜索短信内容或手机号"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="设备"
              style={{ width: '100%' }}
              value={deviceFilter}
              onChange={setDeviceFilter}
              allowClear
            >
              <Option value="">全部设备</Option>
              {devices.map(device => (
                <Option key={device.id} value={device.id}>
                  {device.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="SIM卡"
              style={{ width: '100%' }}
              value={simCardFilter}
              onChange={setSimCardFilter}
              allowClear
            >
              <Option value="">全部SIM卡</Option>
              {simCards.map(sim => (
                <Option key={sim.id} value={sim.id}>
                  {sim.scName}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
              onChange={setDateRange}
            />
          </Col>
          <Col xs={24} sm={6} md={2}>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              style={{ width: '100%' }}
            >
              刷新
            </Button>
          </Col>
        </Row>
      </div>

      {/* 表格区域 */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        background: '#fff',
        borderRadius: 6,
        border: '1px solid #f0f0f0'
      }}>
        <Table
          columns={columns}
          dataSource={messages}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            size: 'small',
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSizeOptions: ['20', '50', '100'],
            onChange: (page, pageSize) => {
              fetchMessages(page, pageSize);
            },
          }}
          size="small"
          scroll={{ 
            x: 900,
            y: 'calc(100vh - 420px)'
          }}
        />
      </div>

      {/* 详情弹窗 */}
      <Modal
        title="短信详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedMessage(null);
        }}
        footer={null}
        width={700}
      >
        {selectedMessage && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="消息ID">
              {selectedMessage.id}
            </Descriptions.Item>
            <Descriptions.Item label="接收时间">
              {dayjs(selectedMessage.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="设备信息">
              {selectedMessage.device?.name} ({selectedMessage.device?.devId})
            </Descriptions.Item>
            <Descriptions.Item label="SIM卡信息">
              {selectedMessage.simCard?.scName} - 卡槽{selectedMessage.simCard?.slot}
              <br />
              号码: {selectedMessage.simCard?.msIsdn}
            </Descriptions.Item>
            <Descriptions.Item label="发送方号码">
              {selectedMessage.phNum}
            </Descriptions.Item>
            <Descriptions.Item label="短信内容">
              <TextArea 
                value={selectedMessage.smsBd} 
                readOnly 
                autoSize={{ minRows: 3, maxRows: 10 }}
                style={{ resize: 'none', background: '#f5f5f5' }}
              />
            </Descriptions.Item>
            <Descriptions.Item label="消息时间戳">
              {selectedMessage.msgTs}
            </Descriptions.Item>
            <Descriptions.Item label="短信时间戳">
              {selectedMessage.smsTs}
            </Descriptions.Item>
            <Descriptions.Item label="网络通道">
              {selectedMessage.netCh === 0 ? 'WiFi' : `卡槽${selectedMessage.netCh}`}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

export default SmsMessageManagement;