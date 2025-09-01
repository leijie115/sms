const jwt = require('jsonwebtoken');

const login = async (ctx) => {
  const { username, password } = ctx.request.body;
  
  if (username === process.env.ADMIN_USERNAME && 
      password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign(
      { username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    ctx.body = {
      success: true,
      token,
      user: { username }
    };
  } else {
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: '用户名或密码错误'
    };
  }
};

const checkAuth = async (ctx) => {
  ctx.body = {
    success: true,
    user: ctx.state.user
  };
};

module.exports = { login, checkAuth };