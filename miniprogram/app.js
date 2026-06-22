App({
  globalData: {
    baseUrl: 'https://your-domain.com/api/v1',
    token: '',
    userInfo: null
  },

  onLaunch() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
    }
    this.checkLogin();
  },

  checkLogin() {
    if (!this.globalData.token) {
      return;
    }
    wx.request({
      url: `${this.globalData.baseUrl}/auth/profile`,
      header: { 'Authorization': `Bearer ${this.globalData.token}` },
      success: (res) => {
        if (res.data.code === 0) {
          this.globalData.userInfo = res.data.data;
        } else {
          this.logout();
        }
      },
      fail: () => {
        this.logout();
      }
    });
  },

  login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            wx.request({
              url: `${this.globalData.baseUrl}/auth/login`,
              method: 'POST',
              data: { code: res.code },
              success: (resp) => {
                if (resp.data.code === 0) {
                  this.globalData.token = resp.data.data.token;
                  this.globalData.userInfo = resp.data.data.user;
                  wx.setStorageSync('token', resp.data.data.token);
                  resolve(resp.data.data);
                } else {
                  reject(new Error(resp.data.message));
                }
              },
              fail: (err) => reject(err)
            });
          } else {
            reject(new Error('微信登录失败'));
          }
        },
        fail: (err) => reject(err)
      });
    });
  },

  logout() {
    this.globalData.token = '';
    this.globalData.userInfo = null;
    wx.removeStorageSync('token');
  },

  request(options) {
    return new Promise((resolve, reject) => {
      const header = {
        'Content-Type': 'application/json',
        ...options.header
      };

      if (this.globalData.token) {
        header['Authorization'] = `Bearer ${this.globalData.token}`;
      }

      wx.request({
        url: `${this.globalData.baseUrl}${options.url}`,
        method: options.method || 'GET',
        data: options.data,
        header,
        success: (res) => {
          if (res.data.code === 0) {
            resolve(res.data.data);
          } else if (res.data.code >= 1000 && res.data.code < 2000) {
            this.login().then(() => {
              this.request(options).then(resolve).catch(reject);
            }).catch(() => {
              wx.navigateTo({ url: '/pages/index/index' });
              reject(res.data);
            });
          } else {
            wx.showToast({ title: res.data.message, icon: 'none' });
            reject(res.data);
          }
        },
        fail: (err) => {
          wx.showToast({ title: '网络错误', icon: 'none' });
          reject(err);
        }
      });
    });
  }
});