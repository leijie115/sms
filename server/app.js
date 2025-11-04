// server/app.js - 修复版本
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
    
    // 先提供静态文件服务
    app.use(serve(distPath, {
      // 设置选项，让 koa-static 不处理目录请求
      index: false
    }));
    
    // SPA 路由处理 - 作为 fallback
    app.use(async (ctx) => {
      // 跳过 API 路由（理论上不会到这里，但保险起见）
      if (ctx.path.startsWith('/api')) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: 'API endpoint not found',
          path: ctx.path
        };
        return;
      }
      
      // 检查是否是静态资源请求
      const ext = path.extname(ctx.path);
      
      // 如果是静态资源请求但文件不存在，返回 404
      if (ext && ext !== '.html') {
        // 静态资源未找到
        ctx.status = 404;
        ctx.body = 'File not found';
        return;
      }
      
      // 对于所有页面路由，返回 index.html
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        ctx.status = 200;
        ctx.type = 'html';
        ctx.body = fs.createReadStream(indexPath);
      } else {
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
    .error-container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      max-width: 500px;
    }
    h1 { color: #d32f2f; margin-bottom: 20px; }
    p { color: #666; line-height: 1.6; }
    code { 
      background: #f5f5f5; 
      padding: 2px 6px; 
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>⚠️ 系统未正确部署</h1>
    <p>前端资源文件未找到，请执行以下命令构建：</p>
    <p><code>npm run build</code></p>
    <p>然后重启服务：</p>
    <p><code>npm start</code></p>
  </div>
</body>
</html>`;
      }
    });
  }
} else {
  // 开发环境
  console.log('📁 使用静态文件目录: client/ (开发模式)');
  app.use(serve(path.join(__dirname, '../client')));
}

// 数据库连接和服务器启动
async function startServer() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    // 同步模型（生产环境谨慎使用）
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      console.log('✅ 数据库模型同步成功');
    }
    
    // 启动服务器
    app.listen(port, () => {
      console.log(`
🚀 服务器运行在 http://localhost:${port}
📝 Webhook 接口: POST http://localhost:${port}/api/webhook
🔐 默认账号: admin
🔑 默认密码: admin123
      `);
    });
  } catch (error) {
    console.error('❌ 启动失败:', error);
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
    console.error('❌ 关闭失败:', error);
    process.exit(1);
  }
});

startServer();