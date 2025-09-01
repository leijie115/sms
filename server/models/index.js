const { sequelize } = require('../config/db');
const Device = require('./device');
const SimCard = require('./simCard');
const SmsMessage = require('./smsMessage');

// 定义模型关联关系

// Device 和 SimCard 的关系：一个设备可以有多个SIM卡
Device.hasMany(SimCard, {
  foreignKey: 'deviceId',
  as: 'simCards'
});

SimCard.belongsTo(Device, {
  foreignKey: 'deviceId',
  as: 'device'
});

// SimCard 和 SmsMessage 的关系：一个SIM卡可以有多条短信
SimCard.hasMany(SmsMessage, {
  foreignKey: 'simCardId',
  as: 'messages'
});

SmsMessage.belongsTo(SimCard, {
  foreignKey: 'simCardId',
  as: 'simCard'
});

// Device 和 SmsMessage 的关系：一个设备可以有多条短信
Device.hasMany(SmsMessage, {
  foreignKey: 'deviceId',
  as: 'messages'
});

SmsMessage.belongsTo(Device, {
  foreignKey: 'deviceId',
  as: 'device'
});

module.exports = {
  sequelize,
  Device,
  SimCard,
  SmsMessage
};