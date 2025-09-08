// server/controllers/webhook.js
const Device = require('../models/device');
const SimCard = require('../models/simCard');
const SmsMessage = require('../models/smsMessage');
const forwardService = require('../services/forwardService'); // 直接导入实例，不是类
const { logger } = require('../utils/logger');

// 存储设备心跳检测定时器
const deviceHeartbeatTimers = new Map();

// 心跳超时时间（秒）
const HEARTBEAT_TIMEOUT = 180;

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

  // 记录webhook请求到日志
  logger.logWebhook({
    ip: requestInfo.ip,
    url: requestInfo.url,
    body: requestInfo.body,
    headers: {
      'content-type': requestInfo.headers['content-type'],
      'user-agent': requestInfo.headers['user-agent']
    }
  });

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
    
    const { type, devId } = requestInfo.body;
    
    // 根据不同的 type 处理不同类型的消息
    switch(type) {
      case 501:
        // 短信消息
        console.log('📱 检测到新短信，开始处理...');
        await processSmsMessage(requestInfo.body);
        break;
      case 601:
        // 来电振铃
        console.log('📞 检测到来电振铃...');
        await processCallRinging(requestInfo.body);
        break;
        
      case 602:
        // 来电接通
        console.log('📞 来电已接通...');
        await processCallConnected(requestInfo.body);
        break;
        
      case 603:
        // 来电挂断
        console.log('📞 来电已挂断...');
        await processCallEnded(requestInfo.body);
        break;
        
      case 998:
        // 设备心跳
        console.log('💗 收到设备心跳...');
        await processDeviceHeartbeat(requestInfo.body);
        break;
        
      case 202:
        // SIM卡基站注册中
        console.log('📡 SIM卡状态更新：基站注册中');
        await updateSimCardStatus(requestInfo.body);
        break;
        
      case 203:
        // SIM卡ID已读取
        console.log('📡 SIM卡状态更新：ID已读取');
        await updateSimCardStatus(requestInfo.body);
        break;
        
      case 204:
        // SIM卡已就绪
        console.log('📡 SIM卡状态更新：已就绪');
        await updateSimCardStatus(requestInfo.body);
        break;
        
      case 205:
        // SIM卡已弹出
        console.log('📡 SIM卡状态更新：已弹出');
        await updateSimCardStatus(requestInfo.body);
        break;
        
      case 209:
        // SIM卡异常
        console.log('⚠️ SIM卡状态更新：卡异常');
        await updateSimCardStatus(requestInfo.body);
        break;
        
      default:
        console.log('ℹ️ 未知消息类型，type:', type);
    }
    
    console.log('========== 请求处理完毕 ==========\n');
    
  } catch (error) {
    console.error('❌ 处理 webhook 数据时发生错误:', error);
    logger.logError('WebhookProcessError', error, {
      requestInfo
    });
  }
};

/**
 * 处理设备心跳（type=998）
 * @param {Object} data - 心跳数据
 */
const processDeviceHeartbeat = async (data) => {
  const { devId, cnt, msgTs, netCh } = data;
  
  try {
    // 查找设备
    const device = await Device.findOne({
      where: { devId }
    });
    
    if (!device) {
      console.log('⚠️ 心跳：设备不存在:', devId);
      return;
    }
    
    // 更新设备状态为在线，更新最后活跃时间
    await device.update({
      status: 'active',
      lastActiveTime: new Date()
    });
    
    console.log(`✅ 设备心跳更新成功`);
    console.log(`   设备: ${device.name} (${device.devId})`);
    console.log(`   心跳计数: ${cnt}`);
    console.log(`   网络通道: ${netCh === 0 ? 'WiFi' : `卡槽${netCh}`}`);
    
    // 清除旧的定时器（如果存在）
    if (deviceHeartbeatTimers.has(devId)) {
      clearTimeout(deviceHeartbeatTimers.get(devId));
    }
    
    // 设置新的超时定时器
    const timer = setTimeout(async () => {
      try {
        // 超时未收到心跳，标记设备为离线
        const device = await Device.findOne({
          where: { devId }
        });
        
        if (device && device.status === 'active') {
          await device.update({
            status: 'offline'
          });
          
          console.log(`⚠️ 设备心跳超时，已标记为离线: ${device.name} (${devId})`);
          
          // 记录到日志
          logger.logError('DeviceOffline', new Error('设备心跳超时'), {
            deviceId: device.id,
            devId: device.devId,
            deviceName: device.name,
            lastActiveTime: device.lastActiveTime
          });
        }
        
        // 清除定时器记录
        deviceHeartbeatTimers.delete(devId);
      } catch (error) {
        console.error('处理设备离线状态时出错:', error);
      }
    }, HEARTBEAT_TIMEOUT * 1000); // 转换为毫秒
    
    // 保存定时器
    deviceHeartbeatTimers.set(devId, timer);
    
  } catch (error) {
    console.error('❌ 处理设备心跳失败:', error);
    throw error;
  }
};

