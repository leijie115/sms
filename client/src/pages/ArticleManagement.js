import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Space, Modal, Form, Input, Select, 
  Tag, message, Popconfirm, Row, Col, Card, Typography 
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { 
  getArticles, createArticle, updateArticle, 
  deleteArticle, getArticle 
} from '../services/api';

const { TextArea } = Input;
const { Option } = Select;
const { Title } = Typography;

function ArticleManagement() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchArticles = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        search: searchText,
        status: statusFilter
      };
      const response = await getArticles(params);
      setArticles(response.data);
      setPagination({
        current: response.page,
        pageSize: response.pageSize,
        total: response.total
      });
    } catch (error) {
      message.error('获取文章列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [searchText, statusFilter]);

  const handleEdit = async (id) => {
    try {
      const response = await getArticle(id);
      setEditingArticle(response.data);
      form.setFieldsValue({
        ...response.data,
        tags: response.data.tags.join(',')
      });
      setModalVisible(true);
    } catch (error) {
      message.error('获取文章详情失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteArticle(id);
      message.success('删除成功');
      fetchArticles(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const data = {
        ...values,
        tags: values.tags ? values.tags.split(',').map(tag => tag.trim()) : []
      };
      
      if (editingArticle) {
        await updateArticle(editingArticle.id, data);
        message.success('更新成功');
      } else {
        await createArticle(data);
        message.success('创建成功');
      }
      
      setModalVisible(false);
      form.resetFields();
      setEditingArticle(null);
      fetchArticles(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(editingArticle ? '更新失败' : '创建失败');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      fixed: 'left',
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      ellipsis: true,
      render: (text) => (
        <span title={text} style={{ fontWeight: 500 }}>
          {text}
        </span>
      ),
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      width: 100,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status) => (
        <Tag color={status === 'published' ? 'green' : 'orange'}>
          {status === 'published' ? '已发布' : '草稿'}
        </Tag>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      ellipsis: true,
      render: (tags) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {tags.slice(0, 3).map((tag, index) => (
            <Tag key={index} color="blue" style={{ margin: 0 }}>
              {tag}
            </Tag>
          ))}
          {tags.length > 3 && <Tag>+{tags.length - 3}</Tag>}
        </div>
      ),
    },
    {
      title: '浏览',
      dataIndex: 'views',
      key: 'views',
      width: 80,
      align: 'center',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date) => new Date(date).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.id)}
            style={{ padding: '4px 8px' }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这篇文章吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
              style={{ padding: '4px 8px' }}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>文章管理</Title>
      </div>

      {/* 搜索和操作栏 */}
      <div style={{ 
        marginBottom: 16, 
        background: '#fafafa', 
        padding: 12, 
        borderRadius: 6 
      }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6} lg={6}>
            <Input
              placeholder="搜索文章标题或内容"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Select
              placeholder="状态"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Option value="">全部</Option>
              <Option value="published">已发布</Option>
              <Option value="draft">草稿</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchArticles()}
              style={{ width: '100%' }}
            >
              刷新
            </Button>
          </Col>
          <Col xs={24} sm={12} md={4} lg={3}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingArticle(null);
                form.resetFields();
                setModalVisible(true);
              }}
              style={{ width: '100%' }}
            >
              新建文章
            </Button>
          </Col>
        </Row>
      </div>

      {/* 表格 */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        background: '#fff',
        borderRadius: 6,
        border: '1px solid #f0f0f0'
      }}>
        <Table
          columns={columns}
          dataSource={articles}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            size: 'small',
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '30', '50'],
            onChange: (page, pageSize) => {
              fetchArticles(page, pageSize);
            },
          }}
          size="small"
          scroll={{ 
            x: 1200,
            y: 'calc(100vh - 340px)' // 动态计算表格高度
          }}
          style={{ height: '100%' }}
        />
      </div>

      {/* 编辑弹窗 */}
      <Modal
        title={editingArticle ? '编辑文章' : '新建文章'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingArticle(null);
        }}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入文章标题' }]}
          >
            <Input placeholder="请输入文章标题" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="author"
                label="作者"
                rules={[{ required: true, message: '请输入作者' }]}
              >
                <Input placeholder="请输入作者" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                initialValue="draft"
              >
                <Select>
                  <Option value="draft">草稿</Option>
                  <Option value="published">已发布</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="tags"
            label="标签"
            tooltip="多个标签用英文逗号分隔"
          >
            <Input placeholder="标签1,标签2,标签3" />
          </Form.Item>

          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入文章内容' }]}
          >
            <TextArea 
              rows={8} 
              placeholder="请输入文章内容"
              showCount
              maxLength={5000}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
                setEditingArticle(null);
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingArticle ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default ArticleManagement;