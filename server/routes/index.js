// server/routes/index.js
const Router = require('koa-router');
const authMiddleware = require('../middleware/auth');
const authController = require('../controllers/auth');
const webhookController = require('../controllers/webhook');
const deviceController = require('../controllers/device');
const simCardController = require('../controllers/simCard');
const smsMessageController = require('../controllers/smsMessage');
const forwardSettingController = require('../controllers/forwardSetting');
const logController = require('../controllers/log');

const router = new Router({ prefix: '/api' });

// ========== 公开路由（不需要认证） ==========

// Webhook 接收端点 - 不需要认证
router.post('/webhook', webhookController.receiveWebhook);

// 认证路由
router.post('/login', authController.login);

// ========== 需要认证的路由 ==========

// 检查认证状态
router.get('/check-auth', authMiddleware, authController.checkAuth);

// 设备路由
router.get('/devices', authMiddleware, deviceController.getDevices);
router.get('/devices/:id', authMiddleware, deviceController.getDevice);
router.post('/devices', authMiddleware, deviceController.createDevice);
router.put('/devices/:id', authMiddleware, deviceController.updateDevice);
router.delete('/devices/:id', authMiddleware, deviceController.deleteDevice); // 禁用

// 设备API控制路由（精简版）
router.put('/devices/:id/api', authMiddleware, deviceController.updateDeviceApi);
router.post('/devices/:id/test', authMiddleware, deviceController.testDeviceConnection);
router.post('/devices/:id/answer', authMiddleware, deviceController.answerCall);
router.post('/devices/:id/hangup', authMiddleware, deviceController.hangUp);
router.post('/devices/:id/reboot', authMiddleware, deviceController.rebootDevice);

// SIM卡路由
router.get('/simcards', authMiddleware, simCardController.getSimCards);
router.get('/simcards/:id', authMiddleware, simCardController.getSimCard);
router.post('/simcards', authMiddleware, simCardController.createSimCard);
router.put('/simcards/:id', authMiddleware, simCardController.updateSimCard);
// router.delete('/simcards/:id', authMiddleware, simCardController.deleteSimCard); // 移除删除功能

// 新增电话控制路由
router.post('/simcards/:id/answer', simCardController.answerCall);
router.post('/simcards/:id/hangup', simCardController.hangUp);


// 短信路由
router.get('/sms-messages', authMiddleware, smsMessageController.getSmsMessages);
router.get('/sms-messages/statistics', authMiddleware, smsMessageController.getSmsStatistics);
router.get('/sms-messages/:id', authMiddleware, smsMessageController.getSmsMessage);
router.delete('/sms-messages/:id', authMiddleware, smsMessageController.deleteSmsMessage); // 禁用

// Webhook 日志查看
router.get('/webhook-logs', authMiddleware, webhookController.getWebhookLogs);

// 转发设置路由
router.get('/forward-settings', authMiddleware, forwardSettingController.getForwardSettings);
router.get('/forward-settings/statistics', authMiddleware, forwardSettingController.getForwardStatistics);
router.get('/forward-settings/filters', authMiddleware, forwardSettingController.getAvailableFilters);
router.get('/forward-settings/:platform', authMiddleware, forwardSettingController.getForwardSetting);
router.put('/forward-settings/:platform', authMiddleware, forwardSettingController.updateForwardSetting);
router.post('/forward-settings/:platform/test', authMiddleware, forwardSettingController.testForwardSetting);

// 日志管理路由
router.get('/logs', authMiddleware, logController.getLogFiles);
router.get('/logs/tail', authMiddleware, logController.tailLog);
router.get('/logs/:filename', authMiddleware, logController.readLogFile);
router.get('/logs/:filename/download', authMiddleware, logController.downloadLogFile);
router.post('/logs/clean', authMiddleware, logController.cleanOldLogs);

module.exports = router;