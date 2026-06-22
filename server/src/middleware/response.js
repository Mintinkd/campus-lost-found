exports.success = function (data, message = '操作成功') {
  this.json({ code: 0, message, data });
};

exports.error = function (code, message = '操作失败') {
  this.status(code >= 1000 && code < 2000 ? 401 : 400).json({
    code,
    message,
    data: null
  });
};