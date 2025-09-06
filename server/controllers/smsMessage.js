// server/controllers/smsMessage.js
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

// 获取短信统计 - 修复版本
const getSmsStatistics = async (ctx) => {
  try {
    const { deviceId, simCardId, days = 7 } = ctx.query;
    
    const where = {};
    if (deviceId) where.deviceId = deviceId;
    if (simCardId) where.simCardId = simCardId;
    
    // 获取当前时间
    const now = new Date();
    
    // 计算今日开始时间（本地时间0点）
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    // 计算本周开始时间（周一0点）
    const weekStart = new Date(now);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // 调整到周一
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    
    // 计算指定天数前的时间
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    daysAgo.setHours(0, 0, 0, 0);
    
    // 1. 今日短信数量
    const todayCount = await SmsMessage.count({
      where: {
        ...where,
        createdAt: {
          [Op.gte]: todayStart
        }
      }
    });
    
    // 2. 本周短信数量
    const weekCount = await SmsMessage.count({
      where: {
        ...where,
        createdAt: {
          [Op.gte]: weekStart
        }
      }
    });
    
    // 3. 总短信数量（所有时间）
    const totalCount = await SmsMessage.count({
      where
    });
    
    // 4. 活跃设备数量（今日有接收短信的设备）
    const activeDevices = await SmsMessage.count({
      where: {
        createdAt: {
          [Op.gte]: todayStart
        }
      },
      distinct: true,
      col: 'deviceId'
    });
    
    // 5. 指定天数内的短信统计
    const periodWhere = {
      ...where,
      createdAt: {
        [Op.gte]: daysAgo
      }
    };
    
    // 按发送方统计（指定天数内）
    const bySender = await SmsMessage.findAll({
      where: periodWhere,
      attributes: [
        'phNum',
        [SmsMessage.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['phNum'],
      order: [[SmsMessage.sequelize.fn('COUNT', '*'), 'DESC']],
      limit: 10
    });
    
    // 按设备统计（指定天数内）
    const byDevice = await SmsMessage.findAll({
      where: periodWhere,
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
    
    // 按SIM卡统计（指定天数内）
    const bySimCard = await SmsMessage.findAll({
      where: periodWhere,
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
    
    // 6. 计算昨日短信数量（用于计算增长率）
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);
    
    const yesterdayCount = await SmsMessage.count({
      where: {
        ...where,
        createdAt: {
          [Op.gte]: yesterdayStart,
          [Op.lt]: yesterdayEnd
        }
      }
    });
    
    // 计算增长率
    let growthRate = 0;
    if (yesterdayCount > 0) {
      growthRate = ((todayCount - yesterdayCount) / yesterdayCount * 100).toFixed(1);
    } else if (todayCount > 0) {
      growthRate = 100;
    }
    
    // 返回统计数据
    ctx.body = {
      success: true,
      data: {
        // 主要统计指标
        todayCount,        // 今日短信
        weekCount,         // 本周短信
        totalCount,        // 总短信数
        activeDevices,     // 活跃设备数
        growthRate,        // 相比昨日增长率
        
        // 详细统计
        days: parseInt(days),
        bySender,
        byDevice,
        bySimCard,
        
        // 时间范围
        periods: {
          today: {
            start: todayStart.toISOString(),
            count: todayCount
          },
          week: {
            start: weekStart.toISOString(),
            count: weekCount
          },
          yesterday: {
            count: yesterdayCount
          }
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

module.exports = {
  getSmsMessages,
  getSmsMessage,
  deleteSmsMessage,
  getSmsStatistics
};