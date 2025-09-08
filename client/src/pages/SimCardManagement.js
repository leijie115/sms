import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Space, Modal, Form, Input, Select, 
  Tag, message, Row, Col, Typography, Badge, Switch, InputNumber
} from 'antd';
import { 
  PlusOutlined, EditOutlined, PhoneOutlined, PhoneFilled,
  SearchOutlined, ReloadOutlined, CreditCardOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// SIM卡状态映射
const SIM_STATUS_MAP = {
  '202': { text: '基站注册中', color: 'processing' },
  '203': { text: 'ID已读取', color: 'warning' },
  '204': { text: '已就绪', color: 'success' },
  '205': { text: '已弹出', color: 'default' },
  '209': { text: '卡异常', color: 'error' }
};

// 通话状态映射
const CALL_STATUS_MAP = {
  'idle': { text: '空闲', color: 'default' },
  'ringing': { text: '响铃中', color: 'warning', icon: <PhoneFilled style={{ color: '#faad14' }} /> },
  'connected': { text: '通话中', color: 'processing', icon: <PhoneFilled style={{ color: '#1890ff' }} /> },
  'ended': { text: '已结束', color: 'default' }
};

function SimCardManagement() {
  const [simCards, setSimCards] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSimCard, setEditingSimCard] = useState(null);
  const [form] = Form.useForm();
  const [callForm] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [callControlModalVisible, setCallControlModalVisible] = useState(false);
  const [selectedSimCard, setSelectedSimCard] = useState(null);
  const [sendingCommand, setSendingCommand] = useState(false);
  const [refreshTimer, setRefreshTimer] = useState(null);

  const api = axios.create({
    baseURL: '/api',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  const fetchSimCards = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        search: searchText,
        status: statusFilter,
        deviceId: deviceFilter
      };
      const response = await api.get('/simcards', { params });
      setSimCards(response.data.data);
      setPagination({
        current: response.data.page,
        pageSize: response.data.pageSize,
        total: response.data.total
      });
    } catch (error) {
      message.error('获取SIM卡列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await api.get('/devices', { params: { pageSize: 100 } });
      setDevices(response.data.data);
    } catch (error) {
      console.error('获取设备列表失败');
    }
  };

  useEffect(() => {
    fetchSimCards();
    fetchDevices();
  }, [searchText, statusFilter, deviceFilter]);

  // 自动刷新（当有电话响铃时）
  useEffect(() => {
    const hasRinging = simCards.some(card => card.callStatus === 'ringing' || card.callStatus === 'connected');
    
    if (hasRinging) {
      // 如果有响铃或通话中的SIM卡，每3秒刷新一次
      const timer = setInterval(() => {
        fetchSimCards(pagination.current, pagination.pageSize);
      }, 3000);
      setRefreshTimer(timer);
      
      return () => {
        if (timer) clearInterval(timer);
      };
    } else {
      // 没有活动通话，清除定时器
      if (refreshTimer) {
        clearInterval(refreshTimer);
        setRefreshTimer(null);
      }
    }
  }, [simCards]);

  const handleEdit = async (record) => {
    setEditingSimCard(record);
    form.setFieldsValue({
      deviceId: record.deviceId,
      slot: record.slot,
      msIsdn: record.msIsdn,
      imsi: record.imsi,
      iccId: record.iccId,
      scName: record.scName,
      status: record.status
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingSimCard) {
        await api.put(`/simcards/${editingSimCard.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/simcards', values);
        message.success('创建成功');
      }
      
      setModalVisible(false);
      form.resetFields();
      setEditingSimCard(null);
      fetchSimCards(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  // 打开电话控制弹窗
  const handleCallControl = (simCard) => {
    if (!simCard.device?.apiEnabled) {
      message.warning('请先配置并启用设备API');
      return;
    }
    
    setSelectedSimCard(simCard);
    callForm.resetFields();
    callForm.setFieldsValue({
      duration: 55,
      ttsRepeat: 2,
      recording: true,
      speaker: true
    });
    setCallControlModalVisible(true);
  };

  // 接听电话
  const handleAnswerCall = async () => {
    setSendingCommand(true);
    try {
      const values = await callForm.validateFields();
      const response = await api.post(`/simcards/${selectedSimCard.id}/answer`, {
        duration: values.duration,
        ttsContent: values.ttsContent || '',
        ttsRepeat: values.ttsRepeat,
        recording: values.recording,
        speaker: values.speaker
      });
      
      if (response.data.success) {
        message.success('接听命令已发送');
        setCallControlModalVisible(false);
        // 刷新列表
        fetchSimCards(pagination.current, pagination.pageSize);
      }
    } catch (error) {
      message.error(error.response?.data?.message || '接听命令发送失败');
    } finally {
      setSendingCommand(false);
    }
  };

  // 挂断电话
  const handleHangUp = async () => {
    setSendingCommand(true);
    try {
      const response = await api.post(`/simcards/${selectedSimCard.id}/hangup`);
      
      if (response.data.success) {
        message.success('挂断命令已发送');
        setCallControlModalVisible(false);
        // 刷新列表
        fetchSimCards(pagination.current, pagination.pageSize);
      }
    } catch (error) {
      message.error(error.response?.data?.message || '挂断命令发送失败');
    } finally {
      setSendingCommand(false);
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
      title: '设备',
      key: 'device',
      width: 150,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.device?.name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.device?.devId}</div>
        </div>
      ),
    },
    {
      title: '卡槽',
      dataIndex: 'slot',
      key: 'slot',
      width: 80,
      render: (slot) => `卡槽${slot}`,
    },
    {
      title: 'SIM卡名称',
      dataIndex: 'scName',
      key: 'scName',
      ellipsis: true,
    },
    {
      title: '手机号',
      dataIndex: 'msIsdn',
      key: 'msIsdn',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const config = SIM_STATUS_MAP[status] || { text: status, color: 'default' };
        return (
          <Tag color={config.color}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '通话状态',
      key: 'callStatus',
      width: 140,
      render: (_, record) => {
        const callStatus = record.callStatus || 'idle';
        const config = CALL_STATUS_MAP[callStatus];
        
        if (callStatus === 'ringing') {
          return (
            <Badge dot offset={[-8, 0]} status="processing">
              <Tag color={config.color} icon={config.icon}>
                {config.text}
              </Tag>
            </Badge>
          );
        }
        
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '最后来电',
      key: 'lastCall',
      width: 180,
      render: (_, record) => {
        if (record.lastCallNumber) {
          return (
            <div>
              <div style={{ fontSize: 12 }}>{record.lastCallNumber}</div>
              <div style={{ fontSize: 11, color: '#999' }}>
                {record.lastCallTime ? new Date(record.lastCallTime).toLocaleString('zh-CN') : '-'}
              </div>
            </div>
          );
        }
        return '-';
      },
    },
    {
      title: '最后活跃',
      dataIndex: 'lastActiveTime',
      key: 'lastActiveTime',
      width: 160,
      render: (date) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => {
        const isRinging = record.callStatus === 'ringing';
        const isConnected = record.callStatus === 'connected';
        const canControl = record.device?.apiEnabled;
        
        // 调试信息（生产环境可以删除）
        console.log(`SIM卡 ${record.id}:`, {
          callStatus: record.callStatus,
          apiEnabled: record.device?.apiEnabled,
          deviceName: record.device?.name
        });
        
        return (
          <Space size="small">
            {(isRinging || isConnected) && canControl && (
              <Button
                type="primary"
                danger={isConnected}
                size="small"
                icon={isRinging ? <PhoneOutlined /> : <CloseCircleOutlined />}
                onClick={() => handleCallControl(record)}
              >
                {isRinging ? '接听' : '挂断'}
              </Button>
            )}
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <CreditCardOutlined /> SIM卡管理
          {refreshTimer && (
            <Tag color="processing" style={{ marginLeft: 12 }}>
              <Badge status="processing" text="自动刷新中" />
            </Tag>
          )}
        </Title>
      </div>

      <div style={{ 
        marginBottom: 16, 
        background: '#fafafa', 
        padding: 12, 
        borderRadius: 6 
      }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="搜索名称/号码/IMSI/ICCID"
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
          <Col xs={12} sm={6} md={3}>
            <Select
              placeholder="状态"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Option value="">全部</Option>
              {Object.entries(SIM_STATUS_MAP).map(([value, config]) => (
                <Option key={value} value={value}>
                  {config.text}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchSimCards()}
              style={{ width: '100%' }}
            >
              刷新
            </Button>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingSimCard(null);
                form.resetFields();
                form.setFieldsValue({ status: '204' }); // 默认状态为已就绪
                setModalVisible(true);
              }}
              style={{ width: '100%' }}
            >
              新建SIM卡
            </Button>
          </Col>
        </Row>
      </div>

      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        background: '#fff',
        borderRadius: 6,
        border: '1px solid #f0f0f0'
      }}>
        <Table
          columns={columns}
          dataSource={simCards}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            size: 'small',
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              fetchSimCards(page, pageSize);
            },
          }}
          size="small"
          scroll={{ 
            x: 1600,
            y: 'calc(100vh - 340px)'
          }}
          rowClassName={(record) => {
            if (record.callStatus === 'ringing') return 'ringing-row';
            if (record.callStatus === 'connected') return 'connected-row';
            return '';
          }}
        />
      </div>

      {/* 编辑/新建SIM卡弹窗 */}
      <Modal
        title={editingSimCard ? '编辑SIM卡' : '新建SIM卡'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingSimCard(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {!editingSimCard && (
            <>
              <Form.Item
                name="deviceId"
                label="设备"
                rules={[{ required: true, message: '请选择设备' }]}
              >
                <Select placeholder="请选择设备">
                  {devices.map(device => (
                    <Option key={device.id} value={device.id}>
                      {device.name} ({device.devId})
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="slot"
                label="卡槽"
                rules={[{ required: true, message: '请选择卡槽' }]}
              >
                <Select placeholder="请选择卡槽">
                  <Option value={1}>卡槽1</Option>
                  <Option value={2}>卡槽2</Option>
                </Select>
              </Form.Item>
            </>
          )}

          <Form.Item
            name="scName"
            label="SIM卡名称"
            rules={[{ required: true, message: '请输入SIM卡名称' }]}
          >
            <Input placeholder="请输入SIM卡名称/备注" />
          </Form.Item>

          <Form.Item
            name="msIsdn"
            label="手机号(MSISDN)"
          >
            <Input placeholder="请输入手机号，如：+8613800138000" />
          </Form.Item>

          <Form.Item
            name="imsi"
            label="IMSI"
          >
            <Input placeholder="请输入IMSI号" />
          </Form.Item>

          <Form.Item
            name="iccId"
            label="ICC ID"
          >
            <Input placeholder="请输入ICC ID" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            initialValue="204"
          >
            <Select>
              {Object.entries(SIM_STATUS_MAP).map(([value, config]) => (
                <Option key={value} value={value}>
                  {value} - {config.text}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingSimCard(null);
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingSimCard ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 电话控制弹窗 */}
      <Modal
        title={
          <Space>
            <PhoneOutlined />
            {selectedSimCard?.callStatus === 'ringing' ? '接听来电' : '挂断通话'}
            <Tag color="blue">{selectedSimCard?.scName}</Tag>
            {selectedSimCard?.lastCallNumber && (
              <Tag color="orange">{selectedSimCard.lastCallNumber}</Tag>
            )}
          </Space>
        }
        open={callControlModalVisible}
        onCancel={() => {
          setCallControlModalVisible(false);
          callForm.resetFields();
          setSelectedSimCard(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={callForm}
          layout="vertical"
        >
          {selectedSimCard?.callStatus === 'ringing' ? (
            <>
              <Form.Item
                name="duration"
                label="通话总时长（秒）"
                rules={[{ required: true, message: '请输入通话时长' }]}
                initialValue={55}
                extra="到达时间后将自动挂断电话，默认175秒"
              >
                <InputNumber
                  min={1}
                  max={300}
                  style={{ width: '100%' }}
                  placeholder="通话总时长"
                />
              </Form.Item>

              <Form.Item
                name="ttsContent"
                label="TTS语音内容"
                rules={[{ required: true, message: '请输入TTS语音内容' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="电话接通后向对方播放的TTS语音内容（必填）"
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="ttsRepeat"
                    label="TTS播放次数"
                    initialValue={2}
                    extra="TTS共播放几轮"
                  >
                    <InputNumber
                      min={1}
                      max={10}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="pauseTime"
                    label="暂停时间（秒）"
                    initialValue={1}
                    extra="每轮播放后暂停秒数"
                  >
                    <InputNumber
                      min={0}
                      max={10}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="afterTtsAction"
                label="TTS播放完成后的动作"
                initialValue={1}
              >
                <Select>
                  <Option value={0}>无操作</Option>
                  <Option value={1}>挂断电话</Option>
                </Select>
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => {
                    setCallControlModalVisible(false);
                    callForm.resetFields();
                    setSelectedSimCard(null);
                  }}>
                    取消
                  </Button>
                  <Button
                    type="primary"
                    icon={<PhoneOutlined />}
                    onClick={handleAnswerCall}
                    loading={sendingCommand}
                  >
                    接听
                  </Button>
                </Space>
              </Form.Item>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p>确定要挂断当前通话吗？</p>
                <p style={{ color: '#999', fontSize: 12 }}>
                  设备：{selectedSimCard?.device?.name}
                </p>
                <p style={{ color: '#999', fontSize: 12 }}>
                  卡槽：{selectedSimCard?.slot}
                </p>
              </div>
              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => {
                    setCallControlModalVisible(false);
                    setSelectedSimCard(null);
                  }}>
                    取消
                  </Button>
                  <Button
                    type="primary"
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={handleHangUp}
                    loading={sendingCommand}
                  >
                    挂断
                  </Button>
                </Space>
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      <style jsx>{`
        .ringing-row {
          animation: blink 1s infinite;
          background-color: #fff7e6 !important;
        }
        
        .connected-row {
          background-color: #e6f7ff !important;
        }
        
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default SimCardManagement;