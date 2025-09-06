// server/models/smsMessage.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SmsMessage = sequelize.define('SmsMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  simCardId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联的SIM卡ID',
    references: {
      model: 'SimCards',
      key: 'id'
    }
  },
  deviceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联的设备ID',
    references: {
      model: 'Devices',
      key: 'id'
    }
  },
  msgType: {
    type: DataTypes.ENUM('sms', 'call'),
    defaultValue: 'sms',
    comment: '消息类型：sms-短信，call-来电'
  },
  netCh: {
    type: DataTypes.INTEGER,
    comment: '网络通道号（0=wifi，1=卡槽一）'
  },
  msgTs: {
    type: DataTypes.BIGINT,
    comment: '消息时间戳'
  },
  phNum: {
    type: DataTypes.STRING(20),
    comment: '发送方/来电号码'
  },
  smsBd: {
    type: DataTypes.TEXT,
    comment: '短信内容/来电备注'
  },
  smsTs: {
    type: DataTypes.BIGINT,
    comment: '短信/来电时间戳'
  },
  callDuration: {
    type: DataTypes.INTEGER,
    comment: '通话时长（秒）- 仅来电记录'
  },
  callStatus: {
    type: DataTypes.STRING(20),
    comment: '来电状态：ringing-响铃中，missed-未接，answered-已接听，rejected-已拒绝'
  },
  rawData: {
    type: DataTypes.JSON,
    comment: '原始数据'
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['simCardId']
    },
    {
      fields: ['deviceId']
    },
    {
      fields: ['phNum']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['msgType']
    }
  ]
});

module.exports = SmsMessage;