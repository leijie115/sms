import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Space, Modal, Form, Input, Select, 
  Tag, message, Row, Col, Typography 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, 
  SearchOutlined, ReloadOutlined, CreditCardOutlined 
} from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;

// SIM卡状态映射
const SIM_STATUS_MAP = {
  '202': { text: '基站注册中', color: 'processing' },
  '203': { text: 'ID已读取', color: 'warning' },
  '204': { text: '已就绪', color: 'success' },
  '205': { text: '已弹出', color: 'default' },
  '209': { text: '卡异常', color: 'error' }
};

function SimCardManagement() {
  const [simCards, setSimCards] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSimCard, setEditingSimCard] = useState(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');

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
      title: '手机号(MSISDN)',
      dataIndex: 'msIsdn',
      key: 'msIsdn',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: 'IMSI',
      dataIndex: 'imsi',
      key: 'imsi',
      width: 160,
      render: (text) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: 'ICC ID',
      dataIndex: 'iccId',
      key: 'iccId',
      width: 180,
      ellipsis: true,
      render: (text) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {text || '-'}
        </span>
      ),
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
      title: '最后活跃',
      dataIndex: 'lastActiveTime',
      key: 'lastActiveTime',
      width: 160,
      render: (date) => date ? new Date(date).toLocaleString('zh-CN') : '-',
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
          <CreditCardOutlined /> SIM卡管理
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
            x: 1400,
            y: 'calc(100vh - 340px)'
          }}
        />
      </div>

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
    </div>
  );
}

export default SimCardManagement;