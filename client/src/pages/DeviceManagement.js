// client/src/pages/DeviceManagement.js
import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Space, Modal, Form, Input, Select, 
  Tag, message, Row, Col, Card, Typography, Badge, Spin
} from 'antd';
import { 
  PlusOutlined, EditOutlined, SearchOutlined, 
  ReloadOutlined, MobileOutlined 
} from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

function DeviceManagement() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [form] = Form.useForm();
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

  // 获取设备列表
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

  // 获取单个设备的最新数据
  const fetchDeviceDetail = async (deviceId) => {
    setModalLoading(true);
    try {
      const response = await api.get(`/devices/${deviceId}`);
      const device = response.data.data;
      
      // 设置表单数据
      form.setFieldsValue({
        name: device.name,
        status: device.status,
        description: device.description
      });
      
      setEditingDevice(device);
      setModalVisible(true);
    } catch (error) {
      message.error('获取设备详情失败');
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [searchText, statusFilter]);

  // 处理编辑按钮点击
  const handleEdit = async (record) => {
    // 不直接使用列表数据，而是从服务器获取最新数据
    await fetchDeviceDetail(record.id);
  };

  // 处理新增按钮点击
  const handleAdd = () => {
    setEditingDevice(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 处理表单提交
  const handleSubmit = async (values) => {
    setModalLoading(true);
    try {
      if (editingDevice) {
        // 编辑模式：只更新名称、状态和描述
        await api.put(`/devices/${editingDevice.id}`, {
          name: values.name,
          status: values.status,
          description: values.description
        });
        message.success('更新成功');
      } else {
        // 新建模式
        await api.post('/devices', values);
        message.success('创建成功');
      }
      
      setModalVisible(false);
      form.resetFields();
      setEditingDevice(null);
      fetchDevices(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || '操作失败');
    } finally {
      setModalLoading(false);
    }
  };

  const SIM_STATUS_MAP = {
    '202': { text: '基站注册中', color: 'processing' },
    '203': { text: 'ID已读取', color: 'warning' },
    '204': { text: '已就绪', color: 'success' },
    '205': { text: '已弹出', color: 'default' },
    '209': { text: '卡异常', color: 'error' }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '设备ID',
      dataIndex: 'devId',
      key: 'devId',
      width: 120,
      render: (text) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {text}
        </span>
      ),
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusMap = {
          active: { color: 'success', text: '激活' },
          inactive: { color: 'default', text: '未激活' },
          offline: { color: 'error', text: '离线' }
        };
        const config = statusMap[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: 'SIM卡状态',
      key: 'simCards',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.simCards?.map((sim) => {
            const statusConfig = SIM_STATUS_MAP[sim.status] || { 
              text: sim.status || '未知', 
              color: 'default' 
            };
            
            return (
              <div key={sim.id} style={{ marginBottom: 4 }}>
                <Badge 
                  status={
                    statusConfig.color === 'success' ? 'success' : 
                    statusConfig.color === 'error' ? 'error' : 
                    statusConfig.color === 'warning' ? 'warning' : 
                    statusConfig.color === 'processing' ? 'processing' : 
                    'default'
                  }
                  text={`卡槽${sim.slot}: ${statusConfig.text}`}
                />
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
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>
      ),
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
              <Option value="active">激活</Option>
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

      {/* 编辑/新增弹窗 */}
      <Modal
        title={editingDevice ? '编辑设备' : '新增设备'}
        open={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingDevice(null);
        }}
        confirmLoading={modalLoading}
        width={600}
      >
        <Spin spinning={modalLoading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            {editingDevice && (
              <Form.Item label="设备ID">
                <Input value={editingDevice.devId} disabled />
              </Form.Item>
            )}
            
            {!editingDevice && (
              <Form.Item
                name="devId"
                label="设备ID"
                rules={[
                  { required: true, message: '请输入设备ID' },
                  { pattern: /^[a-zA-Z0-9]+$/, message: '设备ID只能包含字母和数字' }
                ]}
              >
                <Input placeholder="请输入设备ID" />
              </Form.Item>
            )}
            
            <Form.Item
              name="name"
              label="设备名称"
              rules={[{ required: true, message: '请输入设备名称' }]}
            >
              <Input placeholder="请输入设备名称" />
            </Form.Item>
            
            <Form.Item
              name="status"
              label="设备状态"
              rules={[{ required: true, message: '请选择设备状态' }]}
              initialValue="active"
            >
              <Select>
                <Option value="active">激活</Option>
                <Option value="inactive">未激活</Option>
                <Option value="offline">离线</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="description"
              label="设备描述"
            >
              <TextArea 
                rows={3} 
                placeholder="请输入设备描述（可选）" 
              />
            </Form.Item>

            {editingDevice && editingDevice.simCards && editingDevice.simCards.length > 0 && (
              <Form.Item label="关联的SIM卡">
                <Card size="small">
                  {editingDevice.simCards.map((sim) => {
                    const statusConfig = SIM_STATUS_MAP[sim.status] || { 
                      text: sim.status || '未知', 
                      color: 'default' 
                    };
                    return (
                      <div key={sim.id} style={{ marginBottom: 8 }}>
                        <Space>
                          <span>卡槽{sim.slot}:</span>
                          <span>{sim.scName}</span>
                          <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
                          <span style={{ fontSize: 12, color: '#999' }}>{sim.msIsdn}</span>
                        </Space>
                      </div>
                    );
                  })}
                </Card>
              </Form.Item>
            )}
          </Form>
        </Spin>
      </Modal>
    </div>
  );
}

export default DeviceManagement;