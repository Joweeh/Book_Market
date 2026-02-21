const FEEDBACK_KEY = 'bm_feedback_list_v1';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatTime(date) {
  const d = date instanceof Date ? date : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

function readHistory() {
  const raw = wx.getStorageSync(FEEDBACK_KEY);
  const list = toArray(raw);
  return list
    .map((item) => ({
      id: String(item?.id || ''),
      content: String(item?.content || ''),
      images: toArray(item?.images),
      location: item?.location || null,
      locationText: String(item?.locationText || ''),
      status: String(item?.status || '已提交'),
      time: String(item?.time || ''),
    }))
    .filter((item) => item.id && item.content);
}

function writeHistory(list) {
  wx.setStorageSync(FEEDBACK_KEY, list);
}

function isAuthDenied(err) {
  const msg = String(err?.errMsg || err?.message || '');
  return /auth deny|authorize:fail|scope/.test(msg);
}

function openSetting() {
  wx.openSetting({});
}

Page({
  data: {
    content: '',
    images: [],
    location: null,
    locationText: '未选择位置',
    submitting: false,
    history: [],
  },

  onShow() {
    this.setData({ history: readHistory() });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value || '' });
  },

  onPreviewImage(e) {
    const src = e.currentTarget.dataset.src;
    if (!src) return;
    wx.previewImage({ urls: this.data.images, current: src });
  },

  onRemoveImage(e) {
    const src = e.currentTarget.dataset.src;
    if (!src) return;
    this.setData({ images: this.data.images.filter((item) => item !== src) });
  },

  async onTakePhoto() {
    await this.chooseImages({ sourceType: ['camera'] });
  },

  async onChooseImages() {
    await this.chooseImages({ sourceType: ['album'] });
  },

  async chooseImages({ sourceType }) {
    try {
      const remain = Math.max(0, 6 - this.data.images.length);
      if (remain <= 0) return;
      const res = await wx.chooseMedia({
        count: remain,
        mediaType: ['image'],
        sourceType,
        sizeType: ['compressed'],
      });
      const files = toArray(res?.tempFiles).map((item) => item?.tempFilePath).filter(Boolean);
      if (files.length === 0) return;
      this.setData({ images: this.data.images.concat(files).slice(0, 6) });
    } catch (err) {
      if (isAuthDenied(err)) {
        wx.showModal({
          title: '需要授权',
          content: '请在设置里允许访问相机或相册后重试。',
          confirmText: '去设置',
          success: (r) => r.confirm && openSetting(),
        });
        return;
      }
      wx.showToast({ title: '选择图片失败', icon: 'none' });
    }
  },

  async onChooseLocation() {
    try {
      // Use on-demand permission: only request when user taps "choose location".
      await wx.authorize({ scope: 'scope.userLocation' }).catch(() => null);
      const res = await wx.chooseLocation({});
      if (!res) return;
      const locationText = res.name ? `${res.name}（${res.address || ''}）` : res.address || '已选择位置';
      this.setData({
        location: { latitude: res.latitude, longitude: res.longitude, name: res.name || '', address: res.address || '' },
        locationText,
      });
    } catch (err) {
      if (isAuthDenied(err)) {
        wx.showModal({
          title: '需要定位权限',
          content: '请在设置里允许定位权限后再选择位置。',
          confirmText: '去设置',
          success: (r) => r.confirm && openSetting(),
        });
        return;
      }
      wx.showToast({ title: '选择位置失败', icon: 'none' });
    }
  },

  onClearLocation() {
    this.setData({ location: null, locationText: '未选择位置' });
  },

  async onSubmit() {
    const content = this.data.content.trim();
    if (!content) {
      wx.showToast({ title: '请先填写反馈内容', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const now = new Date();
      const record = {
        id: `fb_${now.getTime()}`,
        content,
        images: this.data.images,
        location: this.data.location,
        locationText: this.data.locationText === '未选择位置' ? '' : this.data.locationText,
        status: '已提交',
        time: formatTime(now),
      };

      const history = readHistory();
      writeHistory([record].concat(history).slice(0, 50));

      this.setData({
        content: '',
        images: [],
        location: null,
        locationText: '未选择位置',
        history: readHistory(),
        submitting: false,
      });
      wx.showToast({ title: '已提交', icon: 'success' });
    } catch (_err) {
      this.setData({ submitting: false });
      wx.showToast({ title: '提交失败', icon: 'none' });
    }
  },
});

