// server/models/forwardSetting.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ForwardSetting = sequelize.define('ForwardSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  platform: {
    type: DataTypes.ENUM('telegram', 'bark', 'webhook', 'wxpusher'),
    allowNull: false,
    unique: true,
    comment: '转发平台'
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否启用'
  },
  config: {
    type: DataTypes.JSON,
    comment: '平台配置信息',
    defaultValue: {}
  },
  filterRules: {
    type: DataTypes.JSON,
    comment: '过滤规则',
    defaultValue: {
      keywords: [],        // 关键词过滤
      senders: [],        // 发送方号码过滤
      devices: [],        // 设备过滤
      simCards: []        // SIM卡过滤
    }
  },
  messageTemplate: {
    type: DataTypes.TEXT,
    comment: '消息模板',
    defaultValue: '📱 新短信\n设备: {device}\nSIM卡: {simcard}\n发送方: {sender}\n内容: {content}\n时间: {time}'
  },
  lastForwardTime: {
    type: DataTypes.DATE,
    comment: '最后转发时间'
  },
  forwardCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '转发计数'
  },
  failCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '失败计数'
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['platform']
    },
    {
      fields: ['enabled']
    }
  ]
});

module.exports = ForwardSetting;