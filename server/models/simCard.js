// server/models/simCard.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SimCard = sequelize.define('SimCard', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  slot: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '卡槽位置（1或2）'
  },
  msIsdn: {
    type: DataTypes.STRING(20),
    comment: '手机号码MSISDN'
  },
  imsi: {
    type: DataTypes.STRING(50),
    comment: 'IMSI号'
  },
  iccId: {
    type: DataTypes.STRING(50),
    comment: 'ICC ID'
  },
  scName: {
    type: DataTypes.STRING(100),
    defaultValue: '',
    comment: 'SIM卡名称/备注'
  },
  status: {
    type: DataTypes.ENUM('202', '203', '204', '205', '209'),
    defaultValue: '204',
    comment: 'SIM卡状态：202基站注册中，203ID已读取，204已就绪，205已弹出，209卡异常'
  },
  // 新增通话相关字段
  callStatus: {
    type: DataTypes.ENUM('idle', 'ringing', 'connected', 'ended'),
    defaultValue: 'idle',
    comment: '通话状态：idle空闲，ringing响铃中，connected通话中，ended已结束'
  },
  lastCallNumber: {
    type: DataTypes.STRING(20),
    comment: '最后来电号码'
  },
  lastCallTime: {
    type: DataTypes.DATE,
    comment: '最后来电时间'
  },
  lastActiveTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '最后活跃时间'
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['deviceId', 'slot']
    }
  ]
});

module.exports = SimCard;