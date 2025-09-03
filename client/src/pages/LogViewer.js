// client/src/pages/LogViewer.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Table, Button, Space, Select, InputNumber, Typography, 
  Tag, Spin, message, Modal, Input, Row, Col
} from 'antd';
import { 
  FileTextOutlined, DownloadOutlined, ReloadOutlined, 
  DeleteOutlined, EyeOutlined, SearchOutlined 
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

function LogViewer() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logContent, setLogContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [logType, setLogType] = useState('app');
  const [tailLines, setTailLines] = useState(100);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef(null);

  const api = axios.create({
    baseURL: '/api',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  useEffect(() => {
    fetchLogFiles();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        if (selectedFile) {
          viewLogContent(selectedFile);
        }
      }, 5000); // 每5秒刷新一次
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, selectedFile]);

  const fetchLogFiles = async () => {
    setLoading(true);
    try {
      const response = await api.get('/logs');
      setFiles(response.data.data);
    } catch (error) {
      message.error('获取日志文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  const viewLogContent = async (filename) => {
    try {
      const response = await api.get(`/logs/${filename}`, {
        params: { lines: tailLines }
      });
      setLogContent(response.data.data.content);
      setSelectedFile(filename);
      setModalVisible(true);
    } catch (error) {
      message.error('读取日志文件失败');
    }
  };

  const downloadLog = async (filename) => {
    try {
      const response = await api.get(`/logs/${filename}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success('日志文件下载成功');
    } catch (error) {
      message.error('下载日志文件失败');
    }
  };

  const cleanOldLogs = async () => {
    Modal.confirm({
      title: '清理旧日志',
      content: (
        <div>
          <p>请输入要保留的天数（默认30天）：</p>
          <InputNumber min={1} max={365} defaultValue={30} id="clean-days" />
        </div>
      ),
      onOk: async () => {
        const days = document.getElementById('clean-days').value;
        try {
          await api.post('/logs/clean', { days: parseInt(days) });
          message.success(`已清理 ${days} 天前的日志文件`);
          fetchLogFiles();
        } catch (error) {
          message.error('清理日志失败');
        }
      }
    });
  };

  const getLogTypeTag = (type) => {
    const typeMap = {
      'application': { color: 'blue', text: '应用', icon: '📝' },
      'request': { color: 'green', text: '请求', icon: '🌐' },
      'webhook': { color: 'orange', text: 'Webhook', icon: '🔗' },
      'forward': { color: 'purple', text: '转发', icon: '📤' },
      'error': { color: 'red', text: '错误', icon: '❌' },
      'other': { color: 'default', text: '其他', icon: '📄' }
    };
    const config = typeMap[type] || typeMap.other;
    return (
      <Space>
        <span>{config.icon}</span>
        <Tag color={config.color}>{config.text}</Tag>
      </Space>
    );
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <FileTextOutlined />
          <Text>{text}</Text>
          {getLogTypeTag(record.type)}
        </Space>
      )
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100
    },
    {
      title: '修改时间',
      dataIndex: 'modified',
      key: 'modified',
      width: 180,
      render: (date) => new Date(date).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewLogContent(record.name)}
          >
            查看
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => downloadLog(record.name)}
          >
            下载
          </Button>
        </Space>
      )
    }
  ];

  const formatLogContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      let color = 'inherit';
      if (line.includes('[ERROR]')) color = '#ff4d4f';
      else if (line.includes('[WARN]')) color = '#faad14';
      else if (line.includes('[INFO]')) color = '#1890ff';
      else if (line.includes('[SUCCESS]') || line.includes('✅')) color = '#52c41a';
      else if (line.includes('[FAILED]') || line.includes('❌')) color = '#ff4d4f';
      
      return (
        <div key={index} style={{ color, fontFamily: 'monospace', fontSize: 12 }}>
          {line}
        </div>
      );
    });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <FileTextOutlined /> 日志管理
        </Title>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={fetchLogFiles}>
            刷新列表
          </Button>
        </Col>
        <Col>
          <Button danger icon={<DeleteOutlined />} onClick={cleanOldLogs}>
            清理旧日志
          </Button>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={files}
          rowKey="name"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个文件`
          }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <span>日志内容 - {selectedFile}</span>
            <Button
              size="small"
              type={autoRefresh ? 'primary' : 'default'}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? '停止自动刷新' : '自动刷新'}
            </Button>
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setAutoRefresh(false);
        }}
        width="80%"
        footer={[
          <Button key="close" onClick={() => {
            setModalVisible(false);
            setAutoRefresh(false);
          }}>
            关闭
          </Button>
        ]}
      >
        <div style={{ marginBottom: 12 }}>
          <Space>
            <span>显示最后</span>
            <InputNumber
              min={10}
              max={1000}
              value={tailLines}
              onChange={setTailLines}
              style={{ width: 100 }}
            />
            <span>行</span>
            <Button
              size="small"
              onClick={() => viewLogContent(selectedFile)}
            >
              刷新
            </Button>
          </Space>
        </div>
        <div style={{
          maxHeight: 500,
          overflow: 'auto',
          background: '#1e1e1e',
          padding: 12,
          borderRadius: 4,
          color: '#d4d4d4'
        }}>
          {formatLogContent(logContent)}
        </div>
      </Modal>
    </div>
  );
}

export default LogViewer;