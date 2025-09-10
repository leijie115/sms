const SimCard = require('../models/simCard');
const Device = require('../models/device');
const SmsMessage = require('../models/smsMessage');
const TtsTemplate = require('../models/ttsTemplate');
const { Op } = require('sequelize');

/**
 * 获取SIM卡列表（包含自动接听模板）
 */
const getSimCards = async (ctx) => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      search = '', 
      status = ''
    } = ctx.query;
    
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    const where = {};
    const deviceWhere = {};
    
    // 搜索条件更新：同时搜索SIM卡信息和设备信息
    if (search) {
      // 先查找匹配的设备
      const matchedDevices = await Device.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { devId: { [Op.like]: `%${search}%` } }
          ]
        },
        attributes: ['id']
      });
      
      const deviceIds = matchedDevices.map(d => d.id);
      
      // 构建综合搜索条件
      where[Op.or] = [
        { scName: { [Op.like]: `%${search}%` } },
        { msIsdn: { [Op.like]: `%${search}%` } },
        { imsi: { [Op.like]: `%${search}%` } },
        { iccId: { [Op.like]: `%${search}%` } }
      ];
      
      // 如果有匹配的设备，添加设备ID条件
      if (deviceIds.length > 0) {
        where[Op.or].push({ deviceId: { [Op.in]: deviceIds } });
      }
    }
    
    if (status) {
      where.status = status;
    }
    
    // 查询数据 - 包含设备和TTS模板
    const { count, rows } = await SimCard.findAndCountAll({
      where,
      include: [
        {
          model: Device,
          as: 'device',
          attributes: [
            'id', 
            'devId', 
            'name', 
            'status',
            'apiUrl',
            'apiToken',
            'apiEnabled'
          ]
        },
        {
          model: TtsTemplate,
          as: 'autoAnswerTemplate',
          attributes: ['id', 'name', 'content']
        }
      ],
      limit: parseInt(pageSize),
      offset: parseInt(offset),
      order: [['id', 'DESC']]
    });
    
    ctx.body = {
      success: true,
      data: rows,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取SIM卡列表失败',
      error: error.message
    };
  }
};

// 获取单个SIM卡
const getSimCard = async (ctx) => {
  try {
    const { id } = ctx.params;
    const simCard = await SimCard.findByPk(id, {
      include: [
        {
          model: Device,
          as: 'device'
        }
      ]
    });
    
    if (!simCard) {
      ctx.status = 404;
      ctx.body = { success: false, message: 'SIM卡不存在' };
      return;
    }
    
    // 获取最近的短信数量
    const messageCount = await SmsMessage.count({
      where: { simCardId: simCard.id }
    });
    
    ctx.body = { 
      success: true, 
      data: {
        ...simCard.toJSON(),
        messageCount
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取SIM卡详情失败',
      error: error.message
    };
  }
};

// 创建SIM卡
const createSimCard = async (ctx) => {
  try {
    const { deviceId, slot, msIsdn, imsi, iccId, scName, status } = ctx.request.body;
    
    // 检查设备是否存在
    const device = await Device.findByPk(deviceId);
    if (!device) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '设备不存在'
      };
      return;
    }
    
    // 检查设备+卡槽是否已存在
    const existingSlot = await SimCard.findOne({
      where: { deviceId, slot }
    });
    if (existingSlot) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: `该设备的卡槽${slot}已存在SIM卡`
      };
      return;
    }
    
    // 检查唯一字段
    if (msIsdn) {
      const existingMsIsdn = await SimCard.findOne({ where: { msIsdn } });
      if (existingMsIsdn) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '手机号已存在'
        };
        return;
      }
    }
    
    if (imsi) {
      const existingImsi = await SimCard.findOne({ where: { imsi } });
      if (existingImsi) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'IMSI已存在'
        };
        return;
      }
    }
    
    if (iccId) {
      const existingIccId = await SimCard.findOne({ where: { iccId } });
      if (existingIccId) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'ICC ID已存在'
        };
        return;
      }
    }
    
    const simCard = await SimCard.create({
      deviceId,
      slot,
      msIsdn,
      imsi,
      iccId,
      scName: scName || `卡槽${slot}`,
      status: status || '204', // 默认状态：已就绪
      lastActiveTime: new Date()
    });
    
    ctx.body = { success: true, data: simCard };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建SIM卡失败',
      error: error.message
    };
  }
};

