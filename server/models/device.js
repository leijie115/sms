const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  devId: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
    comment: '设备ID'
  },
  name: {
    type: DataTypes.STRING(100),
    defaultValue: '',
    comment: '设备名称'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'offline'),
    defaultValue: 'active',
    comment: '设备状态'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '设备描述'
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
      fields: ['devId']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = Device;