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

      // 检查返回结果是否为错误
      if (response.data && response.data.code === 101) {
        throw new Error(response.data.msg || '设备返回错误');
      }

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

      // 如果是axios错误，提取更友好的错误信息
      if (error.response) {
        const errorMsg = error.response.data?.msg || error.response.data?.message || '设备请求失败';
        throw new Error(errorMsg);
      }

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

    const result = await this.sendCommand(deviceId, 'telanswer', params);
    
    // 检查返回结果
    if (result.data && result.data.code === 101) {
      throw new Error(result.data.msg || '接听命令执行失败');
    }
    
    return result;
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
    
    const result = await this.sendCommand(deviceId, 'telhangup', params);
    
    // 检查返回结果
    if (result.data && result.data.code === 101) {
      throw new Error(result.data.msg || '挂断命令执行失败');
    }
    
    return result;
  }

  /**
   * 重启设备
   * @param {number} deviceId - 设备ID
   */
  async rebootDevice(deviceId) {
    const result = await this.sendCommand(deviceId, 'restart');
    
    // 检查返回结果
    if (result.data && result.data.code === 101) {
      throw new Error(result.data.msg || '重启命令执行失败');
    }
    
    return result;
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

      // 使用 stat 命令测试连接
      const url = `${device.apiUrl}/ctrl`;
      const response = await axios.get(url, {
        params: {
          token: device.apiToken,
          cmd: 'stat'  // 改用 stat 命令
        },
        timeout: 5000
      });

      // 检查返回数据
      if (response.data && response.data.code === 101) {
        // 设备返回错误
        throw new Error(response.data.msg || 'Invalid arguments');
      }

      // 检查是否有设备ID，表示返回了正确的状态信息
      if (response.data && response.data.devId) {
        // 解析设备状态信息
        const statusData = response.data;
        
        // 更新设备信息
        await device.update({
          status: 'active',
          lastActiveTime: new Date(),
          // 如果需要，可以存储更多设备信息
          devId: statusData.devId || device.devId
        });

        // 构建详细的状态信息
        const slotInfo = statusData.slot || {};
        const wifiInfo = statusData.wifi || {};
        
        return {
          success: true,
          status: 'online',
          message: '设备连接正常',
          data: {
            deviceId: statusData.devId,
            hardware: statusData.hwVer,
            network: {
              type: statusData.netCh === 0 ? 'WiFi' : 'Mobile',
              wifi: {
                ssid: wifiInfo.ssid,
                ip: wifiInfo.ip,
                signal: wifiInfo.dbm
              }
            },
            simCards: {
              slot1: {
                status: slotInfo.slot1_sta || 'N/A',
                operator: slotInfo.sim1_op,
                signal: slotInfo.sim1_dbm,
                iccId: slotInfo.sim1_iccId,
                number: slotInfo.sim1_msIsdn
              },
              slot2: {
                status: slotInfo.slot2_sta || 'N/A',
                operator: slotInfo.sim2_op,
                signal: slotInfo.sim2_dbm,
                iccId: slotInfo.sim2_iccId,
                number: slotInfo.sim2_msIsdn
              }
            },
            deviceTime: statusData.devTime,
            dailyRestart: statusData.dailyRst,
            pingInterval: statusData.pingSec
          }
        };
      } else {
        // 返回数据格式不正确
        throw new Error('设备返回数据格式错误');
      }

    } catch (error) {
      const device = await Device.findByPk(deviceId);
      if (device) {
        await device.update({
          status: 'offline'
        });
      }

      // 处理不同类型的错误
      let errorMessage = '设备连接失败';
      let errorDetail = error.message;

      if (error.code === 'ECONNREFUSED') {
        errorMessage = '无法连接到设备';
        errorDetail = '请检查设备IP地址和端口是否正确';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = '连接超时';
        errorDetail = '设备响应超时，请检查网络连接';
      } else if (error.response && error.response.data) {
        if (error.response.data.code === 101) {
          errorMessage = '认证失败';
          errorDetail = error.response.data.msg || 'Token无效或已过期';
        }
      }

      return {
        success: false,
        status: 'offline',
        message: errorMessage,
        error: errorDetail
      };
    }
  }

  /**
   * 获取设备详细状态
   * @param {number} deviceId - 设备ID
   */
  async getDeviceStatus(deviceId) {
    try {
      const device = await Device.findByPk(deviceId);
      
      if (!device || !device.apiUrl || !device.apiToken) {
        throw new Error('设备配置不完整');
      }

      const url = `${device.apiUrl}/ctrl`;
      const response = await axios.get(url, {
        params: {
          token: device.apiToken,
          cmd: 'stat'
        },
        timeout: 5000
      });

      // 检查返回数据
      if (response.data && response.data.code === 101) {
        throw new Error(response.data.msg || '获取状态失败');
      }

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      throw error;
    }
  }
}

module.exports = new DeviceControlService();