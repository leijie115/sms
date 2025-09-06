// server/services/deviceControlService.js
const axios = require('axios');
const Device = require('../models/device');
const { logger } = require('../utils/logger');

class DeviceControlService {
  /**
   * 发送命令到设备
   * @param {number} deviceId - 设备ID
   * @param {string} command - 命令类型
   * @param {object} params - 命令参数
   */
  async sendCommand(deviceId, command, params = {}) {
    try {
      // 获取设备信息
      const device = await Device.findByPk(deviceId);
      
      if (!device) {
        throw new Error('设备不存在');
      }

      if (!device.apiEnabled) {
        throw new Error('设备未启用API控制');
      }

      if (!device.apiUrl) {
        throw new Error('设备API地址未配置');
      }

      if (!device.apiToken) {
        throw new Error('设备API Token未配置');
      }

      // 构建基础URL参数
      const baseParams = {
        token: device.apiToken,
        cmd: command
      };

      // 合并参数
      const allParams = { ...baseParams, ...params };
      
      // 构建完整URL
      const url = `${device.apiUrl}/ctrl`;
      
      console.log(`📡 发送命令到设备 ${device.name}:`, command);
      console.log(`   URL: ${url}`);
      console.log(`   参数:`, allParams);
      
      // 发送GET请求
      const response = await axios.get(url, {
        params: allParams,
        timeout: 10000
      });

      // 更新设备统计
      await device.update({
        lastApiCallTime: new Date(),
        apiCallCount: (device.apiCallCount || 0) + 1
      });

      // 记录成功日志
      logger.log(`设备控制成功: ${device.name} - ${command}`);

      return {
        success: true,
        data: response.data,
        device: device.name,
        command
      };

    } catch (error) {
      // 记录错误日志
      logger.logError('DeviceControlError', error, {
        deviceId,
        command,
        params
      });

      throw error;
    }
  }

  /**
   * 接听电话
   * @param {number} deviceId - 设备ID
   * @param {object} options - 接听选项
   * @param {number} options.slot - 卡槽 (1或2)
   * @param {number} options.duration - 拨通后等待时长(秒)
   * @param {string} options.ttsContent - 拨通后播放的TTS语音内容
   * @param {number} options.ttsRepeat - TTS播放次数
   * @param {boolean} options.recording - 是否录音 (1=录音, 0=不录音)
   * @param {boolean} options.speaker - 是否开启扬声器 (1=开启, 0=关闭)
   */
  async answerCall(deviceId, options = {}) {
    const {
      slot = 1,
      duration = 55,
      ttsContent = '',
      ttsRepeat = 2,
      recording = true,
      speaker = true
    } = options;

    const params = {
      p1: slot,
      p2: duration,
      p3: ttsContent,
      p4: ttsRepeat,
      p5: recording ? 1 : 0,
      p6: speaker ? 1 : 0
    };

    return await this.sendCommand(deviceId, 'telanswer', params);
  }

  /**
   * 挂断电话
   * @param {number} deviceId - 设备ID
   * @param {number} slot - SIM卡槽位 (1或2)
   */
  async hangUp(deviceId, slot = 1) {
    const params = {
      p1: slot
    };
    return await this.sendCommand(deviceId, 'telhangup', params);
  }

  /**
   * 重启设备
   * @param {number} deviceId - 设备ID
   */
  async rebootDevice(deviceId) {
    return await this.sendCommand(deviceId, 'restart');
  }

  /**
   * 测试设备连接
   * @param {number} deviceId - 设备ID
   */
  async testConnection(deviceId) {
    try {
      const device = await Device.findByPk(deviceId);
      
      if (!device || !device.apiUrl || !device.apiToken) {
        throw new Error('设备配置不完整');
      }

      // 使用设备状态命令测试连接
      const url = `${device.apiUrl}/ctrl`;
      const response = await axios.get(url, {
        params: {
          token: device.apiToken,
          cmd: 'status'
        },
        timeout: 5000
      });

      await device.update({
        status: 'active',
        lastActiveTime: new Date()
      });

      return {
        success: true,
        status: 'online',
        message: '设备连接正常',
        data: response.data
      };

    } catch (error) {
      const device = await Device.findByPk(deviceId);
      if (device) {
        await device.update({
          status: 'offline'
        });
      }

      return {
        success: false,
        status: 'offline',
        message: '设备连接失败',
        error: error.message
      };
    }
  }
}

module.exports = new DeviceControlService();