-- 1. 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS admin_starter DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. 使用数据库
USE admin_starter;

-- 3. 删除旧表（如果存在）
DROP TABLE IF EXISTS `SmsMessages`;
DROP TABLE IF EXISTS `SimCards`;
DROP TABLE IF EXISTS `Devices`;
DROP TABLE IF EXISTS `ForwardSettings`;

-- 4. 创建设备表
CREATE TABLE `Devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `devId` varchar(50) NOT NULL COMMENT '设备ID',
  `name` varchar(100) DEFAULT '' COMMENT '设备名称',
  `status` enum('active','inactive','offline') DEFAULT 'active' COMMENT '设备状态',
  `description` text COMMENT '设备描述',
  `lastActiveTime` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '最后活跃时间',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `devId` (`devId`),
  KEY `status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 创建SIM卡表
CREATE TABLE `SimCards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `deviceId` int NOT NULL COMMENT '关联的设备ID',
  `slot` int NOT NULL COMMENT '卡槽位置（1或2）',
  `msIsdn` varchar(20) DEFAULT NULL COMMENT '手机号码MSISDN',
  `imsi` varchar(50) DEFAULT NULL COMMENT 'IMSI号',
  `iccId` varchar(50) DEFAULT NULL COMMENT 'ICC ID',
  `scName` varchar(100) DEFAULT '' COMMENT 'SIM卡名称/备注',
  `status` enum('202','203','204','205','209') DEFAULT '204' COMMENT 'SIM卡状态：202基站注册中，203ID已读取，204已就绪，205已弹出，209卡异常',
  `lastActiveTime` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '最后活跃时间',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `SimCards_deviceId_slot` (`deviceId`,`slot`),
  KEY `deviceId` (`deviceId`),
  CONSTRAINT `SimCards_ibfk_1` FOREIGN KEY (`deviceId`) REFERENCES `Devices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 创建短信消息表
