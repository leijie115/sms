// server/controllers/device.js
const Device = require('../models/device');
const SimCard = require('../models/simCard');
const { Op } = require('sequelize');
const deviceControlService = require('../services/deviceControlService');

// 获取设备列表
const getDevices = async (ctx) => {
  try {
    const { page = 1, pageSize = 10, status, search } = ctx.query;
    
    const where = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { devId: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { rows, count } = await Device.findAndCountAll({
      where,
      include: [
        {
          model: SimCard,
          as: 'simCards',
          attributes: ['id', 'slot', 'msIsdn', 'status']
        }
      ],
      limit: parseInt(pageSize),
      offset: (parseInt(page) - 1) * parseInt(pageSize),
      order: [['createdAt', 'DESC']]
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
      message: '获取设备列表失败',
      error: error.message
    };
  }
};

// 获取单个设备
const getDevice = async (ctx) => {
  try {
    const { id } = ctx.params;
    const device = await Device.findByPk(id, {
      include: [
        {
          model: SimCard,
          as: 'simCards'
        }
      ]
    });
    
    if (!device) {
      ctx.status = 404;
      ctx.body = { success: false, message: '设备不存在' };
      return;
    }
    
    ctx.body = { success: true, data: device };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取设备详情失败',
      error: error.message
    };
  }
};

// 创建设备
const createDevice = async (ctx) => {
  try {
    const { devId, name, status, description } = ctx.request.body;
    
    // 检查devId是否已存在
    const existingDevice = await Device.findOne({ where: { devId } });
    if (existingDevice) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '设备ID已存在'
      };
      return;
    }
    
    // 检查名称是否已存在
    const existingName = await Device.findOne({ where: { name } });
    if (existingName) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '设备名称已存在'
      };
      return;
    }
    
    const device = await Device.create({
      devId,
      name,
      status: status || 'active',
      description,
      lastActiveTime: new Date()
    });
    
    ctx.body = { success: true, data: device };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建设备失败',
      error: error.message
    };
  }
};

// 更新设备（只能更新名称、状态和描述）
const updateDevice = async (ctx) => {
  try {
    const { id } = ctx.params;
    const { name, status, description } = ctx.request.body;
    
    const device = await Device.findByPk(id);
    
    if (!device) {
      ctx.status = 404;
      ctx.body = { success: false, message: '设备不存在' };
      return;
    }
    
    // 如果要更新名称，检查是否重复
    if (name && name !== device.name) {
      const existingName = await Device.findOne({ 
        where: { 
          name,
          id: { [Op.ne]: id }
        }
      });
      
      if (existingName) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '设备名称已存在'
        };
        return;
      }
    }
    
    await device.update({
      name,
      status,
      description
    });
    
    ctx.body = { success: true, data: device };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新设备失败',
      error: error.message
    };
  }
};

// 删除设备（禁用）
const deleteDevice = async (ctx) => {
  ctx.status = 403;
  ctx.body = {
    success: false,
    message: '不允许删除设备'
  };
};

// ========== API控制相关方法 ==========

/**
 * 更新设备API配置
 */
const updateDeviceApi = async (ctx) => {
  try {
    const { id } = ctx.params;
    const { apiUrl, apiToken, apiEnabled } = ctx.request.body;
    
    const device = await Device.findByPk(id);
    
    if (!device) {
      ctx.status = 404;
      ctx.body = { success: false, message: '设备不存在' };
      return;
    }
    
    // 如果提供了URL，验证格式
    if (apiUrl) {
      try {
        new URL(apiUrl);
      } catch (error) {
        ctx.status = 400;
        ctx.body = { 
          success: false, 
          message: '无效的API地址格式' 
        };
        return;
      }
    }
    
    await device.update({
      apiUrl,
      apiToken,
      apiEnabled: apiEnabled !== undefined ? apiEnabled : device.apiEnabled
    });
    
    ctx.body = { 
      success: true, 
      data: device,
      message: 'API配置更新成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新API配置失败',
      error: error.message
    };
  }
};

/**
 * 测试设备连接
 */
const testDeviceConnection = async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const result = await deviceControlService.testConnection(id);
    
    ctx.status = result.success ? 200 : 500;
    ctx.body = result;
    
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '测试连接失败',
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
      slot = 1,
      duration = 55,
      ttsContent = '',
      ttsRepeat = 2,
      recording = true,
      speaker = true
    } = ctx.request.body;
    
    const result = await deviceControlService.answerCall(id, {
      slot,
      duration,
      ttsContent,
      ttsRepeat,
      recording,
      speaker
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
    const { slot = 1 } = ctx.request.body;
    
    const result = await deviceControlService.hangUp(id, slot);
    
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
 * 重启设备
 */
const rebootDevice = async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const result = await deviceControlService.rebootDevice(id);
    
    ctx.body = {
      success: true,
      data: result,
      message: '重启命令已发送'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '重启命令发送失败',
      error: error.message
    };
  }
};

module.exports = {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  // API控制相关
  updateDeviceApi,
  testDeviceConnection,
  answerCall,
  hangUp,
  rebootDevice
};