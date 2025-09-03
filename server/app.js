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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - 页面未找到</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      color: #333;
    }
    
    .container {
      text-align: center;
      background: white;
      padding: 60px 40px;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      margin: 20px;
    }
    
    .error-code {
      font-size: 120px;
      font-weight: bold;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
      line-height: 1;
    }
    
    .error-title {
      font-size: 32px;
      margin-bottom: 20px;
      color: #333;
    }
    
    .error-message {
      font-size: 16px;
      color: #666;
      margin-bottom: 30px;
      line-height: 1.6;
    }
    
    .error-path {
      font-family: 'Courier New', monospace;
      background: #f4f4f4;
      padding: 10px 15px;
      border-radius: 5px;
      margin: 20px 0;
      color: #e74c3c;
      word-break: break-all;
    }
    
    .buttons {
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
    }
    
    .btn {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 500;
      transition: transform 0.3s, box-shadow 0.3s;
    }
    
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
    }
    
    .btn-secondary {
      background: #f4f4f4;
      color: #333;
    }
    
    .btn-secondary:hover {
      background: #e8e8e8;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }
    
    .illustration {
      font-size: 80px;
      margin-bottom: 20px;
    }
    
    @media (max-width: 480px) {
      .error-code {
        font-size: 80px;
      }
      
      .error-title {
        font-size: 24px;
      }
      
      .container {
        padding: 40px 30px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="illustration">🔍</div>
    <div class="error-code">404</div>
    <h1 class="error-title">页面未找到</h1>
    <p class="error-message">
      抱歉，您访问的页面不存在或已被移除。<br>
      请检查网址是否正确，或返回首页继续浏览。
    </p>
    <div class="error-path">${ctx.path}</div>
    <div class="buttons">
      <a href="/" class="btn">返回首页</a>
      <a href="javascript:history.back()" class="btn btn-secondary">返回上页</a>
    </div>
  </div>
  
  <script>
    // 5秒后自动跳转到首页
    setTimeout(() => {
      console.log('自动跳转到首页...');
      // window.location.href = '/';
    }, 5000);
  </script>
</body>
</html>
    `;
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

// 每天凌晨2点清理30天前的日志
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 2 && now.getMinutes() === 0) {
    logger.cleanOldLogs(30);
  }
}, 60000); // 每分钟检查一次

// 数据库连接和服务器启动
async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    // 同步数据库模型
    await sequelize.sync({ alter: true });
    console.log('✅ 数据库模型同步成功');
    
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
    });
  } catch (error) {
    logger.logError('StartupError', error, {
      message: '服务器启动失败'
    });
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 处理启动错误
start().catch(error => {
  logger.logError('FatalStartupError', error);
  console.error('❌ 致命错误:', error);
  process.exit(1);
});