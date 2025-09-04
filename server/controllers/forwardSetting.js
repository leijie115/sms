// server/controllers/forwardSetting.js
const ForwardSetting = require('../models/forwardSetting');
const ForwardService = require('../services/forwardService');
const Device = require('../models/device');
const SimCard = require('../models/simCard');
const SmsMessage = require('../models/smsMessage');
const { Op } = require('sequelize');

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

// 获取转发统计 - 简化版
const getForwardStatistics = async (ctx) => {
  try {
    // 从数据库获取所有平台的统计数据
    const settings = await ForwardSetting.findAll({
      attributes: [
        'platform',
        'enabled',
        'forwardCount',
        'failCount',
        'lastForwardTime'
      ],
      order: [['platform', 'ASC']]
    });
    
    // 初始化统计变量
    let totalForwarded = 0;
    let totalFailed = 0;
    let enabledCount = 0;
    
    // 构建每个平台的统计（包含独立成功率）
    const platforms = settings.map(setting => {
      const forwardCount = setting.forwardCount || 0;
      const failCount = setting.failCount || 0;
      const totalAttempts = forwardCount + failCount;
      
      // 累加总数
      totalForwarded += forwardCount;
      totalFailed += failCount;
      if (setting.enabled) enabledCount++;
      
      // 计算单个平台的成功率
      let successRate = '0.00';
      if (totalAttempts > 0) {
        successRate = ((forwardCount / totalAttempts) * 100).toFixed(2);
      }
      
      return {
        platform: setting.platform,
        enabled: setting.enabled,
        forwardCount: forwardCount,
        failCount: failCount,
        lastForwardTime: setting.lastForwardTime,
        // 添加独立的成功率
        successRate: successRate
      };
    });
    
    // 计算总体成功率
    const totalAttempts = totalForwarded + totalFailed;
    let overallSuccessRate = '0.00';
    if (totalAttempts > 0) {
      overallSuccessRate = ((totalForwarded / totalAttempts) * 100).toFixed(2);
    }
    
    // 获取今日短信数量（重要指标）
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayMessages = await SmsMessage.count({
      where: {
        createdAt: {
          [Op.gte]: todayStart
        }
      }
    });
    
    // 构建响应数据
    ctx.body = {
      success: true,
      data: {
        // 各平台数据（包含独立成功率）
        platforms: platforms,
        
        // 汇总统计（用于顶部4个卡片）
        summary: {
          // 1. 已启用平台数
          enabledCount: enabledCount,
          totalPlatforms: settings.length,
          
          // 2. 总转发成功次数
          totalForwarded: totalForwarded,
          totalFailed: totalFailed,
          
          // 3. 总体成功率
          successRate: overallSuccessRate,
          
          // 4. 今日短信数（新增的重要指标）
          todayMessages: todayMessages
        }
      }
    };
  } catch (error) {
    console.error('获取统计数据失败:', error);
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