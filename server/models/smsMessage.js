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
    comment: '发送方手机号'
  },
  smsBd: {
    type: DataTypes.TEXT,
    comment: '短信内容'
  },
  smsTs: {
    type: DataTypes.BIGINT,
    comment: '短信时间戳'
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
    }
  ]
});

module.exports = SmsMessage;