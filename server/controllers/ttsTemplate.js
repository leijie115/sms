// server/controllers/ttsTemplate.js
const TtsTemplate = require('../models/ttsTemplate');
const { Op } = require('sequelize');

/**
 * 获取所有TTS模板
 */
const getTtsTemplates = async (ctx) => {
  try {
    const { isActive = true } = ctx.query;
    
    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    const templates = await TtsTemplate.findAll({
      where,
      order: [
        ['isDefault', 'DESC'],
        ['sortOrder', 'ASC'],
        ['id', 'ASC']
      ]
    });
    
    ctx.body = {
      success: true,
      data: templates
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取TTS模板失败',
      error: error.message
    };
  }
};

/**
 * 创建TTS模板
 */
const createTtsTemplate = async (ctx) => {
  try {
    const { name, content, isDefault = false, sortOrder = 0, isActive = true } = ctx.request.body;
    
    if (!name || !content) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '模板名称和内容不能为空'
      };
      return;
    }
    
    // 如果设置为默认，先取消其他默认模板
    if (isDefault) {
      await TtsTemplate.update(
        { isDefault: false },
        { where: { isDefault: true } }
      );
    }
    
    const template = await TtsTemplate.create({
      name,
      content,
      isDefault,
      sortOrder,
      isActive
    });
    
    ctx.body = {
      success: true,
      data: template,
      message: '创建成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建TTS模板失败',
      error: error.message
    };
  }
};

/**
 * 更新TTS模板
 */
const updateTtsTemplate = async (ctx) => {
  try {
    const { id } = ctx.params;
    const { name, content, isDefault, sortOrder, isActive } = ctx.request.body;
    
    const template = await TtsTemplate.findByPk(id);
    if (!template) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '模板不存在'
      };
      return;
    }
    
    // 如果设置为默认，先取消其他默认模板
    if (isDefault && !template.isDefault) {
      await TtsTemplate.update(
        { isDefault: false },
        { where: { isDefault: true } }
      );
    }
    
    await template.update({
      name: name !== undefined ? name : template.name,
      content: content !== undefined ? content : template.content,
      isDefault: isDefault !== undefined ? isDefault : template.isDefault,
      sortOrder: sortOrder !== undefined ? sortOrder : template.sortOrder,
      isActive: isActive !== undefined ? isActive : template.isActive
    });
    
    ctx.body = {
      success: true,
      data: template,
      message: '更新成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新TTS模板失败',
      error: error.message
    };
  }
};

/**
 * 删除TTS模板
 */
const deleteTtsTemplate = async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const template = await TtsTemplate.findByPk(id);
    if (!template) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '模板不存在'
      };
      return;
    }
    
    await template.destroy();
    
    ctx.body = {
      success: true,
      message: '删除成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除TTS模板失败',
      error: error.message
    };
  }
};

/**
 * 设置默认模板
 */
const setDefaultTemplate = async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const template = await TtsTemplate.findByPk(id);
    if (!template) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '模板不存在'
      };
      return;
    }
    
    // 取消其他默认模板
    await TtsTemplate.update(
      { isDefault: false },
      { where: { isDefault: true } }
    );
    
    // 设置当前模板为默认
    await template.update({ isDefault: true });
    
    ctx.body = {
      success: true,
      data: template,
      message: '设置默认模板成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '设置默认模板失败',
      error: error.message
    };
  }
};

module.exports = {
  getTtsTemplates,
  createTtsTemplate,
  updateTtsTemplate,
  deleteTtsTemplate,
  setDefaultTemplate
};