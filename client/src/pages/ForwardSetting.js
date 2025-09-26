// client/src/pages/ForwardSetting.js
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Tabs, 
  Form, 
  Input, 
  Switch, 
  Button, 
  message, 
  Row, 
  Col, 
  Select,
  Alert,
  Space,
  Tooltip,
  Divider,
  InputNumber,
  Typography,
  Statistic,
  Grid,
} from 'antd';
import { 
  ApiOutlined, 
  SaveOutlined, 
  SendOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { 
  getForwardSetting, 
  updateForwardSetting, 
  testForwardSetting, 
  getAvailableFilters,
  getForwardStatistics
} from '../services/api';

const { Title } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;
const { useBreakpoint } = Grid;

const ForwardSetting = () => {
  const [activeTab, setActiveTab] = useState('telegram');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [filters, setFilters] = useState({ devices: [], simCards: [] });
  const [statistics, setStatistics] = useState(null);

  const screens = useBreakpoint();
  const isXs = !screens.sm;

  // 🔧 修复：加载平台配置
  const loadPlatformSetting = async (platform) => {
    setLoading(true);
    try {
      const res = await getForwardSetting(platform);
      // 🔧 关键修改：res 现在是完整的 response，需要用 res.data
      if (res.data && res.data.success) {
        form.setFieldsValue(res.data.data);
      }
    } catch (error) {
      message.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 🔧 修复：加载过滤选项
  const loadFilters = async () => {
    try {
      const res = await getAvailableFilters();
      // 🔧 关键修改：res.data 才是实际数据
      if (res.data && res.data.success) {
        setFilters(res.data.data);
      }
    } catch (error) {
      console.error('加载过滤选项失败:', error);
    }
  };

  // 🔧 修复：加载统计数据
  const loadStatistics = async () => {
    try {
      const res = await getForwardStatistics();
      // 🔧 关键修改：res.data 才是实际数据
      if (res.data && res.data.success) {
        setStatistics(res.data.data);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  useEffect(() => {
    loadPlatformSetting(activeTab);
    loadFilters();
    loadStatistics();
  }, [activeTab]);

  // 🔧 修复：保存配置
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      // 特殊处理 WxPusher 的 uids 和 topicIds
      if (activeTab === 'wxpusher') {
        if (values.config && values.config.uids) {
          if (typeof values.config.uids === 'string') {
            values.config.uids = values.config.uids.trim();
          }
        }
        
        if (values.config && values.config.topicIds) {
          if (typeof values.config.topicIds === 'string') {
            values.config.topicIds = values.config.topicIds.trim();
          }
        }
      }
      
      const res = await updateForwardSetting(activeTab, values);
      // 🔧 关键修改：res.data 才是实际数据
      if (res.data && res.data.success) {
        message.success('保存成功');
        // 重新加载统计数据
        loadStatistics();
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 🔧 修复：测试配置
  const handleTest = async () => {
    try {
      const values = await form.validateFields();
      setTesting(true);
      
      // 🔧 关键修改：发送完整的配置对象，而不是只发送 config 部分
      const testData = {
        enabled: values.enabled || false,
        config: values.config || {},
        filterRules: values.filterRules || {},
        messageTemplate: values.messageTemplate || '📱 新短信\n设备: {device}\nSIM卡: {simcard}\n发送方: {sender}\n内容: {content}\n时间: {time}'
      };
      
      // 特殊处理 WxPusher 的测试配置
      if (activeTab === 'wxpusher') {
        if (testData.config.uids && typeof testData.config.uids === 'string') {
          testData.config.uids = testData.config.uids.trim();
        }
        if (testData.config.topicIds && typeof testData.config.topicIds === 'string') {
          testData.config.topicIds = testData.config.topicIds.trim();
        }
      }
      
      // 🔧 发送完整的测试数据对象
      const res = await testForwardSetting(activeTab, testData);
      // 🔧 关键修改：res.data 才是实际数据
      if (res.data && res.data.success) {
        message.success('测试消息发送成功，请检查接收端');
      } else {
        // 如果返回了错误消息，显示它
        message.error(res.data?.message || '测试失败');
      }
    } catch (error) {
      // 🔧 改进错误处理
      const errorMsg = error.response?.data?.message || error.message || '测试失败';
      console.error('测试失败详情:', error.response?.data || error);
      message.error(errorMsg);
    } finally {
      setTesting(false);
    }
  };

  // 获取当前平台的统计数据
  const getCurrentPlatformStats = () => {
    if (!statistics || !statistics.platforms) return null;
    return statistics.platforms.find(p => p.platform === activeTab);
  };

  // 极简统计 Chip（仅用于顶部统计的手机端样式）
  const StatChip = ({ icon, value, label, valueStyle }) => (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        border: '1px solid #f0f0f0',
        borderRadius: 999,
        background: '#fff',
        whiteSpace: 'nowrap',
        lineHeight: 1.1,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span style={{ fontWeight: 600, fontSize: 18, ...(valueStyle || {}) }}>{value}</span>
      <span style={{ fontSize: 12, color: '#999' }}>{label}</span>
    </div>
  );

  // Telegram 配置表单
  const renderTelegramForm = () => (
    <>
      {/* 显示该平台的独立成功率 */}
      {getCurrentPlatformStats() && (
        <Alert
          message={
            <Space>
              <span>Telegram 平台成功率:</span>
              <strong style={{ 
                color: parseFloat(getCurrentPlatformStats().successRate) > 80 ? '#52c41a' : '#faad14' 
              }}>
                {getCurrentPlatformStats().successRate}%
              </strong>
              <span>
                (成功: {getCurrentPlatformStats().forwardCount} / 
                失败: {getCurrentPlatformStats().failCount})
              </span>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

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
            name={['config', 'botToken']}
            label="Bot Token"
            rules={[{ required: true, message: '请输入 Bot Token' }]}
          >
            <Input.Password placeholder="从 @BotFather 获取的 Token" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'chatId']}
            label="Chat ID"
            rules={[{ required: true, message: '请输入 Chat ID' }]}
          >
            <Input placeholder="接收消息的聊天 ID" />
          </Form.Item>
        </Col>
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
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'silentMode']}
            label="静默模式"
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
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Col>
      </Row>

      {form.getFieldValue(['config', 'proxy', 'enabled']) && (
        <>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['config', 'proxy', 'host']}
                label="代理主机"
              >
                <Input placeholder="proxy.example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['config', 'proxy', 'port']}
                label="代理端口"
              >
                <Input placeholder="1080" />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}

      {renderCommonSettings()}
    </>
  );

  // Bark 配置表单
  const renderBarkForm = () => (
    <>
      {/* 显示该平台的独立成功率 */}
      {getCurrentPlatformStats() && (
        <Alert
          message={
            <Space>
              <span>Bark 平台成功率:</span>
              <strong style={{ 
                color: parseFloat(getCurrentPlatformStats().successRate) > 80 ? '#52c41a' : '#faad14' 
              }}>
                {getCurrentPlatformStats().successRate}%
              </strong>
              <span>
                (成功: {getCurrentPlatformStats().forwardCount} / 
                失败: {getCurrentPlatformStats().failCount})
              </span>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

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
            name={['config', 'serverUrl']}
            label="服务器地址"
            rules={[{ required: true, message: '请输入服务器地址' }]}
          >
            <Input placeholder="https://api.day.app" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name={['config', 'deviceKey']}
            label="Device Key"
            rules={[{ required: true, message: '请输入 Device Key' }]}
          >
            <Input placeholder="从 Bark App 获取的 Key" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'sound']}
            label="提示音"
            initialValue="default"
          >
            <Select>
              <Option value="default">默认</Option>
              <Option value="alarm">警报</Option>
              <Option value="anticipate">期待</Option>
              <Option value="bell">铃声</Option>
              <Option value="birdsong">鸟鸣</Option>
              <Option value="bloom">绽放</Option>
              <Option value="calypso">卡吕普索</Option>
              <Option value="chime">风铃</Option>
              <Option value="glass">玻璃</Option>
              <Option value="gotosleep">入睡</Option>
              <Option value="healthnotification">健康通知</Option>
              <Option value="horn">号角</Option>
              <Option value="ladder">阶梯</Option>
              <Option value="mailsent">邮件发送</Option>
              <Option value="minuet">小步舞曲</Option>
              <Option value="multiwayinvitation">多方邀请</Option>
              <Option value="newmail">新邮件</Option>
              <Option value="newsflash">新闻快报</Option>
              <Option value="noir">黑色</Option>
              <Option value="paymentsuccess">支付成功</Option>
              <Option value="silence">静音</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'group']}
            label="分组"
            initialValue="短信转发"
          >
            <Input placeholder="消息分组" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'isArchive']}
            label="自动保存"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name={['config', 'icon']}
            label="图标 URL"
          >
            <Input placeholder="可选，自定义图标" />
          </Form.Item>
        </Col>
      </Row>

      {renderCommonSettings()}
    </>
  );

  // Webhook 配置表单
  const renderWebhookForm = () => (
    <>
      {/* 显示该平台的独立成功率 */}
      {getCurrentPlatformStats() && (
        <Alert
          message={
            <Space>
              <span>Webhook 平台成功率:</span>
              <strong style={{ 
                color: parseFloat(getCurrentPlatformStats().successRate) > 80 ? '#52c41a' : '#faad14' 
              }}>
                {getCurrentPlatformStats().successRate}%
              </strong>
              <span>
                (成功: {getCurrentPlatformStats().forwardCount} / 
                失败: {getCurrentPlatformStats().failCount})
              </span>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

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
              rows={3}
              placeholder='{"Authorization": "Bearer token"}'
            />
          </Form.Item>
        </Col>
      </Row>

      {renderCommonSettings()}
    </>
  );

  // WxPusher 配置表单
  const renderWxPusherForm = () => (
    <>
      {/* 显示该平台的独立成功率 */}
      {getCurrentPlatformStats() && (
        <Alert
          message={
            <Space>
              <span>WxPusher 平台成功率:</span>
              <strong style={{ 
                color: parseFloat(getCurrentPlatformStats().successRate) > 80 ? '#52c41a' : '#faad14' 
              }}>
                {getCurrentPlatformStats().successRate}%
              </strong>
              <span>
                (成功: {getCurrentPlatformStats().forwardCount} / 
                失败: {getCurrentPlatformStats().failCount})
              </span>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Alert
        message="WxPusher 配置说明"
        description={
          <div>
            <p>1. 前往 <a href="https://wxpusher.zjiecode.com" target="_blank" rel="noopener noreferrer">WxPusher官网</a> 注册并创建应用</p>
            <p>2. 获取 App Token</p>
            <p>3. 用户扫码关注后获取 UID，或创建主题获取 Topic ID</p>
            <p>4. 多个 UID 或 Topic ID 请用英文逗号分隔</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

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
            label="App Token"
            rules={[{ required: true, message: '请输入 App Token' }]}
          >
            <Input.Password placeholder="从 WxPusher 后台获取的 Token" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name={['config', 'uids']}
            label={
              <Space>
                <span>用户 UID 列表</span>
                <Tooltip title="多个 UID 用英文逗号分隔，例如：UID_xxx,UID_yyy">
                  <InfoCircleOutlined />
                </Tooltip>
              </Space>
            }
            help="多个 UID 请用英文逗号分隔，例如：UID_xxx,UID_yyy"
          >
            <TextArea 
              rows={2}
              placeholder="UID_Iwi6sRLsLAtuZveLNO8fYouKFF2P,UID_xxxxxxxxxxxxxxxxxxxx"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name={['config', 'topicIds']}
            label={
              <Space>
                <span>主题 ID 列表</span>
                <Tooltip title="多个主题 ID 用英文逗号分隔，例如：123,456">
                  <InfoCircleOutlined />
                </Tooltip>
              </Space>
            }
            help="多个主题 ID 请用英文逗号分隔，例如：123,456"
          >
            <TextArea 
              rows={2}
              placeholder="123,456,789"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name={['config', 'url']}
            label={
              <Space>
                <span>跳转 URL</span>
                <Tooltip title="用户点击消息后跳转的链接（可选）">
                  <InfoCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Input placeholder="https://example.com（可选）" />
          </Form.Item>
        </Col>
      </Row>

      {renderCommonSettings()}
    </>
  );

  // 公共设置部分（过滤规则和消息模板）
  const renderCommonSettings = () => (
    <>
      <Divider orientation="left">过滤规则</Divider>
      
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name={['filterRules', 'keywords']}
            label={
              <Space>
                <span>关键词过滤</span>
                <Tooltip title="包含这些关键词的短信才会转发，留空则转发所有">
                  <InfoCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Select
              mode="tags"
              placeholder="输入关键词后按回车添加"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name={['filterRules', 'senders']}
            label={
              <Space>
                <span>发送方过滤</span>
                <Tooltip title="只转发来自这些号码的短信，留空则不限制">
                  <InfoCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <Select
              mode="tags"
              placeholder="输入手机号后按回车添加"
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
          >
            <Select
              mode="multiple"
              placeholder="选择设备"
              allowClear
            >
              {filters.devices.map(device => (
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
          >
            <Select
              mode="multiple"
              placeholder="选择SIM卡"
              allowClear
            >
              {filters.simCards.map(sim => (
                <Option key={sim.value} value={sim.value}>
                  {sim.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left">消息模板</Divider>
      
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name="messageTemplate"
            label={
              <Space>
                <span>消息格式</span>
                <Tooltip title="可用变量：{device}, {simcard}, {sender}, {content}, {time}">
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
      {/* 手机端隐藏横向滚动条 & 渐隐边缘提示，仅作用于 chip 条 */}
      <style>{`
        @media (max-width: 767.98px) {
          .chip-bar {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            overscroll-behavior-x: contain;
            mask-image: linear-gradient(to right, 
              transparent 0, black 16px, 
              black calc(100% - 16px), transparent 100%);
          }
          .chip-bar::-webkit-scrollbar { display: none; }
        }
      `}</style>

      <Title level={4} style={{ marginBottom: 20 }}>
        <ApiOutlined /> 转发设置
      </Title>

      {/* 统计区域：手机端 Chip 条；桌面端保持原四卡片 */}
      {statistics && (
        isXs ? (
          <div className="chip-bar" style={{ marginBottom: 16, padding: '2px 2px' }}>
            {/* 启用平台 */}
            <StatChip
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              value={`${statistics.summary.enabledCount}/${statistics.summary.totalPlatforms}`}
              label="启用/平台"
            />
            {/* 总转发 */}
            <StatChip
              icon={<SendOutlined style={{ color: '#1890ff' }} />}
              value={statistics.summary.totalForwarded}
              label="总转发"
            />
            {/* 成功率 */}
            {(() => {
              const rate = parseFloat(statistics.summary.successRate || 0);
              const color =
                rate > 90 ? '#52c41a' :
                rate > 70 ? '#1890ff' :
                rate > 50 ? '#faad14' : '#f5222d';
              const Icon =
                rate > 70 ? CheckCircleOutlined :
                rate > 50 ? WarningOutlined : CloseCircleOutlined;
              return (
                <StatChip
                  icon={<Icon style={{ color }} />}
                  value={`${statistics.summary.successRate}%`}
                  label="成功率"
                  valueStyle={{ color }}
                />
              );
            })()}
            {/* 今日短信 */}
            <StatChip
              icon={<MessageOutlined style={{ color: '#722ed1' }} />}
              value={statistics.summary.todayMessages}
              label="今日短信"
              valueStyle={{ color: '#722ed1' }}
            />
          </div>
        ) : (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {/* 卡片1: 已启用平台 */}
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="已启用平台"
                  value={statistics.summary.enabledCount}
                  suffix={`/ ${statistics.summary.totalPlatforms}`}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                />
              </Card>
            </Col>
            
            {/* 卡片2: 总转发次数 */}
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="总转发次数"
                  value={statistics.summary.totalForwarded}
                  prefix={<SendOutlined style={{ color: '#1890ff' }} />}
                  suffix={
                    <span style={{ fontSize: 14, fontWeight: 'normal', color: '#999' }}>
                      / {statistics.summary.totalFailed} 失败
                    </span>
                  }
                />
              </Card>
            </Col>
            
            {/* 卡片3: 总体成功率 */}
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="总体成功率"
                  value={`${statistics.summary.successRate}%`}
                  prefix={
                    parseFloat(statistics.summary.successRate) > 90 ?
                      <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                    parseFloat(statistics.summary.successRate) > 70 ?
                      <CheckCircleOutlined style={{ color: '#1890ff' }} /> :
                    parseFloat(statistics.summary.successRate) > 50 ?
                      <WarningOutlined style={{ color: '#faad14' }} /> :
                      <CloseCircleOutlined style={{ color: '#f5222d' }} />
                  }
                  valueStyle={{
                    color: parseFloat(statistics.summary.successRate) > 90 ? '#52c41a' :
                           parseFloat(statistics.summary.successRate) > 70 ? '#1890ff' :
                           parseFloat(statistics.summary.successRate) > 50 ? '#faad14' : '#f5222d'
                  }}
                />
              </Card>
            </Col>
            
            {/* 卡片4: 今日短信数 */}
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="今日短信"
                  value={statistics.summary.todayMessages}
                  prefix={<MessageOutlined style={{ color: '#722ed1' }} />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>
        )
      )}

      <Card>
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
        >
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane 
              tab={
                <Space>
                  <span>Telegram</span>
                  {statistics && statistics.platforms && 
                    statistics.platforms.find(p => p.platform === 'telegram')?.enabled && 
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  }
                </Space>
              }
              key="telegram"
            >
              {renderTelegramForm()}
            </TabPane>
            
            <TabPane 
              tab={
                <Space>
                  <span>Bark</span>
                  {statistics && statistics.platforms && 
                    statistics.platforms.find(p => p.platform === 'bark')?.enabled && 
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  }
                </Space>
              }
              key="bark"
            >
              {renderBarkForm()}
            </TabPane>
            
            <TabPane 
              tab={
                <Space>
                  <span>Webhook</span>
                  {statistics && statistics.platforms && 
                    statistics.platforms.find(p => p.platform === 'webhook')?.enabled && 
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  }
                </Space>
              }
              key="webhook"
            >
              {renderWebhookForm()}
            </TabPane>
            
            <TabPane 
              tab={
                <Space>
                  <span>WxPusher</span>
                  {statistics && statistics.platforms && 
                    statistics.platforms.find(p => p.platform === 'wxpusher')?.enabled && 
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  }
                </Space>
              }
              key="wxpusher"
            >
              {renderWxPusherForm()}
            </TabPane>
          </Tabs>

          <Divider />

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={loading}
                block
                style={{ marginBottom: isXs ? 12 : 0 }}
              >
                保存配置
              </Button>
            </Col>
            <Col xs={24} sm={8}>
              <Button
                icon={<SendOutlined />}
                onClick={handleTest}
                loading={testing}
                block
                style={{ marginBottom: isXs ? 12 : 0 }}
              >
                发送测试消息
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
};

export default ForwardSetting;