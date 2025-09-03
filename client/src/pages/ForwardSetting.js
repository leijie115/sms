// client/src/pages/ForwardSetting.js
import React, { useState, useEffect } from 'react';
import { 
  Card, Tabs, Form, Input, Switch, Button, Select, Tag, Space, 
  message, Divider, Typography, Alert, Row, Col, Statistic,
  Tooltip, Badge, Spin, InputNumber
} from 'antd';
import { 
  SendOutlined, SaveOutlined, ApiOutlined, RobotOutlined, MessageOutlined,
  BellOutlined, InfoCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined, SyncOutlined, FilterOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

function ForwardSetting() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ devices: [], simCards: [] });
  const [settings, setSettings] = useState({
    telegram: null,
    bark: null,
    webhook: null
  });
  const [forms] = useState({
    telegram: Form.useForm()[0],
    bark: Form.useForm()[0],
    webhook: Form.useForm()[0]
  });

  const api = axios.create({
    baseURL: '/api',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  useEffect(() => {
    fetchAllSettings();
    fetchStatistics();
    fetchFilterOptions();
  }, []);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const platforms = ['telegram', 'bark', 'webhook'];
      const promises = platforms.map(platform => 
        api.get(`/forward-settings/${platform}`)
      );
      
      const responses = await Promise.all(promises);
      const newSettings = {};
      
      responses.forEach((response, index) => {
        const platform = platforms[index];
        newSettings[platform] = response.data.data;
        forms[platform].setFieldsValue(response.data.data);
      });
      
      setSettings(newSettings);
    } catch (error) {
      message.error('获取转发设置失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/forward-settings/statistics');
      setStatistics(response.data.data);
    } catch (error) {
      console.error('获取统计数据失败:', error);
      // 设置默认统计数据，避免页面错误
      setStatistics({
        platforms: [],
        summary: {
          totalForwarded: 0,
          totalFailed: 0,
          enabledCount: 0,
          totalPlatforms: 0,
          successRate: '0'
        }
      });
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await api.get('/forward-settings/filters');
      setFilterOptions(response.data.data);
    } catch (error) {
      console.error('获取过滤选项失败');
    }
  };

  const handleSave = async (platform) => {
    try {
      const values = await forms[platform].validateFields();
      
      await api.put(`/forward-settings/${platform}`, values);
      message.success('保存成功');
      
      // 更新本地状态
      setSettings(prev => ({
        ...prev,
        [platform]: { ...prev[platform], ...values }
      }));
      
      // 刷新统计
      fetchStatistics();
    } catch (error) {
      if (error.errorFields) {
        message.error('请检查表单填写是否正确');
      } else {
        message.error('保存失败: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleTest = async (platform) => {
    setTesting(true);
    try {
      const values = await forms[platform].validateFields(['config']);
      
      await api.post(`/forward-settings/${platform}/test`, {
        config: values.config
      });
      
      message.success('测试消息发送成功，请检查接收端');
    } catch (error) {
      if (error.errorFields) {
        message.error('请先填写配置信息');
      } else {
        message.error('测试失败: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setTesting(false);
    }
  };

  const renderTelegramTab = () => (
    <Form form={forms.telegram} layout="vertical">
      <Row gutter={16}>
        <Col span={24}>
          <Alert
            message="Telegram 配置说明"
            description={
              <div>
                <p>1. 在 Telegram 中搜索 @BotFather</p>
                <p>2. 发送 /newbot 创建机器人，获取 Bot Token</p>
                <p>3. 搜索您的机器人并发送任意消息</p>
                <p>4. 访问 https://api.telegram.org/bot[YOUR_TOKEN]/getUpdates 获取 Chat ID</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name="enabled"
            label="启用状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left">基础配置</Divider>
      
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'botToken']}
            label="Bot Token"
            rules={[{ required: true, message: '请输入 Bot Token' }]}
          >
            <Input.Password placeholder="请输入 Telegram Bot Token" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'chatId']}
            label="Chat ID"
            rules={[{ required: true, message: '请输入 Chat ID' }]}
          >
            <Input placeholder="请输入 Chat ID" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'parseMode']}
            label="解析模式"
            initialValue="HTML"
          >
            <Select>
              <Option value="HTML">HTML</Option>
              <Option value="Markdown">Markdown</Option>
              <Option value="">纯文本</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'silentMode']}
            label="静音模式"
            valuePropName="checked"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left">代理设置（可选）</Divider>
      
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'proxy', 'enabled']}
            label="使用代理"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) => 
          prevValues?.config?.proxy?.enabled !== currentValues?.config?.proxy?.enabled
        }
      >
        {({ getFieldValue }) => 
          getFieldValue(['config', 'proxy', 'enabled']) && (
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name={['config', 'proxy', 'host']}
                  label="代理地址"
                >
                  <Input placeholder="例如: 127.0.0.1" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name={['config', 'proxy', 'port']}
                  label="代理端口"
                >
                  <InputNumber style={{ width: '100%' }} placeholder="例如: 1080" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name={['config', 'proxy', 'auth', 'username']}
                  label="代理用户名（可选）"
                >
                  <Input placeholder="代理认证用户名" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name={['config', 'proxy', 'auth', 'password']}
                  label="代理密码（可选）"
                >
                  <Input.Password placeholder="代理认证密码" />
                </Form.Item>
              </Col>
            </Row>
          )
        }
      </Form.Item>

      {renderFilterRules('telegram')}
      {renderMessageTemplate('telegram')}

      <Form.Item style={{ marginTop: 24 }}>
        <Space>
          <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave('telegram')}>
            保存设置
          </Button>
          <Button icon={<SendOutlined />} onClick={() => handleTest('telegram')} loading={testing}>
            发送测试
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  const renderBarkTab = () => (
    <Form form={forms.bark} layout="vertical">
      <Row gutter={16}>
        <Col span={24}>
          <Alert
            message="Bark 配置说明"
            description={
              <div>
                <p>1. 在 iOS 设备上安装 Bark App</p>
                <p>2. 打开 App 获取推送 URL 和设备 Key</p>
                <p>3. 服务器地址默认为 https://api.day.app</p>
                <p>4. 支持自定义服务器地址</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name="enabled"
            label="启用状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left">基础配置</Divider>
      
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'serverUrl']}
            label="服务器地址"
            rules={[{ required: true, message: '请输入服务器地址' }]}
            initialValue="https://api.day.app"
          >
            <Input placeholder="Bark 服务器地址" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'deviceKey']}
            label="设备 Key"
            rules={[{ required: true, message: '请输入设备 Key' }]}
          >
            <Input placeholder="请输入 Bark 设备 Key" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'group']}
            label="消息分组"
            initialValue="短信接收"
          >
            <Input placeholder="消息分组名称" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'sound']}
            label="提示音"
            initialValue="default"
          >
            <Select>
              <Option value="default">默认</Option>
              <Option value="silence">静音</Option>
              <Option value="alarm">alarm</Option>
              <Option value="anticipate">anticipate</Option>
              <Option value="bell">bell</Option>
              <Option value="birdsong">birdsong</Option>
              <Option value="bloom">bloom</Option>
              <Option value="calypso">calypso</Option>
              <Option value="chime">chime</Option>
              <Option value="choo">choo</Option>
              <Option value="descent">descent</Option>
              <Option value="electronic">electronic</Option>
              <Option value="fanfare">fanfare</Option>
              <Option value="glass">glass</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'level']}
            label="推送级别"
            initialValue="active"
          >
            <Select>
              <Option value="active">默认</Option>
              <Option value="timeSensitive">时效性</Option>
              <Option value="passive">被动</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'autoCopy']}
            label="自动复制验证码"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'icon']}
            label="图标 URL"
            initialValue="https://day.app/assets/images/avatar.jpg"
          >
            <Input placeholder="推送图标 URL" />
          </Form.Item>
        </Col>
      </Row>

      {renderFilterRules('bark')}
      {renderMessageTemplate('bark')}

      <Form.Item style={{ marginTop: 24 }}>
        <Space>
          <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave('bark')}>
            保存设置
          </Button>
          <Button icon={<SendOutlined />} onClick={() => handleTest('bark')} loading={testing}>
            发送测试
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  const renderWxPusherTab = () => (
    <Form form={forms.wxpusher} layout="vertical">
      <Row gutter={16}>
        <Col span={24}>
          <Alert
            message="WxPusher 配置说明"
            description={
              <div>
                <p>1. 访问 <a href="https://wxpusher.zjiecode.com" target="_blank" rel="noopener noreferrer">https://wxpusher.zjiecode.com</a> 注册账号</p>
                <p>2. 创建应用，获取 APP Token</p>
                <p>3. 扫码关注应用，获取用户 UID</p>
                <p>4. 支持发送到个人或主题（群组）</p>
                <p>5. 详细文档: <a href="https://wxpusher.zjiecode.com/docs/" target="_blank" rel="noopener noreferrer">https://wxpusher.zjiecode.com/docs/</a></p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name="enabled"
            label="启用状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left">基础配置</Divider>
      
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name={['config', 'appToken']}
            label="APP Token"
            rules={[{ required: true, message: '请输入 APP Token' }]}
            extra="在 WxPusher 后台的应用管理中获取"
          >
            <Input.Password placeholder="请输入 WxPusher APP Token" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name={['config', 'uids']}
            label="接收用户 UID 列表"
            tooltip="多个UID用英文逗号分隔，用户扫码关注应用后获取"
          >
            <Select
              mode="tags"
              placeholder="输入UID后按回车，例如：UID_xxxxx"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name={['config', 'topicIds']}
            label="主题 ID 列表（可选）"
            tooltip="发送到主题（群组），多个主题ID用英文逗号分隔。如果设置了主题，将忽略UID"
          >
            <Select
              mode="tags"
              placeholder="输入主题ID后按回车，例如：12345"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name={['config', 'url']}
            label="原文链接（可选）"
            tooltip="点击消息卡片后跳转的链接"
          >
            <Input placeholder="https://example.com" />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left">
        <Space>
          <InfoCircleOutlined />
          使用说明
        </Space>
      </Divider>

      <Row gutter={16}>
        <Col span={24}>
          <Alert
            message="获取 UID 方法"
            description={
              <ol style={{ marginBottom: 0, paddingLeft: 20 }}>
                <li>让用户扫描应用二维码关注</li>
                <li>在 WxPusher 后台 - 应用管理 - 关注用户 中查看</li>
                <li>或者通过 API 获取关注用户列表</li>
              </ol>
            }
            type="success"
            style={{ marginBottom: 16 }}
          />
        </Col>
      </Row>

      {renderFilterRules('wxpusher')}
      {renderMessageTemplate('wxpusher')}

      <Form.Item style={{ marginTop: 24 }}>
        <Space>
          <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave('wxpusher')}>
            保存设置
          </Button>
          <Button icon={<SendOutlined />} onClick={() => handleTest('wxpusher')} loading={testing}>
            发送测试
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  const renderWebhookTab = () => (
    <Form form={forms.webhook} layout="vertical">
      <Row gutter={16}>
        <Col span={24}>
          <Alert
            message="Webhook 配置说明"
            description={
              <div>
                <p>1. 配置接收短信的 Webhook URL</p>
                <p>2. 支持自定义请求头和超时时间</p>
                <p>3. 请求方法固定为 POST</p>
                <p>4. 消息格式为 JSON</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name="enabled"
            label="启用状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left">基础配置</Divider>
      
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name={['config', 'url']}
            label="Webhook URL"
            rules={[
              { required: true, message: '请输入 Webhook URL' },
              { type: 'url', message: '请输入有效的 URL' }
            ]}
          >
            <Input placeholder="https://example.com/webhook" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'timeout']}
            label="超时时间（毫秒）"
            initialValue={10000}
          >
            <InputNumber 
              style={{ width: '100%' }} 
              min={1000} 
              max={60000} 
              step={1000}
              placeholder="默认 10000" 
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name={['config', 'headers']}
            label="自定义请求头（JSON 格式）"
            tooltip="例如: {&quot;Authorization&quot;: &quot;Bearer token&quot;}"
          >
            <TextArea 
              rows={4} 
              placeholder='{"Authorization": "Bearer token"}'
            />
          </Form.Item>
        </Col>
      </Row>

      {renderFilterRules('webhook')}
      {renderMessageTemplate('webhook')}

      <Form.Item style={{ marginTop: 24 }}>
        <Space>
          <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave('webhook')}>
            保存设置
          </Button>
          <Button icon={<SendOutlined />} onClick={() => handleTest('webhook')} loading={testing}>
            发送测试
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  const renderFilterRules = (platform) => (
    <>
      <Divider orientation="left">
        <Space>
          <FilterOutlined />
          过滤规则（可选）
        </Space>
      </Divider>
      
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name={['filterRules', 'keywords']}
            label="关键词过滤"
            tooltip="只转发包含这些关键词的短信，留空则不过滤"
          >
            <Select
              mode="tags"
              placeholder="输入关键词后按回车，例如：验证码、充值、余额"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name={['filterRules', 'senders']}
            label="发送方号码过滤"
            tooltip="只转发这些号码发送的短信，留空则不过滤"
          >
            <Select
              mode="tags"
              placeholder="输入号码后按回车，例如：10086、95588"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['filterRules', 'devices']}
            label="设备过滤"
            tooltip="只转发这些设备接收的短信"
          >
            <Select
              mode="multiple"
              placeholder="选择设备"
              style={{ width: '100%' }}
            >
              {filterOptions.devices.map(device => (
                <Option key={device.value} value={device.value}>
                  {device.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['filterRules', 'simCards']}
            label="SIM卡过滤"
            tooltip="只转发这些SIM卡接收的短信"
          >
            <Select
              mode="multiple"
              placeholder="选择SIM卡"
              style={{ width: '100%' }}
            >
              {filterOptions.simCards.map(sim => (
                <Option key={sim.value} value={sim.value}>
                  {sim.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </>
  );

  const renderMessageTemplate = (platform) => (
    <>
      <Divider orientation="left">消息模板</Divider>
      
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name="messageTemplate"
            label={
              <Space>
                <span>消息模板</span>
                <Tooltip title="可用变量：{device}, {simcard}, {sender}, {content}, {time}, {slot}, {msisdn}">
                  <InfoCircleOutlined />
                </Tooltip>
              </Space>
            }
            initialValue="📱 新短信\n设备: {device}\nSIM卡: {simcard}\n发送方: {sender}\n内容: {content}\n时间: {time}"
          >
            <TextArea 
              rows={5}
              placeholder="自定义消息格式"
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  );

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>
        <ApiOutlined /> 转发设置
      </Title>

      {/* 统计卡片 */}
      {statistics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="已启用平台"
                value={statistics.summary.enabledCount}
                suffix={`/ ${statistics.summary.totalPlatforms}`}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="总转发次数"
                value={statistics.summary.totalForwarded}
                prefix={<SendOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="成功率"
                value={statistics.summary.successRate}
                prefix={
                  parseFloat(statistics.summary.successRate) > 90 ? 
                    <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                }
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card>
        <Spin spinning={loading}>
          <Tabs defaultActiveKey="telegram">
            <Tabs.TabPane
              tab={
                <Space>
                  <RobotOutlined />
                  Telegram
                  {settings.telegram?.enabled && (
                    <Badge status="success" />
                  )}
                </Space>
              }
              key="telegram"
            >
              {renderTelegramTab()}
            </Tabs.TabPane>
            <Tabs.TabPane
              tab={
                <Space>
                  <BellOutlined />
                  Bark
                  {settings.bark?.enabled && (
                    <Badge status="success" />
                  )}
                </Space>
              }
              key="bark"
            >
              {renderBarkTab()}
            </Tabs.TabPane>
            <Tabs.TabPane
              tab={
                <Space>
                  <MessageOutlined />
                  WxPusher
                  {settings.wxpusher?.enabled && (
                    <Badge status="success" />
                  )}
                </Space>
              }
              key="wxpusher"
            >
              {renderWxPusherTab()}
            </Tabs.TabPane>
            <Tabs.TabPane
              tab={
                <Space>
                  <ApiOutlined />
                  Webhook
                  {settings.webhook?.enabled && (
                    <Badge status="success" />
                  )}
                </Space>
              }
              key="webhook"
            >
              {renderWebhookTab()}
            </Tabs.TabPane>
          </Tabs>
        </Spin>
      </Card>
    </div>
  );
}

export default ForwardSetting;