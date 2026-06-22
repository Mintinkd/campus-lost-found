const app = getApp();

Page({
  data: {
    searchText: '',
    results: [],
    loading: false,
    searched: false,
    dimensions: null,
    history: []
  },

  onLoad() {
    this.loadHistory();
  },

  onSearchInput(e) {
    this.setData({ searchText: e.detail.value });
  },

  async doSearch() {
    const { searchText } = this.data;
    if (!searchText.trim()) {
      wx.showToast({ title: '请输入失物描述', icon: 'none' });
      return;
    }

    this.setData({ loading: true, searched: true });
    try {
      const result = await app.request({
        url: '/search',
        method: 'POST',
        data: { searchText: searchText.trim() }
      });

      this.setData({
        results: result.results,
        dimensions: result.dimensions,
        loading: false
      });

      this.loadHistory();
    } catch (err) {
      this.setData({ loading: false });
    }
  },

  async loadHistory() {
    try {
      const data = await app.request({
        url: '/search/history?pageSize=10'
      });
      this.setData({ history: data.list || [] });
    } catch (err) {
      console.error('加载搜索历史失败:', err);
    }
  },

  onTapHistory(e) {
    const text = e.currentTarget.dataset.text;
    this.setData({ searchText: text });
    this.doSearch();
  },

  onTapResult(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  clearSearch() {
    this.setData({ searchText: '', results: [], searched: false, dimensions: null });
  }
});