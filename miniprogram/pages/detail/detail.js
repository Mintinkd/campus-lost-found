const app = getApp();

Page({
  data: {
    item: null,
    loading: true,
    isOwner: false,
    claims: [],
    showClaimModal: false,
    claimReason: ''
  },

  onLoad(options) {
    this.itemId = options.id;
    this.loadItem();
  },

  async loadItem() {
    this.setData({ loading: true });
    try {
      const item = await app.request({
        url: `/items/${this.itemId}`
      });

      const isOwner = item.finderId === app.globalData.userInfo?.id;

      this.setData({
        item,
        isOwner,
        claims: item.claims || [],
        loading: false
      });
    } catch (err) {
      this.setData({ loading: false });
    }
  },

  showClaim() {
    this.setData({ showClaimModal: true });
  },

  hideClaim() {
    this.setData({ showClaimModal: false, claimReason: '' });
  },

  onClaimReasonInput(e) {
    this.setData({ claimReason: e.detail.value });
  },

  async submitClaim() {
    const { claimReason } = this.data;
    if (!claimReason.trim()) {
      wx.showToast({ title: '请填写认领说明', icon: 'none' });
      return;
    }

    try {
      await app.request({
        url: '/claims',
        method: 'POST',
        data: {
          itemId: this.itemId,
          claimReason: claimReason.trim()
        }
      });

      wx.showToast({ title: '认领申请已提交', icon: 'success' });
      this.hideClaim();
      this.loadItem();
    } catch (err) {
      console.error('认领失败:', err);
    }
  },

  async confirmClaim(e) {
    const claimId = e.currentTarget.dataset.id;
    try {
      await app.request({
        url: `/claims/${claimId}/confirm`,
        method: 'PUT'
      });
      wx.showToast({ title: '已确认认领', icon: 'success' });
      this.loadItem();
    } catch (err) {
      console.error('确认失败:', err);
    }
  },

  async rejectClaim(e) {
    const claimId = e.currentTarget.dataset.id;
    try {
      await app.request({
        url: `/claims/${claimId}/reject`,
        method: 'PUT'
      });
      wx.showToast({ title: '已拒绝认领', icon: 'success' });
      this.loadItem();
    } catch (err) {
      console.error('拒绝失败:', err);
    }
  },

  async confirmReturn(e) {
    const claimId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认归还',
      content: '确认物品已归还给失主？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await app.request({
              url: `/claims/${claimId}/return`,
              method: 'PUT'
            });
            wx.showToast({ title: '归还确认完成', icon: 'success' });
            this.loadItem();
          } catch (err) {
            console.error('归还确认失败:', err);
          }
        }
      }
    });
  },

  previewPhoto(e) {
    const current = e.currentTarget.dataset.src;
    wx.previewImage({
      current,
      urls: this.data.item.photos
    });
  }
});