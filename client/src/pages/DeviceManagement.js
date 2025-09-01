import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Space, Modal, Form, Input, Select, 
  Tag, message, Row, Col, Card, Typography, Badge 
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

  const handleEdit = async (record) => {
    setEditingDevice(record);
    form.setFieldsValue({
      name: record.name,
      status: record.status,
      description: record.description
    });
    setModalVisible(true);
  };

  const handleSubmit = async (values) => {
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
      width: 150,
      render: (text) => (
        <span style={{ fontFamily: 'monospace' }}>{text}</span>
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
        const config = {
          active: { color: 'green', text: '激活' },
          inactive: { color: 'orange', text: '未激活' },
          offline: { color: 'red', text: '离线' }
        };
        return (
          <Tag color={config[status]?.color}>
            {config[status]?.text || status}
          </Tag>
        );
      },
    },
    {
      title: 'SIM卡',
      dataIndex: 'simCards',
      key: 'simCards',
      width: 200,
      render: (simCards) => (
        <Space direction="vertical" size="small">
          {simCards?.map(sim => {
            const statusConfig = SIM_STATUS_MAP[sim.status] || { text: sim.status, color: 'default' };
            return (
              <div key={sim.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge 
                  status={statusConfig.color === 'success' ? 'success' : 
                          statusConfig.color === 'error' ? 'error' : 
                          statusConfig.color === 'warning' ? 'warning' : 
                          statusConfig.color === 'processing' ? 'processing' : 
                          'default'}
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
              onClick={() => {
                setEditingDevice(null);
                form.resetFields();
                setModalVisible(true);
              }}
              style={{ width: '100%' }}
            >
              新建设备
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
            y: 'calc(100vh - 340px)'
          }}
        />
      </div>

      <Modal
        title={editingDevice ? '编辑设备' : '新建设备'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingDevice(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {!editingDevice && (
            <Form.Item
              name="devId"
              label="设备ID"
              rules={[
                { required: true, message: '请输入设备ID' },
                { pattern: /^[a-zA-Z0-9]+$/, message: '设备ID只能包含字母和数字' }
              ]}
              extra="设备ID创建后不能修改"
            >
              <Input placeholder="请输入设备ID" disabled={editingDevice} />
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
            label="状态"
            initialValue="active"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Option value="active">激活</Option>
              <Option value="inactive">未激活</Option>
              <Option value="offline">离线</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={4} placeholder="请输入设备描述" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingDevice(null);
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
    </div>
  );
}

export default DeviceManagement;