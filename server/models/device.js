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
  apiUrl: {
    type: DataTypes.STRING(255),
    comment: '设备API接口地址',
    validate: {
      isUrl: {
        msg: '请输入有效的URL地址'
      }
    }
  },
  apiToken: {
    type: DataTypes.STRING(255),
    comment: '设备API访问令牌'
  },
  apiEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否启用API控制'
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