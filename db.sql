-- =============================================
-- 完整的数据库创建和初始化脚本（最终版 / TIMESTAMP 兼容方案）
-- =============================================

-- 1. 创建数据库
/* CREATE DATABASE IF NOT EXISTS admin_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci; */

-- 2. 使用数据库
-- USE admin_system;

-- 3. （可选）删除旧表：如需重新创建，先取消以下注释
-- DROP TABLE IF EXISTS `SmsMessages`;
-- DROP TABLE IF EXISTS `SimCards`;
-- DROP TABLE IF EXISTS `Devices`;
-- DROP TABLE IF EXISTS `Articles`;

-- =============================================
-- 创建基础表
-- =============================================

-- 4. 创建文章表 (Articles)
CREATE TABLE IF NOT EXISTS `Articles` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `author` VARCHAR(255) NOT NULL,
  `status` ENUM('draft','published') DEFAULT 'draft',
  `tags` VARCHAR(255) DEFAULT NULL,
  `views` INT(11) DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章表';

-- 5. 创建设备表 (Devices)
CREATE TABLE IF NOT EXISTS `Devices` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `devId` VARCHAR(50) NOT NULL COMMENT '设备ID',
  `name` VARCHAR(100) DEFAULT '' COMMENT '设备名称',
  `status` ENUM('active', 'inactive', 'offline') DEFAULT 'active' COMMENT '设备状态',
  `description` TEXT COMMENT '设备描述',
  `lastActiveTime` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后活跃时间',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_devId` (`devId`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备表';

-- 6. 创建SIM卡表 (SimCards)
CREATE TABLE IF NOT EXISTS `SimCards` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `deviceId` INT(11) NOT NULL COMMENT '关联的设备ID',
  `slot` INT(11) NOT NULL COMMENT '卡槽位置（1或2）',
  `msIsdn` VARCHAR(20) DEFAULT NULL COMMENT '手机号码MSISDN',
  `imsi` VARCHAR(50) DEFAULT NULL COMMENT 'IMSI号',
  `iccId` VARCHAR(50) DEFAULT NULL COMMENT 'ICC ID',
  `scName` VARCHAR(100) DEFAULT '' COMMENT 'SIM卡名称/备注',
  `status` ENUM('202', '203', '204', '205', '209') DEFAULT '204' COMMENT 'SIM卡状态：202基站注册中，203ID已读取，204已就绪，205已弹出，209卡异常',
  `lastActiveTime` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后活跃时间',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_device_slot` (`deviceId`, `slot`),
  UNIQUE KEY `unique_msIsdn` (`msIsdn`),
  UNIQUE KEY `unique_imsi` (`imsi`),
  UNIQUE KEY `unique_iccId` (`iccId`),
  KEY `idx_status` (`status`),
  KEY `idx_deviceId` (`deviceId`),
  CONSTRAINT `fk_simcard_device`
    FOREIGN KEY (`deviceId`) REFERENCES `Devices` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SIM卡表';

-- 7. 创建短信消息表 (SmsMessages)
CREATE TABLE IF NOT EXISTS `SmsMessages` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `simCardId` INT(11) NOT NULL COMMENT '关联的SIM卡ID',
  `deviceId` INT(11) NOT NULL COMMENT '关联的设备ID',
  `netCh` INT(11) DEFAULT NULL COMMENT '网络通道号（0=wifi，1=卡槽一）',
  `msgTs` BIGINT(20) DEFAULT NULL COMMENT '消息时间戳',
  `phNum` VARCHAR(20) DEFAULT NULL COMMENT '发送方手机号',
  `smsBd` TEXT COMMENT '短信内容',
  `smsTs` BIGINT(20) DEFAULT NULL COMMENT '短信时间戳',
  `rawData` JSON DEFAULT NULL COMMENT '原始数据',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_simCardId` (`simCardId`),
  KEY `idx_deviceId` (`deviceId`),
  KEY `idx_phNum` (`phNum`),
  KEY `idx_createdAt` (`createdAt`),
  CONSTRAINT `fk_sms_simcard`
    FOREIGN KEY (`simCardId`) REFERENCES `SimCards` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sms_device`
    FOREIGN KEY (`deviceId`) REFERENCES `Devices` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='短信消息表';

