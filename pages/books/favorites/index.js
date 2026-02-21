import { getErrorMessage, getFavorites, removeFavorite } from '../../../services/books';

function normalizeFavorites(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.items || [];
  return rows
    .map((item) => {
      const book = item.book || item.bookInfo || {};
      const id = item.book_id || item.bookId || item.id || book.id;
      return {
        id,
        title: item.title || book.title || '未命名图书',
        author: item.author || book.author || '',
        price: item.price ?? book.price ?? 0,
        cover: item.cover || book.cover || '',
      };
    })
    .filter((item) => Boolean(item.id));
}

Page({
  data: {
    items: [],
    loading: true,
    error: '',
  },

  onShow() {
    this.loadFavorites();
  },

  async loadFavorites() {
    this.setData({ loading: true, error: '' });
    try {
      const payload = await getFavorites();
      this.setData({ items: normalizeFavorites(payload), loading: false });
    } catch (_error) {
      this.setData({ loading: false, error: '收藏加载失败，请先登录。' });
    }
  },

  async onRemove(e) {
    const bookId = e.currentTarget.dataset.id;
    if (!bookId) {
      wx.showToast({ title: '缺少图书ID，无法移除', icon: 'none' });
      return;
    }

    try {
      await removeFavorite(bookId);
      wx.showToast({ title: '已取消收藏', icon: 'success' });
      this.loadFavorites();
    } catch (error) {
      wx.showToast({ title: getErrorMessage(error, '移除失败'), icon: 'none' });
    }
  },

  onTapBook(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    wx.navigateTo({ url: `/pages/books/detail?id=${id}` });
  },
});
