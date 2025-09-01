const Article = require('../models/article');

// 获取文章列表
const getArticles = async (ctx) => {
  const { page = 1, pageSize = 10, status, search } = ctx.query;
  
  const where = {};
  if (status) where.status = status;
  if (search) {
    const { Op } = require('sequelize');
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { content: { [Op.like]: `%${search}%` } }
    ];
  }
  
  const { rows, count } = await Article.findAndCountAll({
    where,
    limit: parseInt(pageSize),
    offset: (parseInt(page) - 1) * parseInt(pageSize),
    order: [['createdAt', 'DESC']]
  });
  
  ctx.body = {
    success: true,
    data: rows,
    total: count,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  };
};

// 获取单个文章
const getArticle = async (ctx) => {
  const { id } = ctx.params;
  const article = await Article.findByPk(id);
  
  if (!article) {
    ctx.status = 404;
    ctx.body = { success: false, message: '文章不存在' };
    return;
  }
  
  ctx.body = { success: true, data: article };
};

// 创建文章
const createArticle = async (ctx) => {
  const { title, content, author, status, tags } = ctx.request.body;
  
  const article = await Article.create({
    title,
    content,
    author,
    status,
    tags
  });
  
  ctx.body = { success: true, data: article };
};

// 更新文章
const updateArticle = async (ctx) => {
  const { id } = ctx.params;
  const { title, content, author, status, tags } = ctx.request.body;
  
  const article = await Article.findByPk(id);
  
  if (!article) {
    ctx.status = 404;
    ctx.body = { success: false, message: '文章不存在' };
    return;
  }
  
  await article.update({
    title,
    content,
    author,
    status,
    tags
  });
  
  ctx.body = { success: true, data: article };
};

// 删除文章
const deleteArticle = async (ctx) => {
  const { id } = ctx.params;
  
  const article = await Article.findByPk(id);
  
  if (!article) {
    ctx.status = 404;
    ctx.body = { success: false, message: '文章不存在' };
    return;
  }
  
  await article.destroy();
  
  ctx.body = { success: true, message: '删除成功' };
};

module.exports = {
  getArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle
};