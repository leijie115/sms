import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Modal, Form, Input, Select, message, 
  Space, Tag, Dropdown, Menu, Row, Col, Switch, Descriptions 
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ApiOutlined,
  SearchOutlined, ReloadOutlined, MobileOutlined, MoreOutlined,
  CheckCircleOutlined, SyncOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { Typography } from 'antd';

const { Title } = Typography;
const { Option } = Select;

function DeviceManagement() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [apiModalVisible, setApiModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [testing, setTesting] = useState(false);
  const [form] = Form.useForm();
  const [apiForm] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const api = axios.create({
    baseURL: '/api',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  const fetchDevices = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        search: searchText,
        status: statusFilter
      };
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

  const handleAdd = () => {
    setEditingDevice(null);
    form.resetFields();
    setModalVisible(true);
  };

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

  const handleDelete = async (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个设备吗？删除后相关的SIM卡和短信记录将保留。',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.delete(`/devices/${id}`);
          message.success('删除成功');
          fetchDevices(pagination.current, pagination.pageSize);
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleSubmit = async (values) => {
    try {
      if (editingDevice) {
        await api.put(`/devices/${editingDevice.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/devices', values);
        message.success('创建成功');
      }
      
      setModalVisible(false);
      form.resetFields();
      fetchDevices(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  // API配置
  const handleApiConfig = (device) => {
    setSelectedDevice(device);
    apiForm.setFieldsValue({
      apiUrl: device.apiUrl || '',
      apiToken: device.apiToken || '',
      apiEnabled: device.apiEnabled || false
    });
    setApiModalVisible(true);
  };

  const handleApiSubmit = async (values) => {
    try {
      const response = await api.put(`/devices/${selectedDevice.id}/api`, values);
      message.success('API配置更新成功');
      setApiModalVisible(false);
      apiForm.resetFields();
      fetchDevices(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error('更新失败');
    }
  };

  // 测试连接
  const handleTestConnection = async (device) => {
    setTesting(true);
    try {
      const response = await api.post(`/devices/${device.id}/test`);
      
      if (response.data.success) {
        // 显示详细的设备状态信息
        Modal.success({
          title: '设备连接成功',
          width: 600,
          content: (
            <div>
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="设备ID" span={2}>
                  {response.data.data?.deviceId || device.devId}
                </Descriptions.Item>
                <Descriptions.Item label="硬件版本" span={2}>
                  {response.data.data?.hardware || 'N/A'}
                </Descriptions.Item>
                
                {/* 网络信息 */}
                <Descriptions.Item label="网络类型" span={2}>
                  {response.data.data?.network?.type || 'N/A'}
                </Descriptions.Item>
                {response.data.data?.network?.wifi && (
                  <>
                    <Descriptions.Item label="WiFi SSID">
                      {response.data.data.network.wifi.ssid || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="IP地址">
                      {response.data.data.network.wifi.ip || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="信号强度" span={2}>
                      {response.data.data.network.wifi.signal ? `${response.data.data.network.wifi.signal} dBm` : 'N/A'}
                    </Descriptions.Item>
                  </>
                )}
                
                {/* SIM卡槽1信息 */}
                <Descriptions.Item label="卡槽1状态" span={2}>
                  <Tag color={
                    response.data.data?.simCards?.slot1?.status === 'OK' ? 'green' : 
                    response.data.data?.simCards?.slot1?.status === 'ERR' ? 'red' : 
                    'default'
                  }>
                    {response.data.data?.simCards?.slot1?.status || 'N/A'}
                  </Tag>
                </Descriptions.Item>
                {response.data.data?.simCards?.slot1?.iccId && (
                  <>
                    <Descriptions.Item label="卡槽1 ICCID" span={2}>
                      {response.data.data.simCards.slot1.iccId}
                    </Descriptions.Item>
                    <Descriptions.Item label="卡槽1号码" span={2}>
                      {response.data.data.simCards.slot1.number || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="卡槽1信号">
                      {response.data.data.simCards.slot1.signal ? `${response.data.data.simCards.slot1.signal} dBm` : 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="卡槽1运营商">
                      {response.data.data.simCards.slot1.operator || 'N/A'}
                    </Descriptions.Item>
                  </>
                )}
                
                {/* SIM卡槽2信息 */}
                <Descriptions.Item label="卡槽2状态" span={2}>
                  <Tag color={
                    response.data.data?.simCards?.slot2?.status === 'OK' ? 'green' : 
                    response.data.data?.simCards?.slot2?.status === 'POWON' ? 'blue' :
                    response.data.data?.simCards?.slot2?.status === 'ERR' ? 'red' : 
                    'default'
                  }>
                    {response.data.data?.simCards?.slot2?.status || 'N/A'}
                  </Tag>
                </Descriptions.Item>
                {response.data.data?.simCards?.slot2?.iccId && (
                  <>
                    <Descriptions.Item label="卡槽2 ICCID" span={2}>
                      {response.data.data.simCards.slot2.iccId}
                    </Descriptions.Item>
                    <Descriptions.Item label="卡槽2号码" span={2}>
                      {response.data.data.simCards.slot2.number || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="卡槽2信号">
                      {response.data.data.simCards.slot2.signal ? `${response.data.data.simCards.slot2.signal} dBm` : 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="卡槽2运营商">
                      {response.data.data.simCards.slot2.operator || 'N/A'}
                    </Descriptions.Item>
                  </>
                )}
                
                {/* 其他信息 */}
                <Descriptions.Item label="设备时间" span={2}>
                  {response.data.data?.deviceTime || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="每日重启次数">
                  {response.data.data?.dailyRestart || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="心跳间隔">
                  {response.data.data?.pingInterval ? `${response.data.data.pingInterval}秒` : 'N/A'}
                </Descriptions.Item>
              </Descriptions>
            </div>
          ),
        });
        
        // 刷新设备列表
        fetchDevices();
      } else {
        Modal.error({
          title: '设备连接失败',
          content: response.data.error || '设备无响应，请检查配置',
        });
      }
    } catch (error) {
      Modal.error({
        title: '测试失败',
        content: error.response?.data?.error || error.message || '网络错误',
      });
    } finally {
      setTesting(false);
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
        record.apiEnabled ? 
          <Tag color="green" icon={<CheckCircleOutlined />}>已启用</Tag> : 
          <Tag color="default">未启用</Tag>
      ),
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
      width: 100,
      fixed: 'right',
      render: (_, record) => {
        const menu = (
          <Menu>
            <Menu.Item 
              key="edit" 
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Menu.Item>
            <Menu.Item 
              key="api" 
              icon={<ApiOutlined />}
              onClick={() => handleApiConfig(record)}
            >
              API配置
            </Menu.Item>
            {record.apiEnabled && (
              <>
                <Menu.Item 
                  key="test" 
                  icon={<SyncOutlined />}
                  onClick={() => handleTestConnection(record)}
                >
                  测试连接
                </Menu.Item>
                <Menu.Item 
                  key="reboot" 
                  icon={<ReloadOutlined />}
                  onClick={() => handleRebootDevice(record)}
                >
                  重启设备
                </Menu.Item>
              </>
            )}
            <Menu.Divider />
            <Menu.Item 
              key="delete" 
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDelete(record.id)}
            >
              删除
            </Menu.Item>
          </Menu>
        );

        return (
          <Dropdown overlay={menu} trigger={['click']}>
            <Button type="link" icon={<MoreOutlined />}>
              操作
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
            x: 1000,
            y: 'calc(100vh - 280px)'
          }}
        />
      </div>

      {/* 编辑/新增设备弹窗 */}
      <Modal
        title={editingDevice ? '编辑设备' : '新增设备'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="devId"
            label="设备ID"
            rules={[
              { required: true, message: '请输入设备ID' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: '只能包含字母、数字、下划线和连字符' }
            ]}
          >
            <Input 
              placeholder="请输入设备唯一标识" 
              disabled={!!editingDevice}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="设备名称"
            rules={[{ required: true, message: '请输入设备名称' }]}
          >
            <Input placeholder="请输入设备名称" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            initialValue="active"
          >
            <Select>
              <Option value="active">在线</Option>
              <Option value="inactive">未激活</Option>
              <Option value="offline">离线</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="设备描述信息（可选）" 
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingDevice ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* API配置弹窗 */}
      <Modal
        title={`API配置 - ${selectedDevice?.name}`}
        open={apiModalVisible}
        onCancel={() => {
          setApiModalVisible(false);
          apiForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={apiForm}
          layout="vertical"
          onFinish={handleApiSubmit}
        >
          <Form.Item
            name="apiUrl"
            label="API地址"
            rules={[
              { type: 'url', message: '请输入有效的URL地址' }
            ]}
            extra="例如：http://192.168.1.100"
          >
            <Input placeholder="请输入设备API接口地址" />
          </Form.Item>

          <Form.Item
            name="apiToken"
            label="API Token"
            extra="用于API访问认证的令牌"
          >
            <Input.Password placeholder="请输入API访问令牌" />
          </Form.Item>

          <Form.Item
            name="apiEnabled"
            label="启用API控制"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setApiModalVisible(false);
                apiForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                保存配置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default DeviceManagement;