/**
 * 更新SIM卡
 */
const updateSimCard = async (ctx) => {
  try {
    const { id } = ctx.params;
    const {
      scName,
      msIsdn,
      imsi,
      iccId,
      status,
      // 自动接听配置
      autoAnswer,
      autoAnswerDelay,
      autoAnswerTtsTemplateId,
      autoAnswerDuration,
      autoAnswerTtsRepeat,
      autoAnswerPauseTime,
      autoAnswerAfterAction
    } = ctx.request.body;
    
    const simCard = await SimCard.findByPk(id);
    
    if (!simCard) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'SIM卡不存在'
      };
      return;
    }
    
    // 构建更新数据
    const updateData = {};
    
    // 基本信息
    if (scName !== undefined) updateData.scName = scName;
    if (msIsdn !== undefined) updateData.msIsdn = msIsdn;
    if (imsi !== undefined) updateData.imsi = imsi;
    if (iccId !== undefined) updateData.iccId = iccId;
    if (status !== undefined) updateData.status = status;
    
    // 自动接听配置
    if (autoAnswer !== undefined) updateData.autoAnswer = autoAnswer;
    if (autoAnswerDelay !== undefined) updateData.autoAnswerDelay = autoAnswerDelay;
    if (autoAnswerTtsTemplateId !== undefined) updateData.autoAnswerTtsTemplateId = autoAnswerTtsTemplateId;
    if (autoAnswerDuration !== undefined) updateData.autoAnswerDuration = autoAnswerDuration;
    if (autoAnswerTtsRepeat !== undefined) updateData.autoAnswerTtsRepeat = autoAnswerTtsRepeat;
    if (autoAnswerPauseTime !== undefined) updateData.autoAnswerPauseTime = autoAnswerPauseTime;
    if (autoAnswerAfterAction !== undefined) updateData.autoAnswerAfterAction = autoAnswerAfterAction;
    
    await simCard.update(updateData);
    
    // 重新查询包含关联数据
    const updatedSimCard = await SimCard.findByPk(id, {
      include: [
        {
          model: Device,
          as: 'device'
        },
        {
          model: TtsTemplate,
          as: 'autoAnswerTemplate'
        }
      ]
    });
    
    ctx.body = {
      success: true,
      data: updatedSimCard,
      message: '更新成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新SIM卡失败',
      error: error.message
    };
  }
};

// 删除SIM卡
const deleteSimCard = async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const simCard = await SimCard.findByPk(id);
    
    if (!simCard) {
      ctx.status = 404;
      ctx.body = { success: false, message: 'SIM卡不存在' };
      return;
    }
    
    // 检查是否有相关短信
    const messageCount = await SmsMessage.count({
      where: { simCardId: id }
    });
    
    if (messageCount > 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: `该SIM卡有${messageCount}条短信记录，不能删除`
      };
      return;
    }
    
    await simCard.destroy();
    
    ctx.body = { success: true, message: '删除成功' };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除SIM卡失败',
      error: error.message
    };
  }
};

/**
 * 接听电话
 */
const answerCall = async (ctx) => {
  try {
    const { id } = ctx.params;
    const { 
      duration = 55,
      ttsContent = '',
      ttsRepeat = 2,
      pauseTime = 1,
      afterTtsAction = 1
    } = ctx.request.body;
    
    // 查找SIM卡信息
    const simCard = await SimCard.findByPk(id, {
      include: [{
        model: Device,
        as: 'device'
      }]
    });
    
    if (!simCard) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'SIM卡不存在'
      };
      return;
    }
    
    // 检查SIM卡状态
    if (simCard.callStatus !== 'ringing') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '当前没有来电振铃'
      };
      return;
    }
    
    // 检查设备API是否启用
    if (!simCard.device.apiEnabled) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '设备未启用API控制'
      };
      return;
    }
    
    // 调用设备控制服务接听电话
    const deviceControlService = require('../services/deviceControlService');
    const result = await deviceControlService.answerCall(simCard.deviceId, {
      slot: simCard.slot,  // 直接使用SIM卡的slot
      duration,
      ttsContent,
      ttsRepeat,
      pauseTime,
      afterTtsAction
    });
    
    // 更新SIM卡状态为通话中
    await simCard.update({
      callStatus: 'connected'
    });
    
    ctx.body = {
      success: true,
      data: result,
      message: '接听命令已发送'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '接听命令发送失败',
      error: error.message
    };
  }
};

