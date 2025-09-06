// client/src/pages/DeviceManagement.js
import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Space, Modal, Form, Input, Select, 
  Tag, message, Typography, Row, Col, Switch, Tabs,
  Alert, Dropdown, Menu, Card, InputNumber, Checkbox
} from 'antd';
import { 
  PlusOutlined, EditOutlined, SearchOutlined, ReloadOutlined,
  MobileOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  ClockCircleOutlined, ApiOutlined, PhoneOutlined, 
  PoweroffOutlined, DownOutlined, CloseCircleOutlined, 
  LockOutlined, AudioOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

// SIM卡状态映射
const SIM_STATUS_MAP = {
  '202': { text: '基站注册中', color: 'processing' },
  '203': { text: 'ID已读取', color: 'warning' },
  '204': { text: '已就绪', color: 'success' },
  '205': { text: '已弹出', color: 'default' },
  '209': { text: '卡异常', color: 'error' }
};

function DeviceManagement() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [apiConfigModalVisible, setApiConfigModalVisible] = useState(false);
  const [callControlModalVisible, setCallControlModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [sendingCommand, setSendingCommand] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [form] = Form.useForm();
  const [apiForm] = Form.useForm();
  const [callForm] = Form.useForm();

  const api = axios.create({
    baseURL: '/api',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  // 获取设备列表
  const fetchDevices = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize
      };
      
      if (searchText) params.search = searchText;
      if (statusFilter) params.status = statusFilter;
      
      const response = await api.get('/devices', { params });
      setDevices(response.data.data);
      setPagination({
        current: response.data.page,
        pageSize: response.data.pageSize,
        total: response.data.total
      });
    } catch (error) {
      message.error('获取设备列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [searchText, statusFilter]);

  // 新增设备
  const handleAdd = () => {
    setEditingDevice(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 编辑设备
  const handleEdit = (record) => {
    setEditingDevice(record);
    form.setFieldsValue({
      devId: record.devId,
      name: record.name,
      status: record.status,
      description: record.description
    });
    setModalVisible(true);
  };

  // 保存设备
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingDevice) {
        // 更新
        await api.put(`/devices/${editingDevice.id}`, values);
        message.success('设备更新成功');
      } else {
        // 创建
        await api.post('/devices', values);
        message.success('设备创建成功');
      }
      
      setModalVisible(false);
      fetchDevices(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(editingDevice ? '更新设备失败' : '创建设备失败');
    }
  };

  // 打开API配置弹窗
  const handleApiConfig = (device) => {
    setSelectedDevice(device);
    apiForm.setFieldsValue({
      apiUrl: device.apiUrl || '',
      apiToken: device.apiToken || '',
      apiEnabled: device.apiEnabled || false
    });
    setApiConfigModalVisible(true);
  };

  // 保存API配置
  const handleSaveApiConfig = async () => {
    try {
      const values = await apiForm.validateFields();
      const response = await api.put(`/devices/${selectedDevice.id}/api`, values);
      
      if (response.data.success) {
        message.success('API配置更新成功');
        setApiConfigModalVisible(false);
        fetchDevices(pagination.current, pagination.pageSize);
      }
    } catch (error) {
      message.error('更新API配置失败');
    }
  };

  // 测试设备连接
  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await api.post(`/devices/${selectedDevice.id}/test`);
      if (response.data.success) {
        message.success('设备连接正常');
      } else {
        message.error(response.data.message || '设备连接失败');
      }
    } catch (error) {
      message.error('设备连接失败');
    } finally {
      setTestingConnection(false);
    }
  };

  // 打开电话控制弹窗
  const handleCallControl = (device) => {
    if (!device.apiEnabled) {
      message.warning('请先配置并启用设备API');
      return;
    }
    setSelectedDevice(device);
    callForm.resetFields();
    setCallControlModalVisible(true);
  };

  // 接听电话
  const handleAnswerCall = async () => {
    setSendingCommand(true);
    try {
      const values = await callForm.validateFields();
      const response = await api.post(`/devices/${selectedDevice.id}/answer`, {
        slot: values.slot,
        duration: values.duration,
        ttsContent: values.ttsContent || '',
        ttsRepeat: values.ttsRepeat,
        recording: values.recording,
        speaker: values.speaker
      });
      
      if (response.data.success) {
        message.success('接听命令已发送');
      }
    } catch (error) {
      message.error('接听命令发送失败');
    } finally {
      setSendingCommand(false);
    }
  };

  // 挂断电话
  const handleHangUp = async () => {
    setSendingCommand(true);
    try {
      const values = await callForm.getFieldsValue(['slot']);
      const response = await api.post(`/devices/${selectedDevice.id}/hangup`, {
        slot: values.slot || 1
      });
      
      if (response.data.success) {
        message.success('挂断命令已发送');
      }
    } catch (error) {
      message.error('挂断命令发送失败');
    } finally {
      setSendingCommand(false);
    }
  };

  // 重启设备
  const handleRebootDevice = (device) => {
    Modal.confirm({
      title: '确认重启',
      content: `确定要重启设备 ${device.name} 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await api.post(`/devices/${device.id}/reboot`);
          if (response.data.success) {
            message.success('重启命令已发送');
          }
        } catch (error) {
          message.error('重启命令发送失败');
        }
      }
    });
  };

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '设备ID',
      dataIndex: 'devId',
      key: 'devId',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusMap = {
          active: { color: 'green', text: '在线' },
          inactive: { color: 'orange', text: '未激活' },
          offline: { color: 'red', text: '离线' }
        };
        const config = statusMap[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'API状态',
      key: 'apiStatus',
      width: 100,
      render: (_, record) => (
        record.apiEnabled ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            已启用
          </Tag>
        ) : (
          <Tag color="default" icon={<CloseCircleOutlined />}>
            未启用
          </Tag>
        )
      ),
    },
    {
      title: 'SIM卡状态',
      key: 'simCards',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.simCards?.map(sim => {
            const statusConfig = SIM_STATUS_MAP[sim.status] || { text: '未知', color: 'default' };
            return (
              <div key={sim.id}>
                <Tag 
                  color={
                    statusConfig.color === 'success' ? 'green' : 
                    statusConfig.color === 'error' ? 'red' : 
                    statusConfig.color === 'warning' ? 'orange' : 
                    statusConfig.color === 'processing' ? 'blue' : 
                    'default'
                  }
                >
                  卡槽{sim.slot}: {statusConfig.text}
                </Tag>
              </div>
            );
          })}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 200,
    },
    {
      title: '最后活跃',
      dataIndex: 'lastActiveTime',
      key: 'lastActiveTime',
      width: 180,
      render: (date) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => {
        const menu = (
          <Menu>
            <Menu.Item 
              key="edit" 
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑信息
            </Menu.Item>
            <Menu.Item 
              key="api" 
              icon={<ApiOutlined />}
              onClick={() => handleApiConfig(record)}
            >
              API配置
            </Menu.Item>
            <Menu.Item 
              key="call" 
              icon={<PhoneOutlined />}
              onClick={() => handleCallControl(record)}
              disabled={!record.apiEnabled}
            >
              电话控制
            </Menu.Item>
            <Menu.Item 
              key="reboot" 
              icon={<PoweroffOutlined />}
              onClick={() => handleRebootDevice(record)}
              disabled={!record.apiEnabled}
              danger
            >
              重启设备
            </Menu.Item>
          </Menu>
        );

        return (
          <Dropdown overlay={menu} trigger={['click']}>
            <Button type="link">
              操作 <DownOutlined />
            </Button>
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <MobileOutlined /> 设备管理
        </Title>
      </div>

      {/* 搜索和筛选区域 */}
      <div style={{ 
        marginBottom: 16, 
        background: '#fafafa', 
        padding: 12, 
        borderRadius: 6 
      }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="搜索设备名称或ID"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="状态"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Option value="">全部</Option>
              <Option value="active">在线</Option>
              <Option value="inactive">未激活</Option>
              <Option value="offline">离线</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchDevices()}
              style={{ width: '100%' }}
            >
              刷新
            </Button>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              style={{ width: '100%' }}
            >
              新增设备
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
          dataSource={devices}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            size: 'small',
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => {
              fetchDevices(page, pageSize);
            },
          }}
          size="small"
          scroll={{ 
            x: 1200,
            y: 'calc(100vh - 280px)'
          }}
        />
      </div>

      {/* 编辑/新增设备弹窗 */}
      <Modal
        title={editingDevice ? '编辑设备' : '新增设备'}
        visible={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="devId"
            label="设备ID"
            rules={[
              { required: true, message: '请输入设备ID' },
              { max: 50, message: '设备ID不能超过50个字符' }
            ]}
          >
            <Input placeholder="输入设备唯一标识" disabled={editingDevice} />
          </Form.Item>
          
          <Form.Item
            name="name"
            label="设备名称"
            rules={[
              { required: true, message: '请输入设备名称' },
              { max: 100, message: '设备名称不能超过100个字符' }
            ]}
          >
            <Input placeholder="输入设备名称" />
          </Form.Item>
          
          <Form.Item
            name="status"
            label="设备状态"
            rules={[{ required: true, message: '请选择设备状态' }]}
          >
            <Select placeholder="选择设备状态">
              <Option value="active">在线</Option>
              <Option value="inactive">未激活</Option>
              <Option value="offline">离线</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="description"
            label="设备描述"
          >
            <TextArea rows={3} placeholder="输入设备描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* API配置弹窗 */}
      <Modal
        title={
          <Space>
            <ApiOutlined />
            设备API配置 - {selectedDevice?.name}
          </Space>
        }
        visible={apiConfigModalVisible}
        onCancel={() => setApiConfigModalVisible(false)}
        width={600}
        footer={[
          <Button key="test" 
            onClick={handleTestConnection} 
            loading={testingConnection}
            disabled={!apiForm.getFieldValue('apiEnabled')}
          >
            测试连接
          </Button>,
          <Button key="cancel" onClick={() => setApiConfigModalVisible(false)}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={handleSaveApiConfig}>
            保存
          </Button>
        ]}
      >
        <Form form={apiForm} layout="vertical">
          <Form.Item
            name="apiEnabled"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          
          <Form.Item
            name="apiUrl"
            label="API接口地址"
            rules={[
              { required: true, message: '请输入API地址' },
              { type: 'url', message: '请输入有效的URL' }
            ]}
            extra="例如：http://192.168.7.170（不包含/ctrl）"
          >
            <Input 
              placeholder="http://192.168.7.170" 
              prefix={<ApiOutlined />}
            />
          </Form.Item>
          
          <Form.Item
            name="apiToken"
            label="访问令牌"
            rules={[{ required: true, message: '请输入访问令牌' }]}
            extra="设备的API Token，用于身份验证"
          >
            <Input.Password 
              placeholder="输入设备的API Token" 
              prefix={<LockOutlined />}
            />
          </Form.Item>
          
          <Alert
            message="配置说明"
            description={
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li>API地址：设备的HTTP接口地址，不包含路径</li>
                <li>访问令牌：用于验证API请求的安全令牌</li>
                <li>启用后可以远程控制设备接听/挂断电话、重启等操作</li>
              </ul>
            }
            type="info"
            showIcon
          />
        </Form>
      </Modal>

      {/* 电话控制弹窗 */}
      <Modal
        title={
          <Space>
            <PhoneOutlined />
            电话控制 - {selectedDevice?.name}
          </Space>
        }
        visible={callControlModalVisible}
        onCancel={() => setCallControlModalVisible(false)}
        width={700}
        footer={null}
      >
        <Tabs defaultActiveKey="answer">
          <TabPane 
            tab={
              <Space>
                <PhoneOutlined />
                接听设置
              </Space>
            } 
            key="answer"
          >
            <Form form={callForm} layout="vertical">
              <Form.Item
                name="slot"
                label="SIM卡槽"
                initialValue={1}
                rules={[{ required: true, message: '请选择SIM卡槽' }]}
              >
                <Select>
                  <Option value={1}>卡槽 1</Option>
                  <Option value={2}>卡槽 2</Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                name="duration"
                label="接通后等待时长（秒）"
                initialValue={55}
                rules={[
                  { required: true, message: '请输入等待时长' },
                  { type: 'number', min: 1, max: 300, message: '时长应在1-300秒之间' }
                ]}
              >
                <InputNumber 
                  min={1} 
                  max={300} 
                  style={{ width: '100%' }}
                  placeholder="输入接通后等待时长"
                />
              </Form.Item>
              
              <Form.Item
                name="ttsContent"
                label="TTS语音内容"
                extra="接通后播放的语音内容，留空则不播放"
              >
                <TextArea 
                  rows={3} 
                  placeholder="输入要播放的语音内容，例如：您好，请稍等"
                  maxLength={200}
                  showCount
                />
              </Form.Item>
              
              <Form.Item
                name="ttsRepeat"
                label="TTS播放次数"
                initialValue={2}
              >
                <InputNumber 
                  min={1} 
                  max={10} 
                  style={{ width: '100%' }}
                />
              </Form.Item>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="recording"
                    valuePropName="checked"
                    initialValue={true}
                  >
                    <Checkbox>录音</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="speaker"
                    valuePropName="checked"
                    initialValue={true}
                  >
                    <Checkbox>开启扬声器</Checkbox>
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item>
                <Space style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    icon={<PhoneOutlined />}
                    onClick={handleAnswerCall}
                    loading={sendingCommand}
                    block
                  >
                    接听电话
                  </Button>
                  <Button 
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={handleHangUp}
                    loading={sendingCommand}
                    block
                  >
                    挂断电话
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </TabPane>
          
          <TabPane 
            tab={
              <Space>
                <PoweroffOutlined />
                设备操作
              </Space>
            } 
            key="device"
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Alert
                message="危险操作"
                description="重启设备会中断当前所有通话和操作，请谨慎使用"
                type="warning"
                showIcon
              />
              
              <Button 
                danger
                icon={<PoweroffOutlined />}
                onClick={() => {
                  setCallControlModalVisible(false);
                  handleRebootDevice(selectedDevice);
                }}
                block
                size="large"
              >
                重启设备
              </Button>
            </Space>
          </TabPane>
        </Tabs>
      </Modal>
    </div>
  );
}

export default DeviceManagement;