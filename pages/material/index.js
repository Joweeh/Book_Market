const CATEGORY_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'note', label: '课堂笔记' },
  { id: 'exam', label: '历年真题' },
  { id: 'slide', label: '课件' },
  { id: 'lab', label: '实验报告' },
];

const MATERIALS = [
  {
    id: 'm1',
    type: 'note',
    title: '微积分上册笔记（同济版）',
    course: '微积分',
    school: '浙江大学',
    summary: '章节重点整理 + 典型题型',
    hot: 96,
  },
  {
    id: 'm2',
    type: 'exam',
    title: '线性代数近三年期末题',
    course: '线性代数',
    school: '北京大学',
    summary: '含答案与评分点说明',
    hot: 92,
  },
  {
    id: 'm3',
    type: 'slide',
    title: '概率论课程课件合集',
    course: '概率论',
    school: '复旦大学',
    summary: '覆盖贝叶斯、分布、参数估计',
    hot: 87,
  },
  {
    id: 'm4',
    type: 'lab',
    title: 'C语言实验报告模板与示例',
    course: 'C语言',
    school: '上海交通大学',
    summary: '基础语法、数组、链表实验模板',
    hot: 84,
  },
  {
    id: 'm5',
    type: 'note',
    title: '马原重点问答速记卡',
    course: '马原',
    school: '清华大学',
    summary: '考试高频简答题整理',
    hot: 88,
  },
];

Page({
  data: {
    categories: CATEGORY_OPTIONS,
    activeCategory: 'all',
    keyword: '',
    source: MATERIALS,
    materials: MATERIALS,
  },

  onShow() {
    this.syncTabBar();
  },

  syncTabBar() {
    const tab = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tab && typeof tab.setData === 'function') tab.setData({ active: 1 });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value || '' });
    this.applyFilters();
  },

  onSearchConfirm() {
    this.applyFilters();
  },

  onTapCategory(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.id || 'all' });
    this.applyFilters();
  },

  applyFilters() {
    const keyword = String(this.data.keyword || '').trim().toLowerCase();
    const category = this.data.activeCategory;

    const materials = this.data.source.filter((item) => {
      if (category !== 'all' && item.type !== category) return false;
      if (!keyword) return true;
      const text = `${item.title} ${item.course} ${item.school} ${item.summary}`.toLowerCase();
      return text.includes(keyword);
    });

    this.setData({ materials });
  },

  onTapUpload() {
    wx.navigateTo({ url: '/pages/books/sell/index' });
  },

  onTapItem(e) {
    const { id } = e.currentTarget.dataset;
    const material = this.data.materials.find((item) => item.id === id);
    if (!material) return;
    wx.showToast({ title: `已打开: ${material.title}`, icon: 'none' });
  },

  onTapMessage() {
    wx.showToast({ title: '资料消息中心将在下一批接入', icon: 'none' });
  },

  onSwitchBooks() {
    wx.switchTab({ url: '/pages/books/index' });
  },
});
