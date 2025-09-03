// server/controllers/forwardSetting.js
const ForwardSetting = require('../models/forwardSetting');
const ForwardService = require('../services/forwardService');
const Device = require('../models/device');
const SimCard = require('../models/simCard');

// 获取所有转发设置
const getForwardSettings = async (ctx) => {
  try {
    const settings = await ForwardSetting.findAll({
      order: [['platform', 'ASC']]
    });
    
    ctx.body = {
      success: true,
      data: settings
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取转发设置失败',
      error: error.message
    };
  }
};

// 获取单个转发设置
const getForwardSetting = async (ctx) => {
  try {
    const { platform } = ctx.params;
    
    let setting = await ForwardSetting.findOne({
      where: { platform }
    });
    
    if (!setting) {
      // 如果不存在，创建默认配置
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
            serverUrl: 'https://api.day.app',
            deviceKey: '',
            group: '短信接收',
            sound: 'default',
            level: 'active',
            autoCopy: true,
            icon: 'https://day.app/assets/images/avatar.jpg'
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
        }
      };

      const defaultConfig = defaultConfigs[platform];
      
      if (!defaultConfig) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '不支持的平台'
        };
        return;
      }

      // 创建新的设置
      setting = await ForwardSetting.create({
        platform,
        ...defaultConfig
      });
    }
    
    ctx.body = { 
      success: true, 
      data: setting 
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取转发设置失败',
      error: error.message
    };
  }
};

// 更新转发设置
const updateForwardSetting = async (ctx) => {
  try {
    const { platform } = ctx.params;
    const { enabled, config, filterRules, messageTemplate } = ctx.request.body;
    
    let setting = await ForwardSetting.findOne({
      where: { platform }
    });
    
    if (!setting) {
      // 如果不存在，创建新的
      setting = await ForwardSetting.create({
        platform,
        enabled: enabled || false,
        config: config || {},
        filterRules: filterRules || {
          keywords: [],
          senders: [],
          devices: [],
          simCards: []
        },
        messageTemplate: messageTemplate || '📱 新短信\n设备: {device}\nSIM卡: {simcard}\n发送方: {sender}\n内容: {content}\n时间: {time}'
      });
    } else {
      // 更新现有设置
      const updateData = {};
      if (enabled !== undefined) updateData.enabled = enabled;
      if (config !== undefined) updateData.config = config;
      if (filterRules !== undefined) updateData.filterRules = filterRules;
      if (messageTemplate !== undefined) updateData.messageTemplate = messageTemplate;
      
      await setting.update(updateData);
    }
    
    ctx.body = { 
      success: true, 
      data: setting,
      message: '保存成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新转发设置失败',
      error: error.message
    };
  }
};

// 测试转发设置
const testForwardSetting = async (ctx) => {
  try {
    const { platform } = ctx.params;
    const { config } = ctx.request.body;
    
    if (!config) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供测试配置'
      };
      return;
    }
    
    // 执行测试
    await ForwardService.testForward(platform, config);
    
    ctx.body = {
      success: true,
      message: '测试消息发送成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '测试失败: ' + error.message,
      error: error.message
    };
  }
};

// 获取转发统计
const getForwardStatistics = async (ctx) => {
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
    
    const totalForwarded = settings.reduce((sum, s) => sum + s.forwardCount, 0);
    const totalFailed = settings.reduce((sum, s) => sum + s.failCount, 0);
    const enabledCount = settings.filter(s => s.enabled).length;
    
    ctx.body = {
      success: true,
      data: {
        platforms: settings,
        summary: {
          totalForwarded,
          totalFailed,
          enabledCount,
          totalPlatforms: settings.length,
          successRate: (totalForwarded + totalFailed) > 0 ? 
            ((totalForwarded / (totalForwarded + totalFailed)) * 100).toFixed(2) + '%' : 
            '0%'
        }
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取统计数据失败',
      error: error.message
    };
  }
};

// 获取可用的设备和SIM卡列表（用于过滤规则）
const getAvailableFilters = async (ctx) => {
  try {
    const devices = await Device.findAll({
      attributes: ['id', 'name', 'devId'],
      where: { status: 'active' }
    });
    
    const simCards = await SimCard.findAll({
      attributes: ['id', 'scName', 'msIsdn', 'slot'],
      include: [{
        model: Device,
        as: 'device',
        attributes: ['name']
      }]
    });
    
    ctx.body = {
      success: true,
      data: {
        devices: devices.map(d => ({
          value: d.id,
          label: `${d.name} (${d.devId})`
        })),
        simCards: simCards.map(s => ({
          value: s.id,
          label: `${s.scName} - ${s.device?.name || '未知设备'}`
        }))
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取过滤选项失败',
      error: error.message
    };
  }
};

module.exports = {
  getForwardSettings,
  getForwardSetting,
  updateForwardSetting,
  testForwardSetting,
  getForwardStatistics,
  getAvailableFilters
};