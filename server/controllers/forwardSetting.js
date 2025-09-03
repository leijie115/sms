// server/controllers/forwardSetting.js
const ForwardService = require('../services/forwardService');
const Device = require('../models/device');
const SimCard = require('../models/simCard');

// 获取所有转发设置
const getForwardSettings = async (ctx) => {
  try {
    const settings = await ForwardService.getSettings();
    
    if (!settings) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '无法读取转发设置'
      };
      return;
    }
    
    // 转换为数组格式
    const data = Object.entries(settings).map(([platform, config]) => ({
      platform,
      ...config
    }));
    
    ctx.body = {
      success: true,
      data
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
    const settings = await ForwardService.getSettings();
    
    if (!settings) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '无法读取转发设置'
      };
      return;
    }
    
    const setting = settings[platform];
    
    if (!setting) {
      // 返回默认配置
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
      
      ctx.body = { 
        success: true, 
        data: defaultConfigs[platform] || {
          enabled: false,
          config: {},
          filterRules: {
            keywords: [],
            senders: [],
            devices: [],
            simCards: []
          },
          messageTemplate: '📱 新短信\n设备: {device}\nSIM卡: {simcard}\n发送方: {sender}\n内容: {content}\n时间: {time}'
        }
      };
    } else {
      ctx.body = { success: true, data: setting };
    }
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
    const updates = ctx.request.body;
    
    // 如果传递了headers字符串，尝试解析为JSON
    if (updates.config?.headers && typeof updates.config.headers === 'string') {
      try {
        updates.config.headers = JSON.parse(updates.config.headers);
      } catch {
        // 如果解析失败，保持原样
      }
    }
    
    const success = await ForwardService.updatePlatformSettings(platform, updates);
    
    if (!success) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '更新配置失败'
      };
      return;
    }
    
    ctx.body = { 
      success: true, 
      message: '配置已更新',
      data: updates 
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
    const stats = await ForwardService.getStatistics();
    const settings = await ForwardService.getSettings();
    
    if (!settings) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '无法读取配置'
      };
      return;
    }
    
    // 统计启用的平台数
    const enabledCount = Object.values(settings).filter(s => s.enabled).length;
    
    // 构建平台统计
    const platforms = Object.keys(settings).map(platform => ({
      platform,
      enabled: settings[platform].enabled,
      forwardCount: stats.platforms[platform] || 0,
      failCount: 0, // 从日志中无法准确统计失败次数
      lastForwardTime: null
    }));
    
    ctx.body = {
      success: true,
      data: {
        platforms,
        summary: {
          totalForwarded: stats.success,
          totalFailed: stats.error,
          enabledCount,
          totalPlatforms: Object.keys(settings).length,
          successRate: stats.total > 0 ? 
            ((stats.success / stats.total) * 100).toFixed(2) + '%' : 
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