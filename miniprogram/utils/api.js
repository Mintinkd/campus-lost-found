module.exports = {
  baseUrl: 'https://your-domain.com/api/v1',

  request(options) {
    return new Promise((resolve, reject) => {
      const app = getApp();
      const header = { 'Content-Type': 'application/json' };
      if (app.globalData.token) {
        header['Authorization'] = `Bearer ${app.globalData.token}`;
      }

      wx.request({
        url: `${this.baseUrl}${options.url}`,
        method: options.method || 'GET',
        data: options.data,
        header,
        success: (res) => {
          if (res.data.code === 0) resolve(res.data.data);
          else reject(res.data);
        },
        fail: (err) => reject(err)
      });
    });
  },

  formatTime(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
  },

  getStatusText(status) {
    const map = {
      pending: '待认领',
      claiming: '认领中',
      returned: '已归还',
      expired: '已过期'
    };
    return map[status] || status;
  },

  getClaimStatusText(status) {
    const map = {
      pending: '待确认',
      confirmed: '已确认',
      returning: '归还中',
      completed: '已完成',
      rejected: '已拒绝',
      expired: '已超时'
    };
    return map[status] || status;
  }
};