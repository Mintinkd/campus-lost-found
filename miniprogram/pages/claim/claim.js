const app = getApp();

Page({
  data: {
    claim: null,
    contact: null,
    loading: true
  },

  onLoad(options) {
    this.claimId = options.id;
    this.loadClaim();
  },

  async loadClaim() {
    this.setData({ loading: true });
    try {
      const data = await app.request({ url: `/claims?type=my_claims&pageSize=100` });
      const claim = data.list.find(c => c.id === this.claimId);
      this.setData({ claim, loading: false });
    } catch (err) {
      this.setData({ loading: false });
    }
  },

  async loadContact() {
    try {
      const contact = await app.request({
        url: `/claims/${this.claimId}/contact`
      });
      this.setData({ contact });
    } catch (err) {
      wx.showToast({ title: '获取联系方式失败', icon: 'none' });
    }
  },

  async confirmClaim() {
    try {
      await app.request({
        url: `/claims/${this.claimId}/confirm`,
        method: 'PUT'
      });
      wx.showToast({ title: '已确认认领', icon: 'success' });
      this.loadClaim();
    } catch (err) {
      console.error('确认失败:', err);
    }
  },

  async rejectClaim() {
    try {
      await app.request({
        url: `/claims/${this.claimId}/reject`,
        method: 'PUT'
      });
      wx.showToast({ title: '已拒绝认领', icon: 'success' });
      this.loadClaim();
    } catch (err) {
      console.error('拒绝失败:', err);
    }
  },

  async confirmReturn() {
    wx.showModal({
      title: '确认归还',
      content: '确认物品已归还给失主？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await app.request({
              url: `/claims/${this.claimId}/return`,
              method: 'PUT'
            });
            wx.showToast({ title: '归还确认完成', icon: 'success' });
            this.loadClaim();
          } catch (err) {
            console.error('归还确认失败:', err);
          }
        }
      }
    });
  }
});