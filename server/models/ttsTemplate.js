// server/models/ttsTemplate.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TtsTemplate = sequelize.define('TtsTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '模板名称'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'TTS语音内容'
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否为默认模板'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序顺序'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  }
}, {
  timestamps: true
});

module.exports = TtsTemplate;