// server/utils/logger.js
const fs = require('fs');
const path = require('path');
const util = require('util');
const moment = require('moment-timezone');

class Logger {
  constructor() {
    // 设置时区为中国时区（根据您的需求调整）
    this.timezone = process.env.TZ || 'Asia/Shanghai';
    
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, `app-${this.getLocalDateString()}.log`);
    this.requestLogFile = path.join(this.logDir, `request-${this.getLocalDateString()}.log`);
    this.errorLogFile = path.join(this.logDir, `error-${this.getLocalDateString()}.log`);
    
    // 创建日志目录
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // 保存原始的console方法
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    };

    // 劫持console方法
    this.hijackConsole();
    
    // 设置全局错误处理
    this.setupGlobalErrorHandlers();
  }

  /**
   * 获取本地日期字符串 YYYY-MM-DD
   * 使用moment-timezone确保时区正确
   */
  getLocalDateString() {
    return moment().tz(this.timezone).format('YYYY-MM-DD');
  }

  /**
   * 获取本地时间戳字符串
   */
  getLocalTimestamp() {
    return moment().tz(this.timezone).format('YYYY-MM-DD HH:mm:ss.SSS');
  }

  /**
   * 获取日期字符串（兼容旧代码）
   */
  getDateString() {
    return this.getLocalDateString();
  }

  /**
   * 获取时间戳字符串（兼容旧代码）
   */
  getTimestamp() {
    return this.getLocalTimestamp();
  }

  /**
   * 格式化日志参数
   */
  formatArgs(args) {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return util.inspect(arg);
        }
      }
      return arg;
    }).join(' ');
  }

  /**
   * 写入日志文件
   */
  writeLog(level, args, options = {}) {
    const timestamp = this.getLocalTimestamp();
    const message = this.formatArgs(args);
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    // 确保日志文件是当天的（使用本地日期）
    const currentDate = this.getLocalDateString();
    const currentLogFile = options.requestLog ?
      path.join(this.logDir, `request-${currentDate}.log`) :
      path.join(this.logDir, `app-${currentDate}.log`);
    
    // 同步写入主日志
    try {
      fs.appendFileSync(currentLogFile, logEntry);
    } catch (error) {
      // 如果写入失败，至少输出到控制台
      this.originalConsole.error('写入日志失败:', error);
    }
    
    // 如果是错误或警告，额外写入错误日志文件
    if (level === 'error' || level === 'warn') {
      const errorLogFile = path.join(this.logDir, `error-${currentDate}.log`);
      try {
        fs.appendFileSync(errorLogFile, logEntry);
      } catch (error) {
        this.originalConsole.error('写入错误日志失败:', error);
      }
    }

    // 同时输出到控制台（使用原始方法）
    const consoleMethod = this.originalConsole[level] || this.originalConsole.log;
    consoleMethod.apply(console, args);
  }

  /**
   * 劫持console方法
   */
  hijackConsole() {
    const self = this;
    
    console.log = function(...args) {
      self.writeLog('log', args);
    };

    console.error = function(...args) {
      self.writeLog('error', args);
    };

    console.warn = function(...args) {
      self.writeLog('warn', args);
    };

    console.info = function(...args) {
      self.writeLog('info', args);
    };

    console.debug = function(...args) {
      self.writeLog('debug', args);
    };
  }

  /**
   * 设置全局错误处理
   */
  setupGlobalErrorHandlers() {
    const self = this;
    
    // 捕获未捕获的异常
    process.on('uncaughtException', (error) => {
      self.logError('UncaughtException', error);
      // 给一些时间写入日志后再退出
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    // 捕获未处理的Promise rejection
    process.on('unhandledRejection', (reason, promise) => {
      self.logError('UnhandledRejection', reason, {
        promise: util.inspect(promise)
      });
    });

    // 捕获警告
    process.on('warning', (warning) => {
      self.logError('Warning', warning, {
        type: 'process-warning'
      });
    });

    // 进程退出前的清理
    process.on('beforeExit', (code) => {
      console.log(`进程即将退出，退出码: ${code}`);
    });

    // SIGINT信号处理（Ctrl+C）
    process.on('SIGINT', () => {
      console.log('\n收到 SIGINT 信号，正在优雅关闭...');
      setTimeout(() => {
        process.exit(0);
      }, 500);
    });

    // SIGTERM信号处理
    process.on('SIGTERM', () => {
      console.log('收到 SIGTERM 信号，正在优雅关闭...');
      setTimeout(() => {
        process.exit(0);
      }, 500);
    });
  }

  /**
   * 记录错误日志
   */
  logError(type, error, additionalInfo = {}) {
    const timestamp = this.getLocalTimestamp();
    const currentDate = this.getLocalDateString();
    const errorData = {
      timestamp,
      type,
      message: error?.message || error,
      stack: error?.stack,
      ...additionalInfo
    };

    // 格式化错误信息
    const errorEntry = `[${timestamp}] [${type.toUpperCase()}] ${JSON.stringify(errorData, null, 2)}\n`;
    
    // 写入错误日志文件（使用当前本地日期）
    const errorLogFile = path.join(this.logDir, `error-${currentDate}.log`);
    
    try {
      fs.appendFileSync(errorLogFile, errorEntry);
      // 同时写入主日志
      fs.appendFileSync(
        path.join(this.logDir, `app-${currentDate}.log`), 
        errorEntry
      );
    } catch (writeError) {
      this.originalConsole.error('写入错误日志失败:', writeError);
    }

    // 输出到控制台
    this.originalConsole.error(`[${type}]`, error);
    if (error?.stack) {
      this.originalConsole.error(error.stack);
    }
  }

  /**
   * 记录请求日志
   */
  logRequest(ctx, responseTime) {
    const timestamp = this.getLocalTimestamp();
    const currentDate = this.getLocalDateString();
    const logData = {
      timestamp,
      method: ctx.method,
      url: ctx.url,
      ip: ctx.ip,
      userAgent: ctx.headers['user-agent'],
      status: ctx.status,
      responseTime: `${responseTime}ms`,
      body: ctx.method !== 'GET' ? ctx.request.body : undefined,
      error: ctx.status >= 400 ? ctx.body : undefined
    };

    const logEntry = `[${timestamp}] [REQUEST] ${JSON.stringify(logData)}\n`;
    
    const requestLogFile = path.join(this.logDir, `request-${currentDate}.log`);
    
    try {
      fs.appendFileSync(requestLogFile, logEntry);
    } catch (error) {
      this.originalConsole.error('写入请求日志失败:', error);
    }

    // 在控制台简要输出
    const statusColor = ctx.status >= 500 ? '\x1b[31m' : // 红色 5xx
                       ctx.status >= 400 ? '\x1b[33m' : // 黄色 4xx
                       ctx.status >= 300 ? '\x1b[36m' : // 青色 3xx
                       ctx.status >= 200 ? '\x1b[32m' : // 绿色 2xx
                       '\x1b[0m'; // 默认
    
    console.log(
      `${statusColor}${ctx.method} ${ctx.url} ${ctx.status}\x1b[0m - ${responseTime}ms - ${ctx.ip}`
    );
  }

  /**
   * 记录Webhook请求（外部请求）
   */
  logWebhook(data) {
    const timestamp = this.getLocalTimestamp();
    const currentDate = this.getLocalDateString();
    const logData = {
      timestamp,
      type: 'WEBHOOK',
      ...data
    };

    const logEntry = `[${timestamp}] [WEBHOOK] ${JSON.stringify(logData)}\n`;
    const webhookLogFile = path.join(this.logDir, `webhook-${currentDate}.log`);
    
    try {
      fs.appendFileSync(webhookLogFile, logEntry);
      // 同时写入主日志
      fs.appendFileSync(path.join(this.logDir, `app-${currentDate}.log`), logEntry);
    } catch (error) {
      this.originalConsole.error('写入Webhook日志失败:', error);
    }
  }

  /**
   * 记录转发操作
   */
  logForward(data) {
    const timestamp = this.getLocalTimestamp();
    const currentDate = this.getLocalDateString();
    const logData = {
      timestamp,
      type: 'FORWARD',
      ...data
    };

    const status = data.status === 'success' ? 'SUCCESS' : 'FAILED';
    const icon = data.status === 'success' ? '✅' : '❌';
    
    console.log(`${icon} [FORWARD-${status}] ${data.platform} - ${data.message || ''}`);
    
    // 额外写入转发专用日志
    const forwardLogFile = path.join(this.logDir, `forward-${currentDate}.log`);
    const logEntry = `[${timestamp}] [${status}] ${JSON.stringify(logData)}\n`;
    
    try {
      fs.appendFileSync(forwardLogFile, logEntry);
    } catch (error) {
      this.originalConsole.error('写入转发日志失败:', error);
    }
  }

  /**
   * 获取日志文件列表
   */
  getLogFiles() {
    try {
      const files = fs.readdirSync(this.logDir);
      return files.map(file => ({
        name: file,
        path: path.join(this.logDir, file),
        size: fs.statSync(path.join(this.logDir, file)).size,
        modified: fs.statSync(path.join(this.logDir, file)).mtime
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * 读取日志文件内容（最后N行）
   */
  readLogTail(filename, lines = 100) {
    try {
      const filePath = path.join(this.logDir, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      const logLines = content.split('\n').filter(line => line.trim());
      return logLines.slice(-lines).join('\n');
    } catch (error) {
      return `读取日志失败: ${error.message}`;
    }
  }

  /**
   * 清理旧日志文件（保留最近N天）
   */
  cleanOldLogs(daysToKeep = 30) {
    try {
      const files = fs.readdirSync(this.logDir);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtime.getTime();

        if (age > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`清理旧日志: ${file}`);
        }
      });
    } catch (error) {
      console.error('清理日志失败:', error);
    }
  }
}

// 创建单例
const logger = new Logger();

// 导出日志中间件
const loggerMiddleware = async (ctx, next) => {
  const start = Date.now();
  
  try {
    await next();
  } catch (err) {
    // 记录错误到错误日志
    logger.logError('KoaMiddlewareError', err, {
      method: ctx.method,
      url: ctx.url,
      ip: ctx.ip,
      headers: ctx.headers,
      body: ctx.request.body
    });
    
    // 设置错误响应
    ctx.status = err.status || 500;
    ctx.body = {
      success: false,
      message: process.env.NODE_ENV === 'production' ? 
        '服务器内部错误' : 
        err.message,
      error: process.env.NODE_ENV === 'production' ? 
        undefined : 
        {
          message: err.message,
          stack: err.stack,
          status: err.status
        }
    };
  }
  
  const responseTime = Date.now() - start;
  logger.logRequest(ctx, responseTime);
};

// 导出错误处理中间件
const errorHandler = async (ctx, next) => {
  try {
    await next();
    
    // 处理404
    if (ctx.status === 404 && !ctx.body) {
      logger.logError('NotFound', `404 - ${ctx.url}`, {
        method: ctx.method,
        url: ctx.url,
        ip: ctx.ip
      });
    }
  } catch (err) {
    logger.logError('GlobalErrorHandler', err, {
      method: ctx.method,
      url: ctx.url,
      ip: ctx.ip
    });
    
    ctx.status = err.status || 500;
    ctx.body = {
      success: false,
      message: err.message || '服务器内部错误'
    };
  }
};

module.exports = {
  logger,
  loggerMiddleware,
  errorHandler
};