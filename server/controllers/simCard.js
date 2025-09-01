const SimCard = require('../models/simCard');
const Device = require('../models/device');
const SmsMessage = require('../models/smsMessage');
const { Op } = require('sequelize');

// 获取SIM卡列表
const getSimCards = async (ctx) => {
  try {
    const { page = 1, pageSize = 10, status, deviceId, search } = ctx.query;
    
    const where = {};
    if (status) where.status = status;
    if (deviceId) where.deviceId = deviceId;
    if (search) {
      where[Op.or] = [
        { scName: { [Op.like]: `%${search}%` } },
        { msIsdn: { [Op.like]: `%${search}%` } },
        { imsi: { [Op.like]: `%${search}%` } },
        { iccId: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const { rows, count } = await SimCard.findAndCountAll({
      where,
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['id', 'name', 'devId', 'status']
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

// 更新SIM卡
const updateSimCard = async (ctx) => {
  try {
    const { id } = ctx.params;
    const { scName, status, msIsdn, imsi, iccId } = ctx.request.body;
    
    const simCard = await SimCard.findByPk(id);
    
    if (!simCard) {
      ctx.status = 404;
      ctx.body = { success: false, message: 'SIM卡不存在' };
      return;
    }
    
    // 检查唯一字段
    if (msIsdn && msIsdn !== simCard.msIsdn) {
      const existing = await SimCard.findOne({ 
        where: { 
          msIsdn,
          id: { [Op.ne]: id }
        } 
      });
      if (existing) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '手机号已存在'
        };
        return;
      }
    }
    
    if (imsi && imsi !== simCard.imsi) {
      const existing = await SimCard.findOne({ 
        where: { 
          imsi,
          id: { [Op.ne]: id }
        } 
      });
      if (existing) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'IMSI已存在'
        };
        return;
      }
    }
    
    if (iccId && iccId !== simCard.iccId) {
      const existing = await SimCard.findOne({ 
        where: { 
          iccId,
          id: { [Op.ne]: id }
        } 
      });
      if (existing) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'ICC ID已存在'
        };
        return;
      }
    }
    
    const updateData = {};
    if (scName !== undefined) updateData.scName = scName;
    if (status !== undefined) updateData.status = status;
    if (msIsdn !== undefined) updateData.msIsdn = msIsdn;
    if (imsi !== undefined) updateData.imsi = imsi;
    if (iccId !== undefined) updateData.iccId = iccId;
    
    await simCard.update(updateData);
    
    ctx.body = { success: true, data: simCard };
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

module.exports = {
  getSimCards,
  getSimCard,
  createSimCard,
  updateSimCard,
  deleteSimCard
};