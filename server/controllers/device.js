const Device = require('../models/device');
const SimCard = require('../models/simCard');
const { Op } = require('sequelize');

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
    
    // 只更新允许的字段
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description;
    
    await device.update(updateData);
    
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

module.exports = {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice
};