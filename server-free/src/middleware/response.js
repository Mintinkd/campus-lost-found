// server-free/src/middleware/response.js

module.exports = function (req, res, next) {
  // 挂载成功响应方法
  res.success = function (data, message = '操作成功') {
    res.json({ code: 0, message, data });
  };

  // 挂载错误响应方法
  res.error = function (code, message = '操作失败') {
    res.status(code >= 1000 && code < 2000 ? 401 : 400).json({
      code, message, data: null
    });
  };

  next();  // 必须调用 next()，否则请求会卡住
};