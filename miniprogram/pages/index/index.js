const app = getApp();

Page({
  data: {
    recentItems: [],
    loading: true,
    stats: { total: 0, pending: 0, returned: 0 }
  },

  onLoad() {
    this.ensureLogin();
  },

  onShow() {
    if (app.globalData.token) {
      this.loadRecentItems();
    }
  },

  onPullDownRefresh() {
    this.loadRecentItems().then(() => wx.stopPullDownRefresh());
  },

  async ensureLogin() {
    if (!app.globalData.token) {
      try {
        await app.login();
        this.loadRecentItems();
      } catch (err) {
        this.setData({ loading: false });
      }
    }
  },

  async loadRecentItems() {
    this.setData({ loading: true });
    try {
      const data = await app.request({
        url: '/items?pageSize=10&status=pending'
      });
      this.setData({
        recentItems: data.list,
        stats: { total: data.total },
        loading: false
      });
    } catch (err) {
      this.setData({ loading: false });
    }
  },

  onTapItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  onTapSearch() {
    wx.switchTab({ url: '/pages/search/search' });
  },

  onTapUpload() {
    wx.switchTab({ url: '/pages/upload/upload' });
  }
});