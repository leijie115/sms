// server/controllers/log.js
const { logger } = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * 获取日志文件列表
 */
const getLogFiles = async (ctx) => {
  try {
    const files = logger.getLogFiles();
    
    // 按修改时间倒序排序
    files.sort((a, b) => b.modified - a.modified);
    
    // 格式化文件信息
    const formattedFiles = files.map(file => ({
      name: file.name,
      size: formatFileSize(file.size),
      sizeBytes: file.size,
      modified: file.modified,
      type: getLogType(file.name)
    }));
    
    ctx.body = {
      success: true,
      data: formattedFiles
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取日志文件列表失败',
      error: error.message
    };
  }
};

/**
 * 读取日志文件内容
 */
const readLogFile = async (ctx) => {
  try {
    const { filename } = ctx.params;
    const { lines = 100 } = ctx.query;
    
    // 安全检查：防止路径穿越
    if (filename.includes('..') || filename.includes('/')) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '无效的文件名'
      };
      return;
    }
    
    const content = logger.readLogTail(filename, parseInt(lines));
    
    ctx.body = {
      success: true,
      data: {
        filename,
        content,
        lines: parseInt(lines)
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '读取日志文件失败',
      error: error.message
    };
  }
};

/**
 * 下载日志文件
 */
const downloadLogFile = async (ctx) => {
  try {
    const { filename } = ctx.params;
    
    // 安全检查
    if (filename.includes('..') || filename.includes('/')) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '无效的文件名'
      };
      return;
    }
    
    const logPath = path.join(process.cwd(), 'logs', filename);
    const content = await fs.readFile(logPath);
    
    ctx.set('Content-Type', 'text/plain');
    ctx.set('Content-Disposition', `attachment; filename="${filename}"`);
    ctx.body = content;
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '下载日志文件失败',
      error: error.message
    };
  }
};

/**
 * 清理旧日志
 */
const cleanOldLogs = async (ctx) => {
  try {
    const { days = 30 } = ctx.request.body;
    
    logger.cleanOldLogs(parseInt(days));
    
    ctx.body = {
      success: true,
      message: `已清理 ${days} 天前的日志文件`
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '清理日志失败',
      error: error.message
    };
  }
};

/**
 * 实时查看日志（最新的N条）
 */
const tailLog = async (ctx) => {
  try {
    const { type = 'app', lines = 50 } = ctx.query;
    
    // 根据类型选择日志文件
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const filename = `${type}-${dateStr}.log`;
    
    const content = logger.readLogTail(filename, parseInt(lines));
    
    // 解析日志内容为结构化数据
    const logLines = content.split('\n').filter(line => line.trim());
    const parsedLogs = logLines.map(line => {
      try {
        // 尝试解析JSON格式的日志
        if (line.includes('[REQUEST]') || line.includes('[WEBHOOK]') || line.includes('[FORWARD')) {
          const jsonStart = line.indexOf('{');
          if (jsonStart !== -1) {
            return JSON.parse(line.substring(jsonStart));
          }
        }
        
        // 解析标准格式日志 [时间] [级别] 消息
        const match = line.match(/\[(.*?)\] \[(.*?)\] (.*)/);
        if (match) {
          return {
            timestamp: match[1],
            level: match[2],
            message: match[3]
          };
        }
        
        return { raw: line };
      } catch {
        return { raw: line };
      }
    });
    
    ctx.body = {
      success: true,
      data: {
        type,
        filename,
        logs: parsedLogs,
        total: parsedLogs.length
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取实时日志失败',
      error: error.message
    };
  }
};

// 辅助函数：格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 辅助函数：获取日志类型
function getLogType(filename) {
  if (filename.includes('app-')) return 'application';
  if (filename.includes('error-')) return 'error';
  if (filename.includes('request-')) return 'request';
  if (filename.includes('webhook-')) return 'webhook';
  if (filename.includes('forward-')) return 'forward';
  return 'other';
}

module.exports = {
  getLogFiles,
  readLogFile,
  downloadLogFile,
  cleanOldLogs,
  tailLog
};