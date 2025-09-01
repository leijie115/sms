const Router = require('koa-router');
const authMiddleware = require('../middleware/auth');
const authController = require('../controllers/auth');
const webhookController = require('../controllers/webhook');
const deviceController = require('../controllers/device');
const simCardController = require('../controllers/simCard');
const smsMessageController = require('../controllers/smsMessage');

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

// SIM卡路由
router.get('/simcards', authMiddleware, simCardController.getSimCards);
router.get('/simcards/:id', authMiddleware, simCardController.getSimCard);
router.post('/simcards', authMiddleware, simCardController.createSimCard);
router.put('/simcards/:id', authMiddleware, simCardController.updateSimCard);
// router.delete('/simcards/:id', authMiddleware, simCardController.deleteSimCard); // 移除删除功能

// 短信路由
router.get('/sms-messages', authMiddleware, smsMessageController.getSmsMessages);
router.get('/sms-messages/statistics', authMiddleware, smsMessageController.getSmsStatistics);
router.get('/sms-messages/:id', authMiddleware, smsMessageController.getSmsMessage);
router.delete('/sms-messages/:id', authMiddleware, smsMessageController.deleteSmsMessage); // 禁用

// Webhook 日志查看
router.get('/webhook-logs', authMiddleware, webhookController.getWebhookLogs);

module.exports = router;