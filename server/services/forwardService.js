// server/services/forwardService.js
const axios = require('axios');
const { logger } = require('../utils/logger');
const ForwardSetting = require('../models/forwardSetting');

class ForwardService {
  /**
   * 获取所有平台设置
   */
  async getSettings() {
    try {
      const settings = await ForwardSetting.findAll({
        order: [['platform', 'ASC']]
      });

      // 转换为对象格式，方便按平台访问
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.platform] = setting.toJSON();
      });

      // 如果某个平台不存在，创建默认配置
      const platforms = ['telegram', 'bark', 'webhook', 'wxpusher'];
      for (const platform of platforms) {
        if (!settingsObj[platform]) {
          const defaultSetting = await this.createDefaultSetting(platform);
          settingsObj[platform] = defaultSetting.toJSON();
        }
      }

      return settingsObj;
    } catch (error) {
      console.error('获取转发设置失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个平台设置
   */
  async getPlatformSetting(platform) {
    try {
      let setting = await ForwardSetting.findOne({
        where: { platform }
      });

      if (!setting) {
        setting = await this.createDefaultSetting(platform);
      }

      return setting;
    } catch (error) {
      console.error(`获取 ${platform} 设置失败:`, error);
      throw error;
    }
  }

  /**
   * 创建默认设置
   */
  async createDefaultSetting(platform) {
    const defaultConfigs = {
      telegram: {
        enabled: false,
        config: {
          botToken: '',
          chatId: '',
          parseMode: 'HTML',
          silentMode: false,
          proxy: {
            enabled: false,
            host: '',
            port: '',
            auth: {
              username: '',
              password: ''
            }
          }
        },
        filterRules: {
          keywords: [],
          senders: [],
          devices: [],
          simCards: []
        },
        messageTemplate: '📱 新短信\n设备: {device}\nSIM卡: {simcard}\n发送方: {sender}\n内容: {content}\n时间: {time}'
      },
      bark: {
        enabled: false,
        config: {
          serverUrl: '',
          deviceKey: '',
          sound: 'default',
          icon: '',
          group: '短信转发',
          isArchive: true,
          automaticallyCopy: false,
          copy: ''
        },
        filterRules: {
          keywords: [],
          senders: [],
          devices: [],
          simCards: []
        },
        messageTemplate: '📱 新短信\n设备: {device}\nSIM卡: {simcard}\n发送方: {sender}\n内容: {content}\n时间: {time}'
      },
      webhook: {
        enabled: false,
        config: {
          url: '',
          method: 'POST',
          headers: {},
          timeout: 10000
        },
        filterRules: {
          keywords: [],
          senders: [],
          devices: [],
          simCards: []
        },
        messageTemplate: '📱 新短信\n设备: {device}\nSIM卡: {simcard}\n发送方: {sender}\n内容: {content}\n时间: {time}'
      },
      wxpusher: {
        enabled: false,
        config: {
          appToken: '',
          uids: [],
          topicIds: [],
          url: ''
        },
        filterRules: {
          keywords: [],
          senders: [],
          devices: [],
          simCards: []
        },
        messageTemplate: '📱 新短信\n设备: {device}\nSIM卡: {simcard}\n发送方: {sender}\n内容: {content}\n时间: {time}'
      }
    };

    const defaultConfig = defaultConfigs[platform];
    if (!defaultConfig) {
      throw new Error(`不支持的平台: ${platform}`);
    }

    return await ForwardSetting.create({
      platform,
      ...defaultConfig
    });
  }

  /**
   * 更新平台设置
   */
  async updatePlatformSettings(platform, updates) {
    try {
      let setting = await ForwardSetting.findOne({
        where: { platform }
      });

      if (!setting) {
        // 如果不存在，创建新记录
        setting = await ForwardSetting.create({
          platform,
          ...updates
        });
      } else {
        // 更新现有记录
        await setting.update(updates);
      }

      console.log(`✅ 更新 ${platform} 转发设置成功`);
      return true;
    } catch (error) {
      console.error(`❌ 更新 ${platform} 设置失败:`, error);
      throw error;
    }
  }

  /**
   * 获取统计信息
   */
  async getStatistics() {
    try {
      const settings = await ForwardSetting.findAll({
        attributes: [
          'platform',
          'enabled',
          'forwardCount',
          'failCount',
          'lastForwardTime'
        ]
      });

      // 计算总统计
      let totalForwarded = 0;
      let totalFailed = 0;
      const platforms = {};

      settings.forEach(setting => {
        totalForwarded += setting.forwardCount || 0;
        totalFailed += setting.failCount || 0;
        platforms[setting.platform] = setting.forwardCount || 0;
      });

      return {
        total: totalForwarded + totalFailed,
        success: totalForwarded,
        error: totalFailed,
        platforms
      };
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 检查消息是否匹配过滤规则
   */
  matchFilter(rules, message, device, simCard) {
    if (!rules) return true;

    // 如果所有规则都为空，则不过滤（全部转发）
    const hasRules = 
      (rules.keywords && rules.keywords.length > 0) ||
      (rules.senders && rules.senders.length > 0) ||
      (rules.devices && rules.devices.length > 0) ||
      (rules.simCards && rules.simCards.length > 0);

    if (!hasRules) return true;

    let match = false;

    // 检查关键词
    if (rules.keywords && rules.keywords.length > 0) {
      match = rules.keywords.some(keyword => 
        message.smsBd?.includes(keyword)
      );
      if (match) return true;
    }

    // 检查发送方
    if (rules.senders && rules.senders.length > 0) {
      match = rules.senders.some(sender => 
        message.phNum?.includes(sender)
      );
      if (match) return true;
    }

    // 检查设备
    if (rules.devices && rules.devices.length > 0) {
      match = rules.devices.includes(device.id);
      if (match) return true;
    }

    // 检查SIM卡
    if (rules.simCards && rules.simCards.length > 0) {
      match = rules.simCards.includes(simCard.id);
      if (match) return true;
    }

    // 如果有规则但都不匹配，则不转发
    return !hasRules;
  }

  /**
   * 格式化消息模板
   */
  formatMessage(template, message, device, simCard) {
    const time = new Date(message.createdAt || message.smsTs || Date.now()).toLocaleString('zh-CN');
    
    return template
      .replace(/{device}/g, device.name || device.devId)
      .replace(/{simcard}/g, simCard.scName || simCard.msIsdn)
      .replace(/{sender}/g, message.phNum || '未知')
      .replace(/{content}/g, message.smsBd || '空')
      .replace(/{time}/g, time);
  }

  /**
   * 转发消息到所有启用的平台
   */
  async forwardMessage(message, device, simCard) {
    try {
      const settings = await ForwardSetting.findAll({
        where: { enabled: true }
      });

      const results = [];

      for (const setting of settings) {
        const platform = setting.platform;
        
        // 检查过滤规则
        if (!this.matchFilter(setting.filterRules, message, device, simCard)) {
          console.log(`🔍 消息不匹配 ${platform} 过滤规则，跳过`);
          continue;
        }

        // 格式化消息
        const formattedMessage = this.formatMessage(
          setting.messageTemplate || '📱 新短信\n设备: {device}\nSIM卡: {simcard}\n发送方: {sender}\n内容: {content}\n时间: {time}',
          message,
          device,
          simCard
        );

        // 转发消息
        try {
          console.log(`📤 正在转发到 ${platform}...`);
          await this.sendToPlatform(platform, formattedMessage, setting.config);
          
          // 更新成功统计
          await setting.increment('forwardCount');
          await setting.update({ lastForwardTime: new Date() });
          
          // 记录转发日志
          logger.logForward({
            platform,
            status: 'success',
            message: formattedMessage,
            device: device.name,
            simCard: simCard.scName
          });
          
          results.push({ platform, success: true });
          console.log(`✅ 成功转发到 ${platform}`);
        } catch (error) {
          // 更新失败统计
          await setting.increment('failCount');
          
          // 记录错误日志
          logger.logForward({
            platform,
            status: 'error',
            error: error.message,
            message: formattedMessage,
            device: device.name,
            simCard: simCard.scName
          });
          
          results.push({ platform, success: false, error: error.message });
          console.error(`❌ 转发到 ${platform} 失败:`, error.message);
        }
      }

      return results;
    } catch (error) {
      console.error('转发消息失败:', error);
      throw error;
    }
  }

  /**
   * 发送到具体平台
   */
  async sendToPlatform(platform, message, config) {
    switch (platform) {
      case 'telegram':
        return await this.sendToTelegram(message, config);
      case 'bark':
        return await this.sendToBark(message, config);
      case 'webhook':
        return await this.sendToWebhook(message, config);
      case 'wxpusher':
        return await this.sendToWxPusher(message, config);
      default:
        throw new Error(`不支持的平台: ${platform}`);
    }
  }

  /**
   * 发送到 Telegram
   */
  async sendToTelegram(message, config) {
    if (!config.botToken || !config.chatId) {
      throw new Error('Telegram 配置不完整');
    }

    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    
    // 构建请求配置
    const axiosConfig = {
      method: 'POST',
      url,
      data: {
        chat_id: config.chatId,
        text: message,
        parse_mode: config.parseMode || 'HTML',
        disable_notification: config.silentMode || false
      },
      timeout: 10000
    };

    // 如果启用代理
    if (config.proxy?.enabled && config.proxy?.host && config.proxy?.port) {
      const HttpsProxyAgent = require('https-proxy-agent');
      const proxyUrl = config.proxy.auth?.username 
        ? `http://${config.proxy.auth.username}:${config.proxy.auth.password}@${config.proxy.host}:${config.proxy.port}`
        : `http://${config.proxy.host}:${config.proxy.port}`;
      
      axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
    }

    const response = await axios(axiosConfig);
    
    if (!response.data.ok) {
      throw new Error(response.data.description || 'Telegram API 错误');
    }

    return response.data;
  }

  /**
   * 发送到 Bark
   */
  async sendToBark(message, config) {
    if (!config.serverUrl || !config.deviceKey) {
      throw new Error('Bark 配置不完整');
    }

    // 构建 URL
    const baseUrl = config.serverUrl.replace(/\/$/, ''); // 移除末尾斜杠
    const url = `${baseUrl}/${config.deviceKey}`;

    // 构建请求参数
    const params = {
      title: '新短信',
      body: message,
      sound: config.sound || 'default',
      group: config.group || '短信转发',
      isArchive: config.isArchive ? '1' : '0'
    };

    if (config.icon) {
      params.icon = config.icon;
    }

    if (config.automaticallyCopy) {
      params.automaticallyCopy = '1';
      if (config.copy) {
        params.copy = config.copy;
      }
    }

    const response = await axios.post(url, params, {
      timeout: 10000
    });

    if (response.data.code !== 200) {
      throw new Error(response.data.message || 'Bark 推送失败');
    }

    return response.data;
  }

  /**
   * 发送到 Webhook
   */
  async sendToWebhook(message, config) {
    if (!config.url) {
      throw new Error('Webhook URL 未配置');
    }

    const data = {
      type: 'sms_forward',
      message,
      timestamp: new Date().toISOString()
    };

    const response = await axios({
      method: config.method || 'POST',
      url: config.url,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      data,
      timeout: config.timeout || 10000
    });

    return response.data;
  }

  /**
   * 发送到 WxPusher
   */
  /**
 * 发送到 WxPusher
 * 修复版：正确处理 uids 和 topicIds 的数组格式
 */
async sendToWxPusher(message, config) {
  if (!config.appToken) {
    throw new Error('WxPusher appToken 未配置');
  }

  // 处理 uids - 确保是数组格式
  let uids = [];
  if (config.uids) {
    if (typeof config.uids === 'string') {
      // 如果是字符串，按逗号分割并去除空白
      uids = config.uids.split(',')
        .map(uid => uid.trim())
        .filter(uid => uid.length > 0);
    } else if (Array.isArray(config.uids)) {
      // 如果已经是数组，直接使用
      uids = config.uids.filter(uid => uid && uid.length > 0);
    }
  }

  // 处理 topicIds - 确保是数组格式
  let topicIds = [];
  if (config.topicIds) {
    if (typeof config.topicIds === 'string') {
      // 如果是字符串，按逗号分割并去除空白
      topicIds = config.topicIds.split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
    } else if (Array.isArray(config.topicIds)) {
      // 如果已经是数组，直接使用
      topicIds = config.topicIds.filter(id => id && id.length > 0);
    }
  }

  // 确保至少有一个接收者
  if (uids.length === 0 && topicIds.length === 0) {
    throw new Error('WxPusher 需要至少配置一个 UID 或 Topic ID');
  }

  const url = 'https://wxpusher.zjiecode.com/api/send/message';
  
  const data = {
    appToken: config.appToken,
    content: message,
    summary: '新短信',
    contentType: 1, // 文本类型
    uids: uids,      // 确保是数组
    topicIds: topicIds // 确保是数组
  };

  // 如果配置了跳转URL
  if (config.url) {
    data.url = config.url;
  }

  console.log('发送到 WxPusher 的数据:', JSON.stringify(data, null, 2));

  try {
    const response = await axios.post(url, data, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.code !== 1000) {
      throw new Error(response.data.msg || 'WxPusher 推送失败');
    }

    return response.data;
  } catch (error) {
    console.error('WxPusher 发送失败:', error.response?.data || error.message);
    throw error;
  }
}

  /**
   * 测试转发
   */
  async testForward(platform, config) {
    const testMessage = `🔔 测试消息\n平台: ${platform}\n时间: ${new Date().toLocaleString('zh-CN')}\n\n这是一条测试消息，如果您收到了，说明配置正确！`;
    
    return await this.sendToPlatform(platform, testMessage, config);
  }
}

// 创建单例实例
const forwardService = new ForwardService();

module.exports = forwardService;