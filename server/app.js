// server/app.js
require('dotenv').config();
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const serve = require('koa-static');
const path = require('path');
const fs = require('fs');

const routes = require('./routes');
const { sequelize, Device, SimCard, SmsMessage, ForwardSetting } = require('./models');
const { logger, loggerMiddleware, errorHandler } = require('./utils/logger');

const app = new Koa();
const port = process.env.PORT || 3000;

// 错误处理中间件 - 必须放在最前面
app.use(errorHandler);

// 日志中间件
app.use(loggerMiddleware);

// Body解析中间件 - 添加错误处理
app.use(async (ctx, next) => {
  try {
    await bodyParser()(ctx, next);
  } catch (err) {
    if (err.status === 400) {
      logger.logError('BodyParserError', err, {
        url: ctx.url,
        method: ctx.method,
        body: ctx.request.body
      });
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请求体解析错误，请检查JSON格式'
      };
    } else {
      throw err;
    }
  }
});

// 静态文件服务
if (process.env.NODE_ENV === 'production') {
  app.use(serve(path.join(__dirname, '../dist')));
} else {
  app.use(serve(path.join(__dirname, '../client')));
}

// API 路由
app.use(routes.routes()).use(routes.allowedMethods());

// 404 处理 - 必须放在所有路由之后
app.use(async (ctx) => {
  // 如果是 API 请求，返回 JSON
  if (ctx.path.startsWith('/api')) {
    ctx.status = 404;
    ctx.body = {
      success: false,
      message: 'API endpoint not found',
      path: ctx.path
    };
  } else {
    // 否则返回 HTML 404 页面
    ctx.status = 404;
    ctx.type = 'html';
    ctx.body = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>404 - 页面未找到</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      text-align: center;
      color: white;
    }
    h1 { font-size: 120px; margin: 0; }
    p { font-size: 24px; margin: 20px 0; }
    a { 
      color: white; 
      text-decoration: none;
      padding: 10px 20px;
      border: 2px solid white;
      border-radius: 5px;
      display: inline-block;
      margin-top: 20px;
      transition: all 0.3s;
    }
    a:hover {
      background: white;
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>页面未找到</p>
    <a href="/">返回首页</a>
  </div>
</body>
</html>`;
  }
});

// 全局错误处理
app.on('error', (err, ctx) => {
  // 这里的错误已经被中间件处理并记录
  // 这里只是作为最后的保障
  if (!ctx) {
    logger.logError('AppError', err, {
      message: '应用级错误（无上下文）'
    });
  }
});

// 每天凌晨2点清理365天前的日志（已修改为365天）
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 2 && now.getMinutes() === 0) {
    logger.cleanOldLogs(365); // 修改为365天
  }
}, 60000); // 每分钟检查一次

// 数据库连接和服务器启动
async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    // 根据环境变量决定是否同步数据库
    // 生产环境：不自动同步
    // 开发环境：只在首次运行时同步，之后不再自动同步
    const shouldSync = process.env.DB_SYNC === 'true' || process.env.NODE_ENV === 'development_first_run';
    
    if (shouldSync) {
      console.log('⚠️  正在同步数据库模型...');
      // 使用 sync({ force: false }) 而不是 alter: true
      // force: false 只会创建不存在的表，不会修改已存在的表结构
      await sequelize.sync({ force: false });
      console.log('✅ 数据库模型同步成功');
      console.log('');
      console.log('📌 提示：如果需要更新表结构，请手动执行 SQL 语句');
      console.log('📌 或者设置环境变量 DB_SYNC=true 来强制同步');
    } else {
      console.log('ℹ️  跳过数据库同步（生产模式）');
      
      // 验证表是否存在
      try {
        await Device.findOne({ limit: 1 });
        await SimCard.findOne({ limit: 1 });
        await SmsMessage.findOne({ limit: 1 });
        await ForwardSetting.findOne({ limit: 1 });
        console.log('✅ 数据库表验证成功');
      } catch (error) {
        console.error('❌ 数据库表验证失败，请确保所有表都已创建');
        console.error('   提示：运行 init_database.sql 初始化数据库');
        console.error('   或设置 DB_SYNC=true 环境变量来自动创建表');
        throw error;
      }
    }
    
    // 输出模型信息
    console.log('📊 已加载的数据模型:');
    console.log('   - Device (设备)');
    console.log('   - SimCard (SIM卡)');
    console.log('   - SmsMessage (短信消息)');
    console.log('   - ForwardSetting (转发设置)');
    console.log('📁 日志文件:');
    console.log('   - logs/app-YYYY-MM-DD.log (应用日志)');
    console.log('   - logs/error-YYYY-MM-DD.log (错误日志)');
    console.log('   - logs/request-YYYY-MM-DD.log (请求日志)');
    console.log('   - logs/webhook-YYYY-MM-DD.log (Webhook日志)');
    console.log('   - logs/forward-YYYY-MM-DD.log (转发日志)');
    
    app.listen(port, () => {
      console.log(`\n🚀 服务器运行在 http://localhost:${port}`);
      console.log(`📝 Webhook 接口: POST http://localhost:${port}/api/webhook`);
      console.log(`🔐 默认账号: admin`);
      console.log(`🔑 默认密码: admin123\n`);
      
      // 生产环境提示
      if (process.env.NODE_ENV === 'production') {
        console.log('⚠️  当前运行在生产模式');
        console.log('   - 数据库不会自动同步');
        console.log('   - 日志保留365天');
        console.log('   - 请确保已正确配置所有环境变量\n');
      }
    });
  } catch (error) {
    logger.logError('StartupError', error, {
      message: '服务器启动失败'
    });
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n收到 SIGINT 信号，正在优雅关闭...');
  try {
    await sequelize.close();
    console.log('✅ 数据库连接已关闭');
    process.exit(0);
  } catch (error) {
    console.error('❌ 关闭数据库连接失败:', error);
    process.exit(1);
  }
});

// 处理启动错误
start().catch(error => {
  logger.logError('FatalStartupError', error);
  console.error('❌ 致命错误:', error);
  process.exit(1);
});