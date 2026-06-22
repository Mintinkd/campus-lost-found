const app = getApp();

Page({
  data: {
    photos: [],
    category: '',
    confidence: 0,
    needsConfirm: false,
    allTags: [],
    categories: [],
    description: '',
    location: '',
    foundTime: '',
    uploading: false,
    recognizing: false,
    recognitionResult: null
  },

  onLoad() {
    this.loadCategories();
    this.setData({
      foundTime: this.formatDateTime(new Date())
    });
  },

  async loadCategories() {
    try {
      const categories = await app.request({ url: '/items/categories' });
      this.setData({ categories });
    } catch (err) {
      console.error('加载分类失败:', err);
    }
  },

  choosePhoto() {
    const remaining = 5 - this.data.photos.length;
    if (remaining <= 0) {
      wx.showToast({ title: '最多上传5张照片', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newPhotos = res.tempFiles.map(f => f.tempFilePath);
        this.setData({
          photos: [...this.data.photos, ...newPhotos]
        });
        if (newPhotos.length > 0 && !this.data.category) {
          this.recognizeImage(newPhotos[0]);
        }
      }
    });
  },

  removePhoto(e) {
    const index = e.currentTarget.dataset.index;
    const photos = this.data.photos.filter((_, i) => i !== index);
    this.setData({ photos });
  },

  async recognizeImage(tempPath) {
    this.setData({ recognizing: true });
    try {
      const base64 = await this.imageToBase64(tempPath);
      const result = await app.request({
        url: '/ai/recognize',
        method: 'POST',
        data: { imageBase64: base64 }
      });

      if (result.isForbidden) {
        wx.showToast({ title: '违禁物品，禁止上报', icon: 'none' });
        this.setData({ recognizing: false });
        return;
      }

      this.setData({
        category: result.category || '',
        confidence: result.confidence || 0,
        needsConfirm: result.needsConfirm || false,
        allTags: result.allTags || [],
        recognitionResult: result,
        recognizing: false
      });

      if (result.needsConfirm) {
        wx.showToast({ title: 'AI识别不确定，请手动选择', icon: 'none' });
      }
    } catch (err) {
      this.setData({ recognizing: false });
      wx.showToast({ title: 'AI识别暂不可用，请手动选择', icon: 'none' });
    }
  },

  imageToBase64(tempPath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: tempPath,
        encoding: 'base64',
        success: (res) => resolve(res.data),
        fail: (err) => reject(err)
      });
    });
  },

  onCategoryChange(e) {
    this.setData({ category: this.data.categories[e.detail.value] });
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value });
  },

  onLocationInput(e) {
    this.setData({ location: e.detail.value });
  },

  onTimeChange(e) {
    this.setData({ foundTime: e.detail.value });
  },

  async submitItem() {
    const { photos, category, description, location, foundTime } = this.data;

    if (photos.length === 0) {
      wx.showToast({ title: '请上传至少一张照片', icon: 'none' });
      return;
    }
    if (!location.trim()) {
      wx.showToast({ title: '请填写拾到地点', icon: 'none' });
      return;
    }
    if (!foundTime) {
      wx.showToast({ title: '请选择拾到时间', icon: 'none' });
      return;
    }

    this.setData({ uploading: true });

    try {
      const uploadTasks = photos.map(p => this.uploadFile(p));
      const uploadedUrls = await Promise.all(uploadTasks);

      await app.request({
        url: '/items',
        method: 'POST',
        data: {
          category: category || '其他',
          description,
          location: location.trim(),
          foundTime,
          photos: uploadedUrls
        }
      });

      wx.showToast({ title: '上报成功！', icon: 'success' });
      setTimeout(() => {
        this.resetForm();
        wx.switchTab({ url: '/pages/index/index' });
      }, 1500);
    } catch (err) {
      this.setData({ uploading: false });
    }
  },

  uploadFile(tempPath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${app.globalData.baseUrl}/items`,
        filePath: tempPath,
        name: 'photos',
        header: {
          'Authorization': `Bearer ${app.globalData.token}`
        },
        success: (res) => {
          const data = JSON.parse(res.data);
          if (data.code === 0) resolve(data.data);
          else reject(new Error(data.message));
        },
        fail: (err) => reject(err)
      });
    });
  },

  resetForm() {
    this.setData({
      photos: [],
      category: '',
      confidence: 0,
      needsConfirm: false,
      description: '',
      location: '',
      foundTime: this.formatDateTime(new Date()),
      uploading: false,
      recognizing: false,
      recognitionResult: null
    });
  },

  formatDateTime(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
  }
});