import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Space, Modal, Form, Input, Select, 
  Tag, message, Row, Col, Typography, Badge, Switch, InputNumber,
  Tabs, List, Popconfirm, Empty, Radio, Divider
} from 'antd';
import { 
  PlusOutlined, EditOutlined, PhoneOutlined, PhoneFilled,
  SearchOutlined, ReloadOutlined, CreditCardOutlined, CloseCircleOutlined,
  DeleteOutlined, CheckOutlined, SoundOutlined, SendOutlined, MessageOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

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
  const [ttsForm] = Form.useForm();
  const [smsForm] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [callControlModalVisible, setCallControlModalVisible] = useState(false);
  const [selectedSimCard, setSelectedSimCard] = useState(null);
  const [sendingCommand, setSendingCommand] = useState(false);
  const [refreshTimer, setRefreshTimer] = useState(null);
  
  // TTS模板相关状态
  const [ttsTemplates, setTtsTemplates] = useState([]);
  const [ttsModalVisible, setTtsModalVisible] = useState(false);
  const [editingTts, setEditingTts] = useState(null);
  const [ttsInputMode, setTtsInputMode] = useState('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [customTtsContent, setCustomTtsContent] = useState('');
  const [modalLoading, setModalLoading] = useState(false);


  // 新增：短信发送相关状态
  const [smsModalVisible, setSmsModalVisible] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);


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
        status: statusFilter
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

  const fetchTtsTemplates = async () => {
    try {
      const response = await api.get('/tts-templates', { params: { isActive: true } });
      setTtsTemplates(response.data.data);
      
      const defaultTemplate = response.data.data.find(t => t.isDefault);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
      }
    } catch (error) {
      console.error('获取TTS模板失败');
    }
  };

  useEffect(() => {
    fetchSimCards();
    fetchDevices();
    fetchTtsTemplates();
  }, [searchText, statusFilter]);

  // 自动刷新
  useEffect(() => {
    const hasRinging = simCards.some(card => card.callStatus === 'ringing' || card.callStatus === 'connected');
    
    if (hasRinging) {
      const timer = setInterval(() => {
        fetchSimCards(pagination.current, pagination.pageSize);
      }, 3000);
      setRefreshTimer(timer);
      
      return () => {
        if (timer) clearInterval(timer);
      };
    } else {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        setRefreshTimer(null);
      }
    }
  }, [simCards]);

  const handleEdit = async (record) => {
    try {
      // 先打开 Modal 并显示加载状态
      setModalVisible(true);
      setModalLoading(true);
      
      // 清空表单，避免显示旧数据
      form.resetFields();
      
      // 获取最新的SIM卡数据
      const response = await api.get(`/simcards/${record.id}`);
      const latestData = response.data.data || response.data;
      
      setEditingSimCard(latestData);
      form.setFieldsValue({
        deviceId: latestData.deviceId,
        slot: latestData.slot,
        msIsdn: latestData.msIsdn,
        imsi: latestData.imsi,
        iccId: latestData.iccId,
        scName: latestData.scName,
        status: latestData.status,
        // 自动接听配置
        autoAnswer: latestData.autoAnswer || false,
        autoAnswerDelay: latestData.autoAnswerDelay || 5,
        autoAnswerTtsTemplateId: latestData.autoAnswerTtsTemplateId,
        autoAnswerDuration: latestData.autoAnswerDuration || 55,
        autoAnswerTtsRepeat: latestData.autoAnswerTtsRepeat || 2,
        autoAnswerPauseTime: latestData.autoAnswerPauseTime || 1,
        autoAnswerAfterAction: latestData.autoAnswerAfterAction || 1
      });
      
    } catch (error) {
      message.error('获取SIM卡信息失败：' + (error.response?.data?.message || error.message));
      console.error('Failed to fetch SIM card:', error);
      // 获取失败时关闭 Modal
      setModalVisible(false);
    } finally {
      // 无论成功还是失败，都要关闭加载状态
      setModalLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setModalLoading(true);
      
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
    } finally {
      setModalLoading(false);
    }
  };

  // TTS模板管理
  const handleTtsSubmit = async (values) => {
    try {
      if (editingTts) {
        await api.put(`/tts-templates/${editingTts.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/tts-templates', values);
        message.success('创建成功');
      }
      
      setTtsModalVisible(false);
      ttsForm.resetFields();
      setEditingTts(null);
      fetchTtsTemplates();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDeleteTts = async (id) => {
    try {
      await api.delete(`/tts-templates/${id}`);
      message.success('删除成功');
      fetchTtsTemplates();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSetDefaultTts = async (id) => {
    try {
      await api.post(`/tts-templates/${id}/set-default`);
      message.success('设置默认模板成功');
      fetchTtsTemplates();
      setSelectedTemplateId(id);
    } catch (error) {
      message.error('设置失败');
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
      pauseTime: 1,
      afterTtsAction: 1
    });
    
    const defaultTemplate = ttsTemplates.find(t => t.isDefault);
    if (defaultTemplate) {
      setSelectedTemplateId(defaultTemplate.id);
      setTtsInputMode('template');
    } else if (ttsTemplates.length > 0) {
      setSelectedTemplateId(ttsTemplates[0].id);
      setTtsInputMode('template');
    } else {
      setTtsInputMode('custom');
    }
    
    setCustomTtsContent('');
    setCallControlModalVisible(true);
  };

  // 接听电话
  const handleAnswerCall = async () => {
    setSendingCommand(true);
    try {
      const values = await callForm.validateFields();
      
      let ttsContent = '';
      if (ttsInputMode === 'template' && selectedTemplateId) {
        const template = ttsTemplates.find(t => t.id === selectedTemplateId);
        ttsContent = template ? template.content : '';
      } else {
        ttsContent = customTtsContent;
      }
      
      if (!ttsContent) {
        message.error('请选择TTS模板或输入自定义内容');
        setSendingCommand(false);
        return;
      }
      
      const response = await api.post(`/simcards/${selectedSimCard.id}/answer`, {
        duration: values.duration,
        ttsContent: ttsContent,
        ttsRepeat: values.ttsRepeat,
        pauseTime: values.pauseTime,
        afterTtsAction: values.afterTtsAction
      });
      
      if (response.data.success) {
        message.success('接听命令已发送');
        setCallControlModalVisible(false);
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
        fetchSimCards(pagination.current, pagination.pageSize);
      }
    } catch (error) {
      message.error(error.response?.data?.message || '挂断命令发送失败');
    } finally {
      setSendingCommand(false);
    }
  };

  // 新增：打开发送短信弹窗
  const handleSendSms = (simCard) => {
    if (!simCard.device?.apiEnabled) {
      message.warning('请先配置并启用设备API');
      return;
    }
    
    if (simCard.status !== '204') {
      message.warning('SIM卡状态未就绪，无法发送短信');
      return;
    }
    
    setSelectedSimCard(simCard);
    smsForm.resetFields();
    setSmsModalVisible(true);
  };

  // 新增：发送短信
  const handleSmsSubmit = async (values) => {
    setSendingSms(true);
    try {
      const response = await api.post(`/simcards/${selectedSimCard.id}/send-sms`, {
        phoneNumber: values.phoneNumber,
        content: values.content
      });
      
      if (response.success) {
        message.success('短信发送成功');
        setSmsModalVisible(false);
        smsForm.resetFields();
      } else {
        message.error(response.message || '短信发送失败');
      }
    } catch (error) {
      message.error('短信发送失败：' + (error.response?.data?.message || error.message));
    } finally {
      setSendingSms(false);
    }
  };


  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 20,
    },
    {
      title: 'SIM卡信息',
      key: 'simInfo',
      width: 100,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.scName}
            <Tag color="blue" style={{ marginLeft: 8 }}>卡槽{record.slot}</Tag>
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            设备：{record.device?.name || '-'}
          </div>
          <div style={{ fontSize: 11, color: '#999' }}>
            ID：{record.device?.devId || '-'}
          </div>
        </div>
      ),
    },
    {
      title: '手机号',
      dataIndex: 'msIsdn',
      key: 'msIsdn',
      width: 80,
      render: (text) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 60,
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
      width: 60,
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
      title: '自动接听',
      key: 'autoAnswer',
      width: 50,
      render: (_, record) => {
        if (record.autoAnswer) {
          return (
            <Tag color="green" icon={<CheckOutlined />}>
              {record.autoAnswerDelay}秒
            </Tag>
          );
        }
        return <Tag color="default">关闭</Tag>;
      }
    },
    {
      title: '最后来电',
      key: 'lastCall',
      width: 110,
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
      width: 140,
      render: (date) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => {
        const isRinging = record.callStatus === 'ringing';
        const isConnected = record.callStatus === 'connected';
        const canControl = record.device?.apiEnabled;
        
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
              icon={<MessageOutlined />}
              onClick={() => handleSendSms(record)}
              disabled={!record.device?.apiEnabled || record.status !== '204'}
            >
              发短信
            </Button>
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
      <Tabs defaultActiveKey="simcards">
        <TabPane tab="SIM卡列表" key="simcards">
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
              <Col xs={24} sm={12} md={8}>
                <Input
                  placeholder="搜索：设备/SIM卡/手机号/IMSI/ICCID"
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                />
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Select
                  placeholder="SIM卡状态"
                  style={{ width: '100%' }}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  allowClear
                >
                  <Option value="">全部状态</Option>
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
              <Col xs={24} sm={12} md={4}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingSimCard(null);
                    form.resetFields();
                    form.setFieldsValue({ status: '204' });
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
                x: 1100,
                y: 'calc(100vh - 380px)'
              }}
              rowClassName={(record) => {
                if (record.callStatus === 'ringing') return 'ringing-row';
                if (record.callStatus === 'connected') return 'connected-row';
                return '';
              }}
            />
          </div>
        </TabPane>

        <TabPane tab="TTS模板设置" key="tts">
          <div style={{ marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>
              <SoundOutlined /> TTS语音模板
            </Title>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingTts(null);
                ttsForm.resetFields();
                setTtsModalVisible(true);
              }}
            >
              新增模板
            </Button>
          </div>

          <List
            bordered
            dataSource={ttsTemplates}
            locale={{ emptyText: <Empty description="暂无TTS模板" /> }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  item.isDefault ? (
                    <Tag color="green" icon={<CheckOutlined />}>默认</Tag>
                  ) : (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => handleSetDefaultTts(item.id)}
                    >
                      设为默认
                    </Button>
                  ),
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      setEditingTts(item);
                      ttsForm.setFieldsValue(item);
                      setTtsModalVisible(true);
                    }}
                  >
                    编辑
                  </Button>,
                  <Popconfirm
                    title="确定删除这个模板吗？"
                    onConfirm={() => handleDeleteTts(item.id)}
                  >
                    <Button type="link" size="small" danger>
                      删除
                    </Button>
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  title={item.name}
                  description={item.content}
                />
              </List.Item>
            )}
          />
        </TabPane>
      </Tabs>

      {/* 新增：发送短信弹窗 */}
      <Modal
        title={
          <Space>
            <SendOutlined />
            发送短信
          </Space>
        }
        open={smsModalVisible}
        onCancel={() => {
          if (!sendingSms) {
            setSmsModalVisible(false);
            smsForm.resetFields();
            setSelectedSimCard(null);
          }
        }}
        footer={null}
        width={500}
        maskClosable={!sendingSms}
        closable={!sendingSms}
      >
        <Form
          form={smsForm}
          layout="vertical"
          onFinish={handleSmsSubmit}
        >
          <div style={{ 
            marginBottom: 16, 
            padding: 12, 
            background: '#f0f9ff', 
            borderRadius: 6,
            border: '1px solid #bae7ff'
          }}>
            <Space direction="vertical" style={{ width: '100%' }} size={4}>
              <div>
                <strong>设备：</strong>{selectedSimCard?.device?.name}
              </div>
              <div>
                <strong>SIM卡：</strong>{selectedSimCard?.scName}（卡槽{selectedSimCard?.slot}）
              </div>
              <div>
                <strong>手机号：</strong>{selectedSimCard?.msIsdn || '未知'}
              </div>
            </Space>
          </div>

          <Form.Item
            name="phoneNumber"
            label="接收号码"
            rules={[
              { required: true, message: '请输入接收号码' },
              { pattern: /^[\d+]+$/, message: '请输入有效的手机号码' }
            ]}
          >
            <Input 
              placeholder="请输入接收方手机号码" 
              prefix={<PhoneOutlined />}
              maxLength={20}
            />
          </Form.Item>

          <Form.Item
            name="content"
            label="短信内容"
            rules={[
              { required: true, message: '请输入短信内容' },
              { max: 500, message: '短信内容不能超过500个字符' }
            ]}
          >
            <TextArea 
              rows={4} 
              placeholder="请输入短信内容"
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button 
                onClick={() => {
                  setSmsModalVisible(false);
                  smsForm.resetFields();
                  setSelectedSimCard(null);
                }}
                disabled={sendingSms}
              >
                取消
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={sendingSms}
                icon={<SendOutlined />}
              >
                发送
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑/新建SIM卡弹窗 */}
      <Modal
        title={editingSimCard ? '编辑SIM卡' : '新建SIM卡'}
        open={modalVisible}
        confirmLoading={modalLoading}
        onCancel={() => {
          // 如果正在加载，不允许关闭
          if (!modalLoading) {
            setModalVisible(false);
            form.resetFields();
            setEditingSimCard(null);
          }
        }}
        footer={null}
        width={700}
        maskClosable={!modalLoading}  // 加载时禁止点击遮罩关闭
        closable={!modalLoading}  // 加载时禁止点击关闭按钮
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

          {/* 自动接听配置 */}
          <Divider orientation="left">自动接听配置</Divider>
          
          <Form.Item
            name="autoAnswer"
            label="启用自动接听"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="启用" 
              unCheckedChildren="关闭"
              onChange={(checked) => {
                if (checked && !form.getFieldValue('autoAnswerTtsTemplateId')) {
                  const defaultTemplate = ttsTemplates.find(t => t.isDefault);
                  if (defaultTemplate) {
                    form.setFieldsValue({
                      autoAnswerTtsTemplateId: defaultTemplate.id
                    });
                  }
                }
              }}
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.autoAnswer !== currentValues.autoAnswer
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('autoAnswer') ? (
                <>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="autoAnswerDelay"
                        label="响铃多久后接听（秒）"
                        rules={[{ required: true, message: '请输入延迟时间' }]}
                      >
                        <InputNumber
                          min={1}
                          max={30}
                          style={{ width: '100%' }}
                          placeholder="响铃后等待秒数"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="autoAnswerDuration"
                        label="通话时长（秒）"
                        rules={[{ required: true, message: '请输入通话时长' }]}
                      >
                        <InputNumber
                          min={1}
                          max={300}
                          style={{ width: '100%' }}
                          placeholder="自动挂断时间"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name="autoAnswerTtsTemplateId"
                    label="TTS语音模板"
                    rules={[{ required: true, message: '请选择TTS模板' }]}
                  >
                    <Select placeholder="请选择自动接听时使用的TTS模板">
                      {ttsTemplates.map(template => (
                        <Option key={template.id} value={template.id}>
                          {template.name}
                          {template.isDefault && (
                            <Tag color="green" style={{ marginLeft: 8 }}>默认</Tag>
                          )}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues.autoAnswerTtsTemplateId !== currentValues.autoAnswerTtsTemplateId
                    }
                  >
                    {({ getFieldValue }) => {
                      const templateId = getFieldValue('autoAnswerTtsTemplateId');
                      const template = ttsTemplates.find(t => t.id === templateId);
                      return template ? (
                        <div style={{
                          marginBottom: 16,
                          padding: 8,
                          background: '#f5f5f5',
                          borderRadius: 4,
                          fontSize: 12
                        }}>
                          <strong>TTS内容预览：</strong>
                          {template.content}
                        </div>
                      ) : null;
                    }}
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item
                        name="autoAnswerTtsRepeat"
                        label="TTS播放次数"
                      >
                        <InputNumber
                          min={1}
                          max={10}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name="autoAnswerPauseTime"
                        label="暂停时间（秒）"
                      >
                        <InputNumber
                          min={0}
                          max={10}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name="autoAnswerAfterAction"
                        label="播放完成后"
                      >
                        <Select>
                          <Option value={0}>无操作</Option>
                          <Option value={1}>挂断电话</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              ) : null
            }
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button 
              onClick={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingSimCard(null);
              }}
              disabled={modalLoading}
            >
              取消
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={modalLoading}
            >
              {editingSimCard ? '更新' : '创建'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>

      {/* TTS模板编辑弹窗 */}
      <Modal
        title={editingTts ? '编辑TTS模板' : '新建TTS模板'}
        open={ttsModalVisible}
        onCancel={() => {
          setTtsModalVisible(false);
          ttsForm.resetFields();
          setEditingTts(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={ttsForm}
          layout="vertical"
          onFinish={handleTtsSubmit}
        >
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>

          <Form.Item
            name="content"
            label="TTS语音内容"
            rules={[{ required: true, message: '请输入TTS语音内容' }]}
          >
            <TextArea
              rows={4}
              placeholder="请输入TTS语音内容"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sortOrder"
                label="排序顺序"
                initialValue={0}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="数字越小越靠前"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label="是否启用"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="isDefault"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch checkedChildren="设为默认" unCheckedChildren="非默认" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setTtsModalVisible(false);
                ttsForm.resetFields();
                setEditingTts(null);
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingTts ? '更新' : '创建'}
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
        width={700}
      >
        <Form
          form={callForm}
          layout="vertical"
        >
          {selectedSimCard?.callStatus === 'ringing' ? (
            <>
              <Form.Item
                label="TTS语音内容选择"
                required
              >
                <Radio.Group 
                  value={ttsInputMode} 
                  onChange={(e) => setTtsInputMode(e.target.value)}
                  style={{ marginBottom: 16 }}
                >
                  <Radio value="template">使用模板</Radio>
                  <Radio value="custom">自定义输入</Radio>
                </Radio.Group>

                {ttsInputMode === 'template' ? (
                  <Select
                    value={selectedTemplateId}
                    onChange={setSelectedTemplateId}
                    placeholder="请选择TTS模板"
                    style={{ width: '100%' }}
                  >
                    {ttsTemplates.map(template => (
                      <Option key={template.id} value={template.id}>
                        {template.name}
                        {template.isDefault && <Tag color="green" style={{ marginLeft: 8 }}>默认</Tag>}
                      </Option>
                    ))}
                  </Select>
                ) : (
                  <TextArea
                    value={customTtsContent}
                    onChange={(e) => setCustomTtsContent(e.target.value)}
                    rows={3}
                    placeholder="请输入自定义TTS语音内容"
                  />
                )}

                {ttsInputMode === 'template' && selectedTemplateId && (
                  <div style={{ 
                    marginTop: 8, 
                    padding: 8, 
                    background: '#f5f5f5', 
                    borderRadius: 4,
                    fontSize: 12
                  }}>
                    <strong>预览：</strong> 
                    {ttsTemplates.find(t => t.id === selectedTemplateId)?.content}
                  </div>
                )}
              </Form.Item>

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