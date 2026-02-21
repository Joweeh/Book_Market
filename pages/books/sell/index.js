import {
  createSellRequest,
  getErrorMessage,
  getMySellRequests,
  uploadSellImage,
} from '../../../services/books';

const COURSE_OPTIONS = ['微积分', '线性代数', '概率论', 'C语言', '马原'];

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

Page({
  data: {
    form: {
      title: '',
      course: COURSE_OPTIONS[0],
      expectedPrice: '',
      conditionNote: '',
    },
    courseOptions: COURSE_OPTIONS,
    courseIndex: 0,
    images: [],
    submitting: false,
    loadingList: false,
    records: [],
  },

  onShow() {
    this.loadRecords();
  },

  onTitleInput(e) {
    this.setData({ 'form.title': e.detail.value || '' });
  },

  onPriceInput(e) {
    this.setData({ 'form.expectedPrice': e.detail.value || '' });
  },

  onConditionInput(e) {
    this.setData({ 'form.conditionNote': e.detail.value || '' });
  },

  onCourseChange(e) {
    const index = Number(e.detail.value || 0);
    this.setData({
      courseIndex: index,
      'form.course': this.data.courseOptions[index],
    });
  },

  onChooseImages() {
    const remain = 6 - this.data.images.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 6 张图片', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const picked = (res.tempFiles || []).map((file) => ({
          localPath: file.tempFilePath,
          url: '',
        }));
        this.setData({ images: [...this.data.images, ...picked] });
      },
      fail: () => {
        wx.showToast({ title: '选图失败', icon: 'none' });
      },
    });
  },

  onRemoveImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    const next = this.data.images.slice();
    next.splice(index, 1);
    this.setData({ images: next });
  },

  async ensureUpload() {
    const uploaded = [];
    for (let i = 0; i < this.data.images.length; i += 1) {
      const current = this.data.images[i];
      if (current.url) {
        uploaded.push(current.url);
        continue;
      }

      const payload = await uploadSellImage(current.localPath);
      const url = payload?.url || payload?.path || payload?.data?.url || payload?.data?.path;
      if (!url) {
        throw new Error('上传结果缺少 URL');
      }

      uploaded.push(url);
      this.setData({ [`images[${i}].url`]: url });
    }
    return uploaded;
  },

  async onSubmit() {
    const title = String(this.data.form.title || '').trim();
    const expectedPrice = Number(this.data.form.expectedPrice || 0);
    const conditionNote = String(this.data.form.conditionNote || '').trim();
    const course = this.data.form.course;

    if (!title) {
      wx.showToast({ title: '请输入书名', icon: 'none' });
      return;
    }
    if (expectedPrice <= 0) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' });
      return;
    }
    if (this.data.images.length === 0) {
      wx.showToast({ title: '请至少上传 1 张图片', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const imageUrls = await this.ensureUpload();
      await createSellRequest({
        title,
        course,
        expectedPrice,
        conditionNote,
        images: imageUrls,
        imageUrls,
      });

      this.setData({
        submitting: false,
        form: {
          title: '',
          course: COURSE_OPTIONS[0],
          expectedPrice: '',
          conditionNote: '',
        },
        courseIndex: 0,
        images: [],
      });

      wx.showToast({ title: '提交成功，等待审核', icon: 'success' });
      this.loadRecords();
    } catch (error) {
      this.setData({ submitting: false });
      wx.showToast({ title: getErrorMessage(error, '提交失败'), icon: 'none' });
    }
  },

  async loadRecords() {
    this.setData({ loadingList: true });
    try {
      const payload = await getMySellRequests();
      this.setData({ records: normalizeList(payload), loadingList: false });
    } catch (_error) {
      this.setData({ loadingList: false });
    }
  },
});