-- =============================================
-- 插入初始化数据
-- =============================================

-- 8. 插入测试文章数据
INSERT INTO `Articles` (`title`, `content`, `author`, `status`, `tags`, `views`)
VALUES
('欢迎使用后台管理系统', '这是一个基于 Node.js + Koa2 + React + Ant Design 开发的后台管理系统。', '管理员', 'published', 'React,Node.js,Ant Design', 156),
('React 18 新特性介绍', 'React 18 带来了许多激动人心的新特性...', '张三', 'published', 'React,前端,技术', 89),
('Node.js 性能优化技巧', '在生产环境中优化 Node.js 应用性能的几个关键点...', '李四', 'published', 'Node.js,性能优化,后端', 234),
('Ant Design 5.0 升级指南', 'Ant Design 5.0 带来了全新的设计语言...', '王五', 'draft', 'Ant Design,UI,升级', 45),
('MySQL 索引优化实战', '数据库索引是提升查询性能的关键...', '赵六', 'published', 'MySQL,数据库,性能', 178);

-- 9. 插入实际设备数据
INSERT INTO `Devices` (`devId`, `name`, `status`, `description`)
VALUES ('1091a8443428', '第一个设备', 'active', '开发版第一个机器');

-- 10. 插入实际SIM卡数据（假设设备ID为 1）
INSERT INTO `SimCards` (`deviceId`, `slot`, `msIsdn`, `imsi`, `iccId`, `scName`, `status`)
VALUES
(1, 1, '+8617602816612', '460012810115581', '89860118802476524938', '联通保号卡', '204'),
(1, 2, '+85269760349', '454003063040863', '8985200014630408634F', '香港clubsim卡', '204');

-- =============================================
-- 查询验证
-- =============================================

-- 11. 查看所有表
SHOW TABLES;

-- 12. 验证表结构
DESCRIBE Devices;
DESCRIBE SimCards;
DESCRIBE SmsMessages;
DESCRIBE Articles;

-- 13. 查看数据统计
SELECT '设备' as 类型, COUNT(*) as 数量 FROM Devices
UNION ALL
SELECT 'SIM卡' as 类型, COUNT(*) as 数量 FROM SimCards
UNION ALL
SELECT '短信' as 类型, COUNT(*) as 数量 FROM SmsMessages
UNION ALL
SELECT '文章' as 类型, COUNT(*) as 数量 FROM Articles;

-- 14. 查看设备和SIM卡关联
SELECT 
  d.id as 设备ID,
  d.devId as 设备编号,
  d.name as 设备名称,
  d.status as 设备状态,
  s.slot as 卡槽,
  s.scName as SIM卡名称,
  s.msIsdn as 手机号,
  CASE s.status
    WHEN '202' THEN '基站注册中'
    WHEN '203' THEN 'ID已读取'
    WHEN '204' THEN '已就绪'
    WHEN '205' THEN '已弹出'
    WHEN '209' THEN '卡异常'
    ELSE s.status
  END as SIM卡状态
FROM Devices d
LEFT JOIN SimCards s ON d.id = s.deviceId
ORDER BY d.id, s.slot;

-- =============================================
-- 说明
-- =============================================
/*
1) 所有时间字段使用 TIMESTAMP，并且显式设置了：
   - createdAt: DEFAULT CURRENT_TIMESTAMP
   - updatedAt: DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   - lastActiveTime: 默认 CURRENT_TIMESTAMP（可为 NULL）

2) 若你的 MySQL < 5.6.5（极老版本）不支持多个 TIMESTAMP 同时默认 CURRENT_TIMESTAMP，
   可退化为保留 createdAt 默认值，updatedAt 改为触发器维护，或将 sql_mode 调整为非严格。
   但在 MySQL 5.7/8.0、MariaDB 10.2+ 下，本脚本即可直接运行。

3) JSON 类型需要 MySQL 5.7+；如果更老版本，请把 SmsMessages.rawData 改成 LONGTEXT。
*/
