// server-free/src/middleware/response.js

module.exports = function (req, res, next) {
  res.success = function (data, message = '操作成功') {
    res.json({ code: 0, message, data });
  };

  res.error = function (code, message = '操作失败') {
    let httpStatus = 400;
    if (code === 1001 || code === 1002) httpStatus = 401;
    if (code >= 5000) httpStatus = 500;
    res.status(httpStatus).json({ code, message, data: null });
  };

  next();
};