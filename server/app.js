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

// API 路由 - 必须在静态文件服务之前
app.use(routes.routes()).use(routes.allowedMethods());

// 静态文件服务和 SPA 支持
if (process.env.NODE_ENV === 'production' || process.env.USE_DIST === 'true') {
  const distPath = path.join(__dirname, '../dist');
  
  // 检查 dist 目录
  if (!fs.existsSync(distPath)) {
    console.error('⚠️  警告: dist 目录不存在，请运行 npm run build');
    console.error('   当前 NODE_ENV:', process.env.NODE_ENV);
    console.error('   期望目录:', distPath);
  } else {
    console.log('📁 使用静态文件目录: dist/');
    
    // SPA 路由处理 - 必须在 koa-static 之前
    app.use(async (ctx, next) => {
      // API 路由已经在上面处理了，这里跳过
      if (ctx.path.startsWith('/api')) {
        return next();
      }
      
      // 获取文件扩展名
      const ext = path.extname(ctx.path);
      
      // 如果是静态资源请求（有扩展名且不是 .html）
      if (ext && ext !== '.html') {
        // 检查文件是否存在
        const filePath = path.join(distPath, ctx.path);
        if (fs.existsSync(filePath)) {
          // 文件存在，让 koa-static 处理
          return next();
        } else {
          // 文件不存在，返回 404
          ctx.status = 404;
          return;
        }
      }
      
      // 所有页面路由（包括 /, /login, /devices 等）都返回 index.html
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        ctx.status = 200;
        ctx.type = 'html';
        ctx.body = fs.createReadStream(indexPath);
        return;  // 重要：直接返回，不调用 next()
      } else {
        // index.html 不存在
        ctx.status = 500;
        ctx.body = 'index.html not found. Please run: npm run build';
        return;
      }
    });
    
    // 静态文件服务（处理 JS、CSS、图片等）
    app.use(serve(distPath));
  }
} else {
  // 开发环境
  console.log('📁 使用静态文件目录: client/ (开发模式)');
  app.use(serve(path.join(__dirname, '../client')));
}

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
  } else if (process.env.NODE_ENV === 'production' || process.env.USE_DIST === 'true') {
    // 生产环境：对于所有非 API 路由，返回 index.html（让前端路由处理）
    const distPath = path.join(__dirname, '../dist');
    const indexPath = path.join(distPath, 'index.html');
    
    // 检查是否是静态资源请求（有扩展名的）
    const ext = path.extname(ctx.path);
    if (ext && ext !== '.html') {
      // 静态资源真的不存在，返回 404
      ctx.status = 404;
      ctx.body = 'Not Found';
      return;
    }
    
    // 所有页面路由都返回 index.html
    if (fs.existsSync(indexPath)) {
      ctx.status = 200;
      ctx.type = 'html';
      ctx.body = fs.createReadStream(indexPath);
    } else {
      // index.html 不存在，显示错误提示
      ctx.status = 500;
      ctx.type = 'html';
      ctx.body = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>错误 - 系统未正确部署</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #d32f2f; }
    pre { 
      background: #f5f5f5; 
      padding: 15px; 
      border-radius: 4px;
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>系统未正确部署</h1>
    <p>dist/index.html 文件不存在</p>
    <pre>请运行以下命令：
npm run build</pre>
  </div>
</body>
</html>`;
    }
  } else {
    // 开发环境返回 404 页面
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

// 每天凌晨2点清理365天前的日志
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 2 && now.getMinutes() === 0) {
    logger.cleanOldLogs(365);
  }
}, 60000); // 每分钟检查一次

// 数据库连接和服务器启动
async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    // 根据环境变量决定是否同步数据库
    const shouldSync = process.env.DB_SYNC === 'true' || process.env.NODE_ENV === 'development_first_run';
    
    if (shouldSync) {
      console.log('⚠️  正在同步数据库模型...');
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
    
    // 生产环境检查 dist 目录
    if (process.env.NODE_ENV === 'production' || process.env.USE_DIST === 'true') {
      const distPath = path.join(__dirname, '../dist');
      if (!fs.existsSync(distPath)) {
        console.log('');
        console.log('⚠️  警告: dist 目录不存在！');
        console.log('   请运行以下命令构建前端：');
        console.log('   npm run build');
        console.log('');
      } else {
        const indexPath = path.join(distPath, 'index.html');
        if (!fs.existsSync(indexPath)) {
          console.log('');
          console.log('⚠️  警告: dist/index.html 不存在！');
          console.log('   请运行以下命令构建前端：');
          console.log('   npm run build');
          console.log('');
        }
      }
    }
    
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

// 处理未捕获的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.logError('UnhandledRejection', reason, {
    promise: promise.toString()
  });
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.logError('UncaughtException', error);
  // 给一些时间让日志写入
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// 启动应用
start().catch(error => {
  logger.logError('FatalStartupError', error);
  console.error('❌ 致命错误:', error);
  process.exit(1);
});