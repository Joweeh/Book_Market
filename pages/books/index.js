import { getBooks, getErrorMessage, getStoredUser, login } from '../../services/books';

const CATEGORY_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'calculus', label: '微积分' },
  { id: 'linear', label: '线性代数' },
  { id: 'probability', label: '概率论' },
  { id: 'c', label: 'C语言' },
  { id: 'marx', label: '马原' },
];

const BANNERS = [
  {
    id: 'b1',
    title: '新学期教材专区',
    subtitle: '同校同学年优先推荐二手教材',
    image: 'https://picsum.photos/seed/campus-book-1/1200/420',
  },
  {
    id: 'b3',
    title: '审核后上架更安心',
    subtitle: '支持成色评级与价格调整',
    image: 'https://picsum.photos/seed/campus-book-3/1200/420',
  },
];

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function hashScore(seed) {
  const str = String(seed || 'seed');
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

function inferCategory(book) {
  const tags = toArray(book.tags).join(' ');
  const text = `${book.title || ''} ${book.author || ''} ${book.course || ''} ${tags}`;
  if (/微积分|高等数学/.test(text)) return 'calculus';
  if (/线性代数/.test(text)) return 'linear';
  if (/概率|统计/.test(text)) return 'probability';
  if (/c语言|程序设计|编程/.test(text.toLowerCase())) return 'c';
  if (/马原|马克思/.test(text)) return 'marx';
  return 'all';
}

function normalizeBook(book) {
  return {
    ...book,
    tags: toArray(book.tags),
    category: inferCategory(book),
  };
}

function scoreBook(book, context) {
  const tagsText = toArray(book.tags).join(' ');
  const text = `${book.title || ''} ${book.author || ''} ${book.course || ''} ${tagsText}`;

  const courseMatched = context.courses.some((course) => text.includes(course));
  const majorMatched = context.major ? text.includes(context.major) : false;
  const schoolHeat = context.university
    ? hashScore(`${context.university}-${book.id || book.title}`)
    : 0.5 + hashScore(book.id || book.title) * 0.5;
  const behavior = Math.min((context.behavior[book.id] || 0) / 8, 1);

  const score =
    (courseMatched ? 0.4 : 0) +
    (majorMatched ? 0.3 : 0) +
    schoolHeat * 0.2 +
    behavior * 0.1;

  const reasons = [];
  if (courseMatched) reasons.push('课程匹配');
  if (majorMatched) reasons.push('专业相关');
  if (context.university && schoolHeat > 0.52) reasons.push('同校热门');
  if (reasons.length === 0) reasons.push('平台热门');

  return {
    ...book,
    score,
    reasons,
    schoolHeat,
    behavior,
  };
}

Page({
  data: {
    banners: BANNERS,
    categories: CATEGORY_OPTIONS,
    activeCategory: 'all',
    keyword: '',

    allBooks: [],
    books: [],
    recommendBooks: [],
    hotBooks: [],

    loading: true,
    authLoading: false,
    error: '',

    user: null,
    userText: '未登录',
    recommendationTitle: '智能推荐',
    recommendationSubtitle: '完善学校和课表后可提升匹配准确度',
  },

  onLoad() {
    this.loadBooks();
  },

  onShow() {
    this.syncTabBar();
    const user = getStoredUser();
    this.setData({ user, userText: this.buildUserText(user) });
    if (this.data.allBooks.length > 0) {
      this.rebuildRecommendations();
      this.applyFilters();
    }
  },

  syncTabBar() {
    const tab = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tab && typeof tab.setData === 'function') tab.setData({ active: 0 });
  },

  onPullDownRefresh() {
    this.loadBooks().finally(() => wx.stopPullDownRefresh());
  },

  buildUserText(user) {
    if (!user) return '未登录，当前展示平台热门推荐';
    const school = user.university || '未设置高校';
    const year = user.schoolYear || '未设置学年';
    return `${user.nick || '同学'} · ${school} · ${year}`;
  },

  getContext() {
    const user = getStoredUser() || {};
    const courses = toArray(wx.getStorageSync('bm_courses'))
      .map((item) => String(item).trim())
      .filter(Boolean);
    const behavior = wx.getStorageSync('bm_behavior') || {};
    const major = String(user.major || wx.getStorageSync('bm_major') || '').trim();

    return {
      user,
      university: String(user.university || '').trim(),
      courses,
      major,
      behavior: typeof behavior === 'object' && behavior ? behavior : {},
    };
  },

  detectMode(context) {
    if (context.courses.length > 0 && context.university) return 'course';
    if (context.university) return 'school';
    return 'global';
  },

  buildModeText(mode) {
    if (mode === 'course') {
      return {
        title: '智能推荐（课表模式）',
        subtitle: '权重: 课程0.4 + 专业0.3 + 同校热度0.2 + 行为0.1',
      };
    }
    if (mode === 'school') {
      return {
        title: '智能推荐（同校模式）',
        subtitle: '已根据你的高校偏好生成推荐',
      };
    }
    return {
      title: '智能推荐（平台模式）',
      subtitle: '完善个人信息后可获取更精准推荐',
    };
  },

  rebuildRecommendations() {
    const context = this.getContext();
    const mode = this.detectMode(context);
    const scored = this.data.allBooks.map((book) => scoreBook(book, context));

    const recommendBooks = scored.slice().sort((a, b) => b.score - a.score).slice(0, 4);
    const hotBooks = scored
      .slice()
      .sort((a, b) => b.schoolHeat + b.behavior - (a.schoolHeat + a.behavior))
      .slice(0, 6);

    const modeText = this.buildModeText(mode);
    this.setData({
      recommendBooks,
      hotBooks,
      recommendationTitle: modeText.title,
      recommendationSubtitle: modeText.subtitle,
    });
  },

  applyFilters() {
    const keyword = this.data.keyword.trim().toLowerCase();
    const activeCategory = this.data.activeCategory;

    const books = this.data.allBooks.filter((book) => {
      if (activeCategory !== 'all' && book.category !== activeCategory) return false;
      if (!keyword) return true;
      const text = `${book.title || ''} ${book.author || ''} ${book.course || ''} ${toArray(book.tags).join(' ')}`;
      return text.toLowerCase().includes(keyword);
    });

    this.setData({ books });
  },

  async loadBooks() {
    this.setData({ loading: true, error: '' });
    try {
      const payload = await getBooks();
      const rows = toArray(payload).map(normalizeBook);
      this.setData({ allBooks: rows, loading: false });
      this.rebuildRecommendations();
      this.applyFilters();
    } catch (_error) {
      this.setData({
        loading: false,
        error: '加载图书失败，请稍后重试。',
      });
    }
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

  onTapMessage() {
    wx.showToast({ title: '消息中心将在下一批接入', icon: 'none' });
  },

  async onTapLogin() {
    this.setData({ authLoading: true });
    try {
      const result = await login();
      const user = getStoredUser();
      this.setData({ user, userText: this.buildUserText(user), authLoading: false });
      this.rebuildRecommendations();
      const mode = result?.loginMode ? `(${result.loginMode})` : '';
      wx.showToast({ title: `登录成功${mode}`, icon: 'success' });
    } catch (error) {
      this.setData({ authLoading: false });
      wx.showToast({ title: getErrorMessage(error, '登录失败').slice(0, 18), icon: 'none' });
    }
  },

  onTapBook(e) {
    wx.navigateTo({ url: `/pages/books/detail?id=${e.currentTarget.dataset.id}` });
  },

  onTapMatch() {
    wx.navigateTo({ url: '/pages/books/match/index' });
  },

  onTapSell() {
    wx.navigateTo({ url: '/pages/books/sell/index' });
  },

  onRetry() {
    this.loadBooks();
  },
});
