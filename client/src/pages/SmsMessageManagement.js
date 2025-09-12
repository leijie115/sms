// client/src/pages/SmsMessageManagement.js
import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Space, Modal, Input, Select, DatePicker,
  Tag, message, Row, Col, Typography, Card, Statistic, Descriptions, Tooltip
} from 'antd';
import { 
  SearchOutlined, ReloadOutlined, MessageOutlined, 
  EyeOutlined, PhoneOutlined, MobileOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Paragraph } = Typography;
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
    pageSize: 10,  // 默认改为10条
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
  const fetchMessages = async (page = 1, pageSize = 10) => {
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
    },{
      title: '短信内容',
      dataIndex: 'smsBd',
      key: 'smsBd',
      ellipsis: true,
      render: (text, record) => {
        // 检查是否是发送的短信
        const isSent = text && text.startsWith('[发送]');
        
        // 如果是发送的短信，去掉[发送]标记显示
        const displayText = isSent ? text.substring(5).trim() : text;
        
        // 检测验证码（只在短信类型时检测，不在来电类型时检测）
        const codeMatch = record.msgType !== 'call' ? displayText?.match(/(\d{4,8})/) : null;
        
        return (
          <div style={{ position: 'relative' }}>
            {isSent && (
              <Tag color="blue" style={{ }}>
                发送
              </Tag>
            )}

          <Paragraph
            style={{ marginBottom: 0, paddingTop: isSent ? 12 : 0 }}
            ellipsis={{ rows: 1, tooltip: displayText }}
          >
            {displayText}
          </Paragraph>
           
                {codeMatch && (
                  <Tag color="orange" style={{ marginTop: 12}}>
                    验证码: {codeMatch[1]}
                  </Tag>
                )}
          </div>
        );
      },
    },
    {
      title: '设备/SIM卡',
      key: 'device',
      width: 180,
      ellipsis: true,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>
            {record.device?.name}
          </div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
            {record.simCard?.scName} (卡槽{record.simCard?.slot})
          </div>
          <div style={{ fontSize: 11, color: '#1890ff', marginTop: 2 }}>
            📱 {record.simCard?.msIsdn || '未知号码'}
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
        <span style={{ 
          fontFamily: 'monospace',
          fontSize: 12
        }}>
          {text}
        </span>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
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
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
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

      {/* 表格区域 - 移除了滚动和flex布局 */}
      <div style={{ 
        background: '#fff',
        borderRadius: 6,
        border: '1px solid #f0f0f0',
        padding: '12px'
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
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, pageSize) => {
              fetchMessages(page, pageSize);
            },
          }}
          size="small"
          // 移除了 scroll 属性
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
          <Descriptions bordered column={1} size="small" labelStyle={{ width: 120 }}>
            <Descriptions.Item label="消息ID">
              {selectedMessage.id}
            </Descriptions.Item>
            
            <Descriptions.Item label="消息类型">
              {selectedMessage.msgType === 'sms' ? (
                <Tag color="green">短信</Tag>
              ) : (
                <Tag color="blue">来电</Tag>
              )}
              {selectedMessage.smsBd?.startsWith('[发送]') && (
                <Tag color="blue" style={{ marginLeft: 8 }}>发送</Tag>
              )}
            </Descriptions.Item>
            
            <Descriptions.Item label="时间">
              {dayjs(selectedMessage.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            
            <Descriptions.Item label="设备信息">
              <div>
                <div><strong>设备名称：</strong>{selectedMessage.device?.name}</div>
                <div><strong>设备ID：</strong>{selectedMessage.device?.devId}</div>
              </div>
            </Descriptions.Item>
            
            <Descriptions.Item label="SIM卡信息">
              <div>
                <div><strong>SIM卡名称：</strong>{selectedMessage.simCard?.scName}</div>
                <div><strong>卡槽位置：</strong>卡槽{selectedMessage.simCard?.slot}</div>
                <div><strong>手机号码：</strong>
                  <span style={{ color: '#1890ff', fontFamily: 'monospace' }}>
                    {selectedMessage.simCard?.msIsdn || '未知号码'}
                  </span>
                </div>
                {selectedMessage.simCard?.imsi && (
                  <div><strong>IMSI：</strong>{selectedMessage.simCard?.imsi}</div>
                )}
              </div>
            </Descriptions.Item>
            
            <Descriptions.Item label={selectedMessage.smsBd?.startsWith('[发送]') ? '接收方号码' : '发送方号码'}>
              <span style={{ fontFamily: 'monospace', fontSize: 14 }}>
                {selectedMessage.phNum}
              </span>
            </Descriptions.Item>
            
            <Descriptions.Item label="短信内容">
              <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
                <TextArea 
                  value={
                    selectedMessage.smsBd?.startsWith('[发送]') 
                      ? selectedMessage.smsBd.substring(5).trim()
                      : selectedMessage.smsBd
                  } 
                  readOnly 
                  autoSize={{ minRows: 3, maxRows: 10 }}
                  style={{ 
                    resize: 'none', 
                    background: '#f5f5f5',
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap',
                    maxWidth: '100%'
                  }}
                />
              </div>
            </Descriptions.Item>
            
            {/* 检测并显示验证码（只在短信类型时显示） */}
            {(() => {
              // 如果是来电类型，不显示验证码
              if (selectedMessage.msgType === 'call') {
                return null;
              }
              
              const content = selectedMessage.smsBd?.startsWith('[发送]') 
                ? selectedMessage.smsBd.substring(5).trim()
                : selectedMessage.smsBd;
              const codeMatch = content?.match(/(\d{4,8})/);
              return codeMatch ? (
                <Descriptions.Item label="验证码">
                  <Tag color="orange" style={{ fontSize: 16, padding: '4px 12px' }}>
                    {codeMatch[1]}
                  </Tag>
                </Descriptions.Item>
              ) : null;
            })()}
            
            <Descriptions.Item label="消息时间戳">
              {selectedMessage.msgTs}
            </Descriptions.Item>
            
            <Descriptions.Item label="短信时间戳">
              {selectedMessage.smsTs}
            </Descriptions.Item>
            
            <Descriptions.Item label="网络通道">
              {selectedMessage.netCh === 0 ? 'WiFi' : `卡槽${selectedMessage.netCh}`}
            </Descriptions.Item>
            
            {/* 如果有原始数据，显示更多信息 */}
            {selectedMessage.rawData && (
              <Descriptions.Item label="原始数据">

                <details style={{ cursor: 'pointer', maxWidth: '100%', overflow: 'hidden' }}>
                  <summary>点击查看原始数据</summary>
                  <pre style={{ 
                    background: '#f5f5f5', 
                    padding: 8, 
                    borderRadius: 4,
                    fontSize: 11,
                    marginTop: 8,
                    maxHeight: 200,
                    overflow: 'auto',
                    resize: 'none', 
                    background: '#f5f5f5',
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap',
                    maxWidth: '100%'
                  }}>
                    {JSON.stringify(selectedMessage.rawData, null, 2)}
                  </pre>
                </details>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

export default SmsMessageManagement;