CREATE TABLE `SmsMessages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `simCardId` int NOT NULL COMMENT '关联的SIM卡ID',
  `deviceId` int NOT NULL COMMENT '关联的设备ID',
  `netCh` int DEFAULT NULL COMMENT '网络通道号（0=wifi，1=卡槽一）',
  `msgTs` bigint DEFAULT NULL COMMENT '消息时间戳',
  `phNum` varchar(20) DEFAULT NULL COMMENT '发送方手机号',
  `smsBd` text COMMENT '短信内容',
  `smsTs` bigint DEFAULT NULL COMMENT '短信时间戳',
  `rawData` json DEFAULT NULL COMMENT '原始数据',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `simCardId` (`simCardId`),
  KEY `deviceId` (`deviceId`),
  KEY `phNum` (`phNum`),
  KEY `createdAt` (`createdAt`),
  CONSTRAINT `SmsMessages_ibfk_1` FOREIGN KEY (`simCardId`) REFERENCES `SimCards` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SmsMessages_ibfk_2` FOREIGN KEY (`deviceId`) REFERENCES `Devices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 创建转发设置表
CREATE TABLE `ForwardSettings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `platform` enum('telegram','bark','webhook') NOT NULL COMMENT '转发平台',
  `enabled` tinyint(1) DEFAULT '0' COMMENT '是否启用',
  `config` json DEFAULT NULL COMMENT '平台配置信息',
  `filterRules` json DEFAULT NULL COMMENT '过滤规则',
  `messageTemplate` text COMMENT '消息模板',
  `lastForwardTime` datetime DEFAULT NULL COMMENT '最后转发时间',
  `forwardCount` int DEFAULT '0' COMMENT '转发计数',
  `failCount` int DEFAULT '0' COMMENT '失败计数',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `platform` (`platform`),
  KEY `enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 插入您提供的设备数据
INSERT INTO `Devices` (`devId`, `name`, `status`, `description`) 
VALUES ('1091a8443428', '第一个设备', 'active', '开发版第一个机器');

-- 9. 插入您提供的SIM卡数据
INSERT INTO `SimCards` (`deviceId`, `slot`, `msIsdn`, `imsi`, `iccId`, `scName`, `status`) 
VALUES
(1, 1, '+8617602816612', '460012810115581', '89860118802476524938', '联通保号卡', '204'),
(1, 2, '+85269760349', '454003063040863', '8985200014630408634F', '香港clubsim卡', '204');

-- 更新 ForwardSettings 表的 platform 枚举类型
ALTER TABLE `ForwardSettings` 
MODIFY COLUMN `platform` enum('telegram','bark','webhook','wxpusher') NOT NULL COMMENT '转发平台';

-- 插入 WxPusher 默认配置（如果不存在）
INSERT IGNORE INTO `ForwardSettings` (`platform`, `enabled`, `config`, `filterRules`, `messageTemplate`)
VALUES
('wxpusher', 0,
  '{"appToken":"","uids":[],"topicIds":[],"url":""}',
  '{"keywords":[],"senders":[],"devices":[],"simCards":[]}',
  '📱 新短信\n设备: {device}\nSIM卡: {simcard}\n发送方: {sender}\n内容: {content}\n时间: {time}');



ALTER TABLE `SmsMessages` 
ADD COLUMN `msgType` enum('sms','call') DEFAULT 'sms' COMMENT '消息类型：sms-短信，call-来电' AFTER `deviceId`,
ADD COLUMN `callDuration` int DEFAULT NULL COMMENT '通话时长（秒）- 仅来电记录' AFTER `smsTs`,
ADD COLUMN `callStatus` varchar(20) DEFAULT NULL COMMENT '来电状态：ringing-响铃中，missed-未接，answered-已接听' AFTER `callDuration`,
ADD INDEX `idx_msgType` (`msgType`);

-- 更新现有记录为短信类型
UPDATE `SmsMessages` SET `msgType` = 'sms' WHERE `msgType` IS NULL;


-- 1. 添加API控制相关字段
ALTER TABLE `Devices`
ADD COLUMN `apiUrl` varchar(255) DEFAULT NULL COMMENT '设备API接口地址' AFTER `description`,
ADD COLUMN `apiToken` varchar(255) DEFAULT NULL COMMENT '设备API访问令牌' AFTER `apiUrl`,
ADD COLUMN `apiEnabled` tinyint(1) DEFAULT '0' COMMENT '是否启用API控制' AFTER `apiToken`,
ADD COLUMN `lastApiCallTime` datetime DEFAULT NULL COMMENT '最后API调用时间' AFTER `lastActiveTime`,
ADD COLUMN `apiCallCount` int DEFAULT '0' COMMENT 'API调用次数' AFTER `lastApiCallTime`;


ALTER TABLE `SimCards`
ADD COLUMN `lastCallTime` datetime DEFAULT NULL COMMENT '最后来电时间' AFTER `status`,
ADD COLUMN `lastCallNumber` varchar(20) DEFAULT NULL COMMENT '最后来电号码' AFTER `lastCallTime`,
ADD COLUMN `callStatus` enum('idle', 'ringing', 'connected', 'ended') DEFAULT 'idle' COMMENT '通话状态：idle空闲，ringing响铃中，connected通话中，ended已结束' AFTER `lastCallNumber`;


-- 创建 TtsTemplates 表
CREATE TABLE IF NOT EXISTS `TtsTemplates` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL COMMENT '模板名称',
  `content` TEXT NOT NULL COMMENT 'TTS语音内容',
  `isDefault` BOOLEAN DEFAULT 0 COMMENT '是否为默认模板',
  `sortOrder` INT(11) DEFAULT 0 COMMENT '排序顺序',
  `isActive` BOOLEAN DEFAULT 1 COMMENT '是否启用',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_isDefault` (`isDefault`),
  INDEX `idx_isActive` (`isActive`),
  INDEX `idx_sortOrder` (`sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='TTS语音模板表';

-- 插入一些默认的TTS模板数据
INSERT INTO `TtsTemplates` (`name`, `content`, `isDefault`, `sortOrder`, `isActive`) VALUES
('默认语音', '您好，这里暂时无人接听，请稍后再拨。', 1, 0, 1),
('验证码接收', '您好，正在接收验证码，请稍等。', 0, 1, 1),
('快递通知', '您好，快递已收到，谢谢。', 0, 2, 1),
('无人在家', '您好，现在不在家，请改天再联系。', 0, 3, 1),
('会议中', '您好，现在正在开会，稍后回电。', 0, 4, 1),
('忙碌中', '您好，现在有点忙，请稍后联系。', 0, 5, 1),
('外出中', '您好，我现在在外面，不方便接电话。', 0, 6, 1),
('驾驶中', '您好，正在开车，稍后联系您。', 0, 7, 1);

-- 确保只有一个默认模板
-- 创建触发器，当设置新的默认模板时，自动取消其他默认模板
DELIMITER $$
CREATE TRIGGER `before_tts_template_update` 
BEFORE UPDATE ON `TtsTemplates` 
FOR EACH ROW
BEGIN
    IF NEW.isDefault = 1 AND OLD.isDefault = 0 THEN
        UPDATE `TtsTemplates` SET `isDefault` = 0 WHERE `id` != NEW.id;
    END IF;
END$$

CREATE TRIGGER `before_tts_template_insert` 
BEFORE INSERT ON `TtsTemplates` 
FOR EACH ROW
BEGIN
    IF NEW.isDefault = 1 THEN
        UPDATE `TtsTemplates` SET `isDefault` = 0;
    END IF;
END$$
DELIMITER ;

-- 查看创建的表结构
DESCRIBE `TtsTemplates`;

-- 查看插入的数据
SELECT * FROM `TtsTemplates` ORDER BY `sortOrder` ASC;

-- 2. 查看更新后的表结构
DESCRIBE Devices;

-- 3. 为现有设备设置默认值（可选）
UPDATE `Devices` 
SET `apiEnabled` = 0, 
    `apiCallCount` = 0 
WHERE `apiEnabled` IS NULL;

-- 4. 查看更新结果
SELECT id, name, devId, apiUrl, apiToken, apiEnabled, lastApiCallTime, apiCallCount 
FROM Devices;
-- 10. 查看插入的数据
SELECT '设备数据:' as '数据类型';
SELECT * FROM Devices;

SELECT 'SIM卡数据:' as '数据类型';
SELECT s.*, d.name as device_name 
FROM SimCards s 
LEFT JOIN Devices d ON s.deviceId = d.id;