/**
 * 处理来电记录（type=601）
 * @param {Object} data - 来电数据
 */
const processIncomingCall = async (data) => {
  const t = await SmsMessage.sequelize.transaction();
  
  try {
    // 1. 查找设备
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
    
    // 更新设备状态和最后活跃时间
    await device.update({
      status: 'active',
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
      console.log('🆕 创建新SIM卡记录（来电）');
      
      simCard = await SimCard.create({
        deviceId: device.id,
        slot: data.slot,
        msIsdn: data.msIsdn,
        imsi: data.imsi,
        iccId: data.iccId,
        scName: data.scName || `卡槽${data.slot}`,
        status: '204', // 能接到电话说明卡已就绪
        lastActiveTime: new Date()
      }, { transaction: t });
      
      console.log('✅ SIM卡创建成功');
    } else {
      // 更新SIM卡信息
      const updateData = {
        lastActiveTime: new Date(),
        status: '204' // 能接到电话说明卡已就绪
      };
      
      // 如果有新信息，更新它们
      if (data.msIsdn && data.msIsdn !== simCard.msIsdn) updateData.msIsdn = data.msIsdn;
      if (data.imsi && data.imsi !== simCard.imsi) updateData.imsi = data.imsi;
      if (data.iccId && data.iccId !== simCard.iccId) updateData.iccId = data.iccId;
      if (data.scName && data.scName !== simCard.scName) updateData.scName = data.scName;
      
      await simCard.update(updateData, { transaction: t });
    }
    
    // 3. 保存来电记录
    // 生成来电描述
    const callDescription = `来电号码：${data.phNum || '未知号码'}`;
    
    const callRecord = await SmsMessage.create({
      simCardId: simCard.id,
      deviceId: device.id,
      msgType: 'call', // 标记为来电
      netCh: data.netCh,
      msgTs: data.msgTs,
      phNum: data.phNum || '未知号码',
      smsBd: callDescription, // 使用smsBd字段存储来电描述
      smsTs: data.callTs || data.msgTs, // 来电时间戳
      callDuration: data.duration || 0, // 通话时长
      callStatus: data.status || 'ringing', // 来电状态
      rawData: data
    }, { transaction: t });
    
    await t.commit();
    
    console.log('✅ 来电记录保存成功！');
    console.log(`   设备: ${device.name} (${device.devId})`);
    console.log(`   SIM卡: ${simCard.scName} (卡槽${simCard.slot})`);
    console.log(`   来电号码: ${data.phNum || '未知号码'}`);
    console.log(`   记录ID: ${callRecord.id}`);
    
    // 4. 统计该号码的来电次数
    const callCount = await SmsMessage.count({
      where: { 
        phNum: data.phNum,
        msgType: 'call'
      }
    });
    console.log(`📊 该号码(${data.phNum})共来电 ${callCount} 次`);
    
    // 5. 异步转发来电通知 - 修复：直接使用导入的实例
    setImmediate(async () => {
      try {
        await forwardService.forwardMessage(callRecord, device, simCard);
      } catch (error) {
        console.error('转发来电通知失败:', error);
      }
    });
    
  } catch (error) {
    await t.rollback();
    console.error('❌ 处理来电记录失败:', error);
    throw error;
  }
};

/**
 * 更新SIM卡状态（type=202,203,204,205,209）
 * @param {Object} data - 状态数据
 */
const updateSimCardStatus = async (data) => {
  const { devId, slot, type, imsi, iccId, msIsdn, scName } = data;
  
  // 状态映射
  const statusMap = {
    202: '202', // 基站注册中
    203: '203', // ID已读取
    204: '204', // 已就绪
    205: '205', // 已弹出
    209: '209'  // 卡异常
  };
  
  const statusText = {
    202: '基站注册中',
    203: 'ID已读取',
    204: '已就绪',
    205: '已弹出',
    209: '卡异常'
  };
  
  const t = await SmsMessage.sequelize.transaction();
  
  try {
    // 查找设备
    const device = await Device.findOne({
      where: { devId },
      transaction: t
    });
    
    if (!device) {
      console.log('⚠️ 设备不存在:', devId);
      await t.rollback();
      return;
    }
    
    // 更新设备最后活跃时间
    await device.update({
      lastActiveTime: new Date()
    }, { transaction: t });
    
    // 查找或创建SIM卡
    let simCard = await SimCard.findOne({
      where: {
        deviceId: device.id,
        slot: slot
      },
      transaction: t
    });
    
    if (!simCard) {
      console.log('🆕 创建新SIM卡记录');
      
      simCard = await SimCard.create({
        deviceId: device.id,
        slot: slot,
        imsi: imsi,
        iccId: iccId,
        msIsdn: msIsdn,
        scName: scName || `卡槽${slot}`,
        status: statusMap[type],
        lastActiveTime: new Date()
      }, { transaction: t });
      
      console.log(`✅ SIM卡创建成功，状态: ${statusText[type]}`);
    } else {
      // 更新SIM卡信息和状态
      const oldStatus = simCard.status;
      const updateData = {
        status: statusMap[type],
        lastActiveTime: new Date()
      };
      
      // 更新可能变化的字段
      if (imsi) updateData.imsi = imsi;
      if (iccId) updateData.iccId = iccId;
      if (msIsdn) updateData.msIsdn = msIsdn;
      if (scName) updateData.scName = scName;
      
      await simCard.update(updateData, { transaction: t });
      
      console.log(`✅ SIM卡状态更新成功！`);
      console.log(`   设备: ${device.name} (${device.devId})`);
      console.log(`   卡槽: ${slot}`);
      console.log(`   状态: ${statusText[oldStatus]} -> ${statusText[type]}`);
      if (msIsdn) console.log(`   号码: ${msIsdn}`);
    }
    
    await t.commit();
    
  } catch (error) {
    await t.rollback();
    console.error('❌ 更新SIM卡状态失败:', error);
    throw error;
  }
};

/**
 * 处理短信消息（type=501）
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
      // 收到短信说明设备是活跃的，更新状态
      await device.update({
        status: 'active',
        lastActiveTime: new Date()
      }, { transaction: t });
      console.log('   设备状态已更新为活跃');
    } else {
      // 更新设备最后活跃时间
      await device.update({
        lastActiveTime: new Date()
      }, { transaction: t });
    }
    
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
        msIsdn: data.msIsdn,
        imsi: data.imsi,
        iccId: data.iccId,
        scName: data.scName || `卡槽${data.slot}`,
        status: '204', // 能收到短信说明卡已就绪
        lastActiveTime: new Date()
      }, { transaction: t });
      
      console.log('✅ SIM卡创建成功');
    } else {
      // 更新SIM卡信息
      const updateData = {
        lastActiveTime: new Date(),
        status: '204' // 能收到短信说明卡已就绪
      };
      
      // 如果有新信息，更新它们
      if (data.msIsdn && data.msIsdn !== simCard.msIsdn) updateData.msIsdn = data.msIsdn;
      if (data.imsi && data.imsi !== simCard.imsi) updateData.imsi = data.imsi;
      if (data.iccId && data.iccId !== simCard.iccId) updateData.iccId = data.iccId;
      if (data.scName && data.scName !== simCard.scName) updateData.scName = data.scName;
      
      await simCard.update(updateData, { transaction: t });
    }
    
    // 3. 保存短信
    const smsMessage = await SmsMessage.create({
      simCardId: simCard.id,
      deviceId: device.id,
      msgType: 'sms', // 标记为短信
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
    
    // 4. 检测验证码
    const codeMatch = data.smsBd?.match(/(\d{4,8})/);
    if (codeMatch) {
      console.log('🔢 检测到验证码:', codeMatch[1]);
    }
    
    // 5. 检测关键词
    const keywords = ['验证', '登录', '注册', '密码', '银行', '支付'];
    const hasImportantKeyword = keywords.some(keyword => data.smsBd?.includes(keyword));
    if (hasImportantKeyword) {
      console.log('⚠️ 短信包含重要关键词');
    }
    
    // 6. 统计发送方短信数量
    const senderCount = await SmsMessage.count({
      where: { 
        phNum: data.phNum,
        msgType: 'sms'
      }
    });
    console.log(`📊 该号码(${data.phNum})共发送了 ${senderCount} 条短信`);
    
    // 7. 异步转发短信 - 修复：直接使用导入的实例
    setImmediate(async () => {
      try {
        await forwardService.forwardMessage(smsMessage, device, simCard);
      } catch (error) {
        console.error('转发短信失败:', error);
      }
    });
    
  } catch (error) {
    await t.rollback();
    console.error('❌ 处理短信消息失败:', error);
    throw error;
  }
};


/**
 * 处理来电振铃（type=601）
 * @param {Object} data - 来电振铃数据
 */
const processCallRinging = async (data) => {
  const t = await SmsMessage.sequelize.transaction();
  
  try {
    // 1. 查找设备
    const device = await Device.findOne({
      where: { devId: data.devId },
      transaction: t
    });
    
    if (!device) {
      console.log('⚠️ 设备不存在:', data.devId);
      await t.rollback();
      return;
    }
    
    // 更新设备状态
    await device.update({
      status: 'active',
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
      console.log('🆕 创建新SIM卡记录（来电）');
      
      simCard = await SimCard.create({
        deviceId: device.id,
        slot: data.slot,
        msIsdn: data.msIsdn,
        imsi: data.imsi,
        iccId: data.iccId,
        scName: data.scName || `卡槽${data.slot}`,
        status: '204',
        callStatus: 'ringing', // 设置为响铃中
        lastCallNumber: data.phNum,
        lastCallTime: new Date(),
        lastActiveTime: new Date()
      }, { transaction: t });
      
      console.log('✅ SIM卡创建成功');
    } else {
      // 更新SIM卡信息和通话状态
      const updateData = {
        lastActiveTime: new Date(),
        status: '204',
        callStatus: 'ringing', // 设置为响铃中
        lastCallNumber: data.phNum,
        lastCallTime: new Date()
      };
      
      // 更新其他信息
      if (data.msIsdn && data.msIsdn !== simCard.msIsdn) updateData.msIsdn = data.msIsdn;
      if (data.imsi && data.imsi !== simCard.imsi) updateData.imsi = data.imsi;
      if (data.iccId && data.iccId !== simCard.iccId) updateData.iccId = data.iccId;
      if (data.scName && data.scName !== simCard.scName) updateData.scName = data.scName;
      
      await simCard.update(updateData, { transaction: t });
    }
    
    // 3. 保存来电记录
    const callDescription = `📞 来电振铃：${data.phNum || '未知号码'}`;
    
    const callRecord = await SmsMessage.create({
      simCardId: simCard.id,
      deviceId: device.id,
      msgType: 'call',
      netCh: data.netCh,
      msgTs: data.msgTs,
      phNum: data.phNum || '未知号码',
      smsBd: callDescription,
      smsTs: data.callTs || data.msgTs,
      callStatus: 'ringing',
      rawData: data
    }, { transaction: t });
    
    await t.commit();
    
    console.log('✅ 来电振铃记录保存成功！');
    console.log(`   设备: ${device.name} (${device.devId})`);
    console.log(`   SIM卡: ${simCard.scName} (卡槽${simCard.slot})`);
    console.log(`   来电号码: ${data.phNum || '未知号码'}`);
    console.log(`   记录ID: ${callRecord.id}`);
    
    // 4. 异步转发来电通知
    setImmediate(async () => {
      try {
        await forwardService.forwardMessage(callRecord, device, simCard);
      } catch (error) {
        console.error('转发来电通知失败:', error);
      }
    });
    
  } catch (error) {
    await t.rollback();
    console.error('❌ 处理来电振铃失败:', error);
    throw error;
  }
};

/**
 * 处理来电接通（type=602）
 * @param {Object} data - 来电接通数据
 */
const processCallConnected = async (data) => {
  const t = await SmsMessage.sequelize.transaction();
  
  try {
    const device = await Device.findOne({
      where: { devId: data.devId },
      transaction: t
    });
    
    if (!device) {
      console.log('⚠️ 设备不存在:', data.devId);
      await t.rollback();
      return;
    }
    
    // 查找SIM卡
    const simCard = await SimCard.findOne({
      where: {
        deviceId: device.id,
        slot: data.slot
      },
      transaction: t
    });
    
    if (simCard) {
      // 更新为通话中状态
      await simCard.update({
        callStatus: 'connected',
        lastActiveTime: new Date()
      }, { transaction: t });
      
      console.log('✅ SIM卡状态更新为通话中');
      console.log(`   设备: ${device.name}`);
      console.log(`   SIM卡: ${simCard.scName} (卡槽${simCard.slot})`);
    }
    
    await t.commit();
    
  } catch (error) {
    await t.rollback();
    console.error('❌ 处理来电接通失败:', error);
    throw error;
  }
};

/**
 * 处理来电挂断（type=603）
 * @param {Object} data - 来电挂断数据
 */
const processCallEnded = async (data) => {
  const t = await SmsMessage.sequelize.transaction();
  
  try {
    const device = await Device.findOne({
      where: { devId: data.devId },
      transaction: t
    });
    
    if (!device) {
      console.log('⚠️ 设备不存在:', data.devId);
      await t.rollback();
      return;
    }
    
    // 查找SIM卡
    const simCard = await SimCard.findOne({
      where: {
        deviceId: device.id,
        slot: data.slot
      },
      transaction: t
    });
    
    if (simCard) {
      // 更新为空闲状态
      await simCard.update({
        callStatus: 'idle',
        lastActiveTime: new Date()
      }, { transaction: t });
      
      // 如果有通话时长，记录一条通话记录
      if (data.duration) {
        const callDescription = `📞 通话结束：${simCard.lastCallNumber || '未知号码'}，时长：${data.duration}秒`;
        
        await SmsMessage.create({
          simCardId: simCard.id,
          deviceId: device.id,
          msgType: 'call',
          netCh: data.netCh,
          msgTs: data.msgTs,
          phNum: simCard.lastCallNumber || '未知号码',
          smsBd: callDescription,
          smsTs: data.callTs || data.msgTs,
          callDuration: data.duration,
          callStatus: 'ended',
          rawData: data
        }, { transaction: t });
      }
      
      console.log('✅ 通话已结束');
      console.log(`   设备: ${device.name}`);
      console.log(`   SIM卡: ${simCard.scName} (卡槽${simCard.slot})`);
      if (data.duration) {
        console.log(`   通话时长: ${data.duration}秒`);
      }
    }
    
    await t.commit();
    
  } catch (error) {
    await t.rollback();
    console.error('❌ 处理来电挂断失败:', error);
    throw error;
  }
};

/**
 * 获取 Webhook 日志
 */
const getWebhookLogs = async (ctx) => {
  try {
    const { page = 1, pageSize = 20 } = ctx.query;
    
    // 这里应该从日志文件中读取
    // 暂时返回模拟数据
    ctx.body = {
      success: true,
      data: [],
      total: 0,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取Webhook日志失败',
      error: error.message
    };
  }
};

// 清理所有心跳定时器（应用关闭时调用）
const cleanupHeartbeatTimers = () => {
  console.log('清理设备心跳定时器...');
  for (const [devId, timer] of deviceHeartbeatTimers.entries()) {
    clearTimeout(timer);
  }
  deviceHeartbeatTimers.clear();
};

// 在进程退出时清理
process.on('SIGINT', cleanupHeartbeatTimers);
process.on('SIGTERM', cleanupHeartbeatTimers);

module.exports = {
  receiveWebhook,
  getWebhookLogs
};