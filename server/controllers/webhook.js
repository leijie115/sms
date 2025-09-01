// server/controllers/webhook.js
const Device = require('../models/device');
const SimCard = require('../models/simCard');
const SmsMessage = require('../models/smsMessage');

/**
 * 接收外部请求的 webhook 接口
 * 立即返回 200，然后异步处理数据
 */
const receiveWebhook = async (ctx) => {
  // 获取请求信息
  const requestInfo = {
    body: ctx.request.body,
    headers: ctx.request.headers,
    method: ctx.request.method,
    url: ctx.request.url,
    ip: ctx.request.ip,
    timestamp: new Date().toISOString(),
    query: ctx.request.query,
  };

  // 立即返回 200 状态码
  ctx.status = 200;
  ctx.body = {
    success: true,
    message: 'Request received successfully',
    timestamp: requestInfo.timestamp
  };

  // 异步处理请求数据（不阻塞响应）
  setImmediate(() => {
    processWebhookData(requestInfo);
  });
};

/**
 * 异步处理 webhook 数据
 * @param {Object} requestInfo - 请求信息
 */
const processWebhookData = async (requestInfo) => {
  try {
    // 输出请求信息到控制台
    console.log('\n========== Webhook 接收到新请求 ==========');
    console.log('时间:', requestInfo.timestamp);
    console.log('来源IP:', requestInfo.ip);
    console.log('请求体:', JSON.stringify(requestInfo.body, null, 2));
    
    // 检查是否是短信类型（type=501）
    if (requestInfo.body && requestInfo.body.type === 501) {
      console.log('📱 检测到新短信，开始处理...');
      await processSmsMessage(requestInfo.body);
    } else {
      console.log('ℹ️ 非短信类型，type:', requestInfo.body?.type);
    }
    
    console.log('========== 请求处理完毕 ==========\n');
    
  } catch (error) {
    console.error('❌ 处理 webhook 数据时发生错误:', error);
  }
};

/**
 * 处理短信消息
 * @param {Object} data - 短信数据
 */
const processSmsMessage = async (data) => {
  const t = await SmsMessage.sequelize.transaction();
  
  try {
    // 1. 查找设备（不自动创建）
    const device = await Device.findOne({
      where: { devId: data.devId },
      transaction: t
    });
    
    if (!device) {
      console.log('⚠️ 设备不存在:', data.devId);
      console.log('   跳过处理，设备需要手动添加');
      await t.rollback();
      return;
    }
    
    // 检查设备状态
    if (device.status !== 'active') {
      console.log('⚠️ 设备未激活:', device.name, '状态:', device.status);
      await t.rollback();
      return;
    }
    
    // 更新设备最后活跃时间
    await device.update({
      lastActiveTime: new Date()
    }, { transaction: t });
    
    // 2. 查找或创建SIM卡
    let simCard = await SimCard.findOne({
      where: {
        deviceId: device.id,
        slot: data.slot
      },
      transaction: t
    });
    
    if (!simCard) {
      console.log('🆕 创建新SIM卡记录');
      
      simCard = await SimCard.create({
        deviceId: device.id,
        slot: data.slot,
        msIsdn: data.phNum || '',
        imsi: data.imsi,
        iccId: data.iccId,
        scName: `卡槽${data.slot}_${data.imsi?.slice(-4) || '未知'}`,
        status: '204', // 默认状态：已就绪
        lastActiveTime: new Date()
      }, { transaction: t });
    } else {
      // 更新SIM卡信息
      const updateData = {
        lastActiveTime: new Date()
      };
      
      // 如果有新的信息，更新它们
      if (data.imsi && data.imsi !== simCard.imsi) {
        updateData.imsi = data.imsi;
      }
      if (data.iccId && data.iccId !== simCard.iccId) {
        updateData.iccId = data.iccId;
      }
      if (data.phNum && data.phNum !== simCard.msIsdn) {
        updateData.msIsdn = data.phNum;
      }
      
      await simCard.update(updateData, { transaction: t });
    }
    
    // 3. 保存短信消息
    const smsMessage = await SmsMessage.create({
      simCardId: simCard.id,
      deviceId: device.id,
      netCh: data.netCh,
      msgTs: data.msgTs,
      phNum: data.phNum,
      smsBd: data.smsBd,
      smsTs: data.smsTs,
      rawData: data
    }, { transaction: t });
    
    await t.commit();
    
    console.log('✅ 短信保存成功！');
    console.log(`   设备: ${device.name} (${device.devId})`);
    console.log(`   SIM卡: ${simCard.scName} (卡槽${simCard.slot})`);
    console.log(`   发送方: ${data.phNum}`);
    console.log(`   内容: ${data.smsBd?.substring(0, 50)}${data.smsBd?.length > 50 ? '...' : ''}`);
    console.log(`   消息ID: ${smsMessage.id}`);
    
    // 处理业务逻辑
    await handleSmsBusinessLogic(smsMessage, simCard, device);
    
  } catch (error) {
    await t.rollback();
    console.error('❌ 保存短信失败:', error);
    throw error;
  }
};

/**
 * 处理短信业务逻辑
 * @param {Object} smsMessage - 短信消息对象
 * @param {Object} simCard - SIM卡对象
 * @param {Object} device - 设备对象
 */
const handleSmsBusinessLogic = async (smsMessage, simCard, device) => {
  try {
    // 检查是否是验证码
    const verifyCodePattern = /(\d{4,6})/;
    const match = smsMessage.smsBd.match(verifyCodePattern);
    if (match) {
      console.log(`🔢 检测到验证码: ${match[1]}`);
    }
    
    // 检查关键词
    const keywords = ['验证', '充值', '余额', '停机', '欠费'];
    const hasKeyword = keywords.some(keyword => smsMessage.smsBd.includes(keyword));
    if (hasKeyword) {
      console.log('⚠️ 短信包含重要关键词');
    }
    
    // 统计该号码的短信数量
    const messageCount = await SmsMessage.count({
      where: {
        simCardId: simCard.id,
        phNum: smsMessage.phNum
      }
    });
    console.log(`📊 该号码(${smsMessage.phNum})共发送了 ${messageCount} 条短信`);
    
  } catch (error) {
    console.error('处理业务逻辑时出错:', error);
  }
};

/**
 * 获取所有 webhook 日志
 */
const getWebhookLogs = async (ctx) => {
  try {
    const { page = 1, pageSize = 20, type } = ctx.query;
    
    const where = {};
    if (type) {
      where.type = type;
    }
    
    const { rows, count } = await SmsMessage.findAndCountAll({
      where,
      include: [
        {
          model: SimCard,
          as: 'simCard',
          attributes: ['id', 'scName', 'msIsdn', 'slot']
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
      message: '获取日志失败',
      error: error.message
    };
  }
};

module.exports = {
  receiveWebhook,
  getWebhookLogs
};