/**
 * 挂断电话
 */
const hangUp = async (ctx) => {
  try {
    const { id } = ctx.params;
    
    // 查找SIM卡信息
    const simCard = await SimCard.findByPk(id, {
      include: [{
        model: Device,
        as: 'device'
      }]
    });
    
    if (!simCard) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'SIM卡不存在'
      };
      return;
    }
    
    // 检查SIM卡状态
    if (simCard.callStatus !== 'ringing' && simCard.callStatus !== 'connected') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '当前没有进行中的通话'
      };
      return;
    }
    
    // 检查设备API是否启用
    if (!simCard.device.apiEnabled) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '设备未启用API控制'
      };
      return;
    }
    
    // 调用设备控制服务挂断电话
    const deviceControlService = require('../services/deviceControlService');
    const result = await deviceControlService.hangUp(simCard.deviceId, simCard.slot);
    
    // 更新SIM卡状态为空闲
    await simCard.update({
      callStatus: 'idle'
    });
    
    ctx.body = {
      success: true,
      data: result,
      message: '挂断命令已发送'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '挂断命令发送失败',
      error: error.message
    };
  }
};

/**
 * 发送短信
 */
const sendSms = async (ctx) => {
  try {
    const { id } = ctx.params;
    const { phoneNumber, content } = ctx.request.body;
    
    // 验证参数
    if (!phoneNumber || !content) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '手机号码和短信内容不能为空'
      };
      return;
    }
    
    // 查找SIM卡信息
    const simCard = await SimCard.findByPk(id, {
      include: [{
        model: Device,
        as: 'device'
      }]
    });
    
    if (!simCard) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'SIM卡不存在'
      };
      return;
    }
    
    // 检查设备API是否启用
    if (!simCard.device.apiEnabled) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '设备未启用API控制'
      };
      return;
    }
    
    // 检查设备API配置
    if (!simCard.device.apiUrl || !simCard.device.apiToken) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '设备API配置不完整'
      };
      return;
    }
    
    // 调用设备API发送短信
    const axios = require('axios');
    const tid = Date.now().toString(); // 使用时间戳作为tid
    
    const apiUrl = `${simCard.device.apiUrl}/ctrl`;
    const params = {
      token: simCard.device.apiToken,
      cmd: 'sendsms',
      tid: tid,
      p1: simCard.slot,
      p2: phoneNumber,
      p3: content
    };
    
    try {
      const response = await axios.get(apiUrl, { 
        params,
        timeout: 10000 
      });
      
      if (response.data.code === 0) {
        // 记录发送的短信（可选，需要创建新表或使用SmsMessage表）
        // await SmsMessage.create({
        //   deviceId: simCard.deviceId,
        //   simCardId: simCard.id,
        //   phNum: phoneNumber,
        //   smsBd: content,
        //   msgType: 'sent', // 标记为发送的短信
        //   smsTs: Math.floor(Date.now() / 1000)
        // });
        
        ctx.body = {
          success: true,
          message: '短信发送成功',
          data: {
            tid: tid
          }
        };
      } else {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: response.data.msg || '短信发送失败'
        };
      }
    } catch (apiError) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '调用设备API失败：' + apiError.message
      };
    }
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '发送短信失败',
      error: error.message
    };
  }
};


module.exports = {
  getSimCards,
  getSimCard,
  createSimCard,
  updateSimCard,
  deleteSimCard,
  // 新增的电话控制
  answerCall,
  hangUp,
  sendSms
};