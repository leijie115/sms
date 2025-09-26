// ecosystem.config.js
module.exports = {
    apps: [
      {
        // 应用配置
        name: 'sms-system',
        script: './server/app.js',
        
        // 进程数配置
        instances: 1,  // 或者使用 'max' 来使用所有CPU核心
        exec_mode: 'cluster',  // cluster模式，支持负载均衡
        
        // 环境变量
        // env: {
        //   NODE_ENV: 'development',
        //   PORT: 3000
        // },
        
        // 环境特定配置
        // env_production: {
        env: {
          NODE_ENV: 'production',
          PORT: 3000,
          instances: 'max',
          exec_mode: 'cluster'
        },
        
        // 日志配置
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        error_file: './logs/pm2-error.log',
        out_file: './logs/pm2-out.log',
        merge_logs: true,
        
        // 监控和重启配置
        watch: false,  // 生产环境建议关闭
        ignore_watch: ['node_modules', 'logs', 'dist', '.git'],
        max_memory_restart: '1G',
        
        // 崩溃重启配置
        min_uptime: '10s',
        max_restarts: 10,
        autorestart: true,
        
        // 优雅关闭
        kill_timeout: 5000,
        wait_ready: true,
        listen_timeout: 3000,
        
        // 其他配置
        cwd: './',
        node_args: '--max-old-space-size=2048'
        
      }
    ],
    
    // 部署配置（可选）
    deploy: {
      production: {
        user: 'root',  // 服务器用户名
        host: '10.10.10.151',  // 服务器IP
        ref: 'origin/main',  // git分支
        repo: 'https://github.com/leijie115/sms.git',  // git仓库
        path: '/www/wwwroot/sms-system',  // 服务器部署路径
        'pre-deploy': 'git fetch --all',
        'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
        'pre-setup': ''
      }
    }
  };