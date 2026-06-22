const app = getApp();

Page({
  data: {
    userInfo: null,
    myItems: [],
    myClaims: [],
    receivedClaims: [],
    notifications: [],
    activeTab: 'items'
  },

  onShow() {
    if (!app.globalData.token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    this.setData({ userInfo: app.globalData.userInfo });
    this.loadMyItems();
  },

  async loadMyItems() {
    try {
      const data = await app.request({ url: '/items/mine?pageSize=50' });
      this.setData({ myItems: data.list });
    } catch (err) {
      console.error('加载我的物品失败:', err);
    }
  },

  async loadMyClaims() {
    try {
      const data = await app.request({ url: '/claims?type=my_claims&pageSize=50' });
      this.setData({ myClaims: data.list });
    } catch (err) {
      console.error('加载我的认领失败:', err);
    }
  },

  async loadReceivedClaims() {
    try {
      const data = await app.request({ url: '/claims?type=received_claims&pageSize=50' });
      this.setData({ receivedClaims: data.list });
    } catch (err) {
      console.error('加载收到的认领失败:', err);
    }
  },

  async loadNotifications() {
    try {
      const data = await app.request({ url: '/notifications?pageSize=50' });
      this.setData({ notifications: data.list });
    } catch (err) {
      console.error('加载通知失败:', err);
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });

    switch (tab) {
      case 'items': this.loadMyItems(); break;
      case 'myClaims': this.loadMyClaims(); break;
      case 'receivedClaims': this.loadReceivedClaims(); break;
      case 'notifications': this.loadNotifications(); break;
    }
  },

  onTapItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  onTapClaim(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/claim/claim?id=${id}` });
  },

  async getPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') return;

    try {
      await app.request({
        url: '/auth/profile',
        method: 'PUT',
        data: { phone: e.detail.code }
      });
      wx.showToast({ title: '手机号绑定成功', icon: 'success' });
    } catch (err) {
      console.error('绑定手机号失败:', err);
    }
  }
});