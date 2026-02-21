import {
  addCartItem,
  addFavorite,
  createOrder,
  getBook,
  getBooks,
  getErrorMessage,
  getFavorites,
  removeFavorite,
} from '../../services/books';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function shortTime(iso) {
  if (!iso) return '未知';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '未知';
  const pad = (n) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function normalizeBook(raw) {
  const book = raw || {};
  const price = Number(book.price || 0);
  const originPrice = Number((price * 1.35).toFixed(2));
  const tags = toArray(book.tags);
  return {
    ...book,
    price: Number.isFinite(price) ? price : 0,
    originPrice,
    tags,
    conditionGrade: book.conditionGrade || 'B',
    sellerName: book.ownerNick || '二手书用户上传',
    createdText: shortTime(book.createdAt),
    course: book.course || (tags[0] || ''),
  };
}

function buildGallery(book) {
  const imageSet = new Set();
  const urls = [];
  const pushUrl = (url) => {
    if (!url || imageSet.has(url)) return;
    imageSet.add(url);
    urls.push(url);
  };

  pushUrl(book.cover);
  toArray(book.images).forEach((url) => pushUrl(url));
  if (urls.length === 0) pushUrl('https://picsum.photos/seed/book-empty/720/960');
  return urls;
}

function trackBehavior(bookId) {
  if (!bookId) return;
  try {
    const behavior = wx.getStorageSync('bm_behavior') || {};
    const current = Number(behavior[bookId] || 0);
    behavior[bookId] = current + 1;
    wx.setStorageSync('bm_behavior', behavior);
  } catch (e) {
    // noop
  }
}

Page({
  data: {
    book: null,
    bookId: '',
    favorite: false,
    actionLoading: false,
    loading: true,
    error: '',
    gallery: [],
    recommendBooks: [],
    infoRows: [],
  },

  onLoad(query) {
    const { id } = query || {};
    if (!id) {
      this.setData({ loading: false, error: '缺少图书 ID' });
      return;
    }
    this.setData({ bookId: String(id) });
    this.loadBook(String(id));
  },

  onShow() {
    if (this.data.bookId) this.syncFavoriteStatus();
  },

  async loadBook(id) {
    this.setData({ loading: true, error: '' });
    try {
      const payload = await getBook(id);
      const book = normalizeBook(payload);
      const infoRows = [
        { label: '课程', value: book.course || '-' },
        { label: '成色评级', value: book.conditionGrade || '-' },
        { label: '上传用户', value: book.sellerName || '-' },
        { label: '上架时间', value: book.createdText || '-' },
        { label: '状态', value: book.status === 'listed' ? '在售' : '下架' },
      ];
      this.setData({
        book,
        gallery: buildGallery(book),
        infoRows,
        loading: false,
      });
      wx.setNavigationBarTitle({ title: book.title || '图书详情' });
      trackBehavior(id);
      this.syncFavoriteStatus();
      this.loadRecommendations(id, book.course);
    } catch (_err) {
      this.setData({ loading: false, error: '加载图书详情失败，请稍后重试。' });
    }
  },

  async loadRecommendations(currentId, course) {
    try {
      const payload = await getBooks();
      const rows = toArray(payload).map(normalizeBook);
      const sorted = rows
        .filter((item) => String(item.id) !== String(currentId) && item.status !== 'unlisted')
        .sort((a, b) => {
          const aScore = (a.course === course ? 10 : 0) + a.price / 100;
          const bScore = (b.course === course ? 10 : 0) + b.price / 100;
          return bScore - aScore;
        })
        .slice(0, 4);
      this.setData({ recommendBooks: sorted });
    } catch (e) {
      this.setData({ recommendBooks: [] });
    }
  },

  async syncFavoriteStatus() {
    if (!this.data.bookId) return;
    try {
      const payload = await getFavorites();
      const favorites = Array.isArray(payload) ? payload : payload?.items || [];
      const exists = favorites.some((item) => String(item.book_id || item.id) === String(this.data.bookId));
      this.setData({ favorite: exists });
    } catch (_err) {
      // ignore when not logged in
    }
  },

  async onAddCart() {
    if (!this.data.bookId) return;
    this.setData({ actionLoading: true });
    try {
      await addCartItem(this.data.bookId, 1);
      wx.showToast({ title: '已加入购物车', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: getErrorMessage(err, '加入失败').slice(0, 18), icon: 'none' });
    } finally {
      this.setData({ actionLoading: false });
    }
  },

  async onToggleFavorite() {
    if (!this.data.bookId) return;
    this.setData({ actionLoading: true });
    try {
      const nextFavorite = !this.data.favorite;
      if (this.data.favorite) {
        await removeFavorite(this.data.bookId);
      } else {
        await addFavorite(this.data.bookId);
      }
      this.setData({ favorite: nextFavorite });
      wx.showToast({ title: nextFavorite ? '已收藏' : '已取消收藏', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: getErrorMessage(err, '收藏失败').slice(0, 18), icon: 'none' });
    } finally {
      this.setData({ actionLoading: false });
    }
  },

  async onBuyNow() {
    if (!this.data.bookId) return;
    this.setData({ actionLoading: true });
    try {
      const order = await createOrder([{ bookId: this.data.bookId, quantity: 1 }]);
      wx.showToast({ title: '下单成功', icon: 'success' });
      wx.navigateTo({ url: `/pages/books/orders/index?id=${order.id || ''}` });
    } catch (err) {
      wx.showToast({ title: getErrorMessage(err, '下单失败').slice(0, 18), icon: 'none' });
    } finally {
      this.setData({ actionLoading: false });
    }
  },

  onOpenCart() {
    wx.switchTab({ url: '/pages/books/cart/index' });
  },

  onOpenRecommend(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/books/detail?id=${id}` });
  },

  onRetry() {
    if (this.data.bookId) this.loadBook(this.data.bookId);
  },
});
