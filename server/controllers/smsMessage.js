const SmsMessage = require('../models/smsMessage');
const SimCard = require('../models/simCard');
const Device = require('../models/device');
const { Op } = require('sequelize');

// 获取短信列表
const getSmsMessages = async (ctx) => {
  try {
    const { 
      page = 1, 
      pageSize = 20, 
      deviceId, 
      simCardId, 
      phNum,
      search,
      startDate,
      endDate 
    } = ctx.query;
    
    const where = {};
    
    if (deviceId) where.deviceId = deviceId;
    if (simCardId) where.simCardId = simCardId;
    if (phNum) where.phNum = phNum;
    
    if (search) {
      where[Op.or] = [
        { smsBd: { [Op.like]: `%${search}%` } },
        { phNum: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate);
      }
    }
    
    const { rows, count } = await SmsMessage.findAndCountAll({
      where,
      include: [
        {
          model: SimCard,
          as: 'simCard',
          attributes: ['id', 'scName', 'msIsdn', 'slot', 'imsi']
        },
        {
          model: Device,
          as: 'device',
          attributes: ['id', 'name', 'devId']
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
      message: '获取短信列表失败',
      error: error.message
    };
  }
};

// 获取单条短信
const getSmsMessage = async (ctx) => {
  try {
    const { id } = ctx.params;
    const smsMessage = await SmsMessage.findByPk(id, {
      include: [
        {
          model: SimCard,
          as: 'simCard',
          include: [
            {
              model: Device,
              as: 'device'
            }
          ]
        },
        {
          model: Device,
          as: 'device'
        }
      ]
    });
    
    if (!smsMessage) {
      ctx.status = 404;
      ctx.body = { success: false, message: '短信不存在' };
      return;
    }
    
    ctx.body = { success: true, data: smsMessage };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取短信详情失败',
      error: error.message
    };
  }
};

// 删除短信（禁用）
const deleteSmsMessage = async (ctx) => {
  ctx.status = 403;
  ctx.body = {
    success: false,
    message: '不允许删除短信记录'
  };
};

// 获取短信统计
const getSmsStatistics = async (ctx) => {
  try {
    const { deviceId, simCardId, days = 7 } = ctx.query;
    
    const where = {};
    if (deviceId) where.deviceId = deviceId;
    if (simCardId) where.simCardId = simCardId;
    
    // 添加时间范围
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    where.createdAt = {
      [Op.gte]: startDate
    };
    
    // 总数统计
    const totalCount = await SmsMessage.count({ where });
    
    // 按发送方统计
    const bySender = await SmsMessage.findAll({
      where,
      attributes: [
        'phNum',
        [SmsMessage.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['phNum'],
      order: [[SmsMessage.sequelize.fn('COUNT', '*'), 'DESC']],
      limit: 10
    });
    
    // 按设备统计
    const byDevice = await SmsMessage.findAll({
      where,
      attributes: [
        'deviceId',
        [SmsMessage.sequelize.fn('COUNT', '*'), 'count']
      ],
      include: [
        {
          model: Device,
          as: 'device',
          attributes: ['name', 'devId']
        }
      ],
      group: ['deviceId', 'device.id'],
      order: [[SmsMessage.sequelize.fn('COUNT', '*'), 'DESC']]
    });
    
    // 按SIM卡统计
    const bySimCard = await SmsMessage.findAll({
      where,
      attributes: [
        'simCardId',
        [SmsMessage.sequelize.fn('COUNT', '*'), 'count']
      ],
      include: [
        {
          model: SimCard,
          as: 'simCard',
          attributes: ['scName', 'msIsdn', 'slot']
        }
      ],
      group: ['simCardId', 'simCard.id'],
      order: [[SmsMessage.sequelize.fn('COUNT', '*'), 'DESC']]
    });
    
    ctx.body = {
      success: true,
      data: {
        totalCount,
        days: parseInt(days),
        bySender,
        byDevice,
        bySimCard
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

module.exports = {
  getSmsMessages,
  getSmsMessage,
  deleteSmsMessage,
  getSmsStatistics
};