import { createOrder, getCart, getErrorMessage, removeCartItem } from '../../../services/books';

function normalizeCartItems(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.items || [];
  return rows
    .map((item) => {
      const book = item.book || item.bookInfo || {};
      const id = item.book_id || item.bookId || item.id || book.id;
      return {
        id,
        quantity: Number(item.quantity || item.count || 1),
        price: item.price ?? book.price ?? 0,
        cover: item.cover || book.cover || '',
        title: item.title || book.title || '未命名图书',
        author: item.author || book.author || '',
      };
    })
    .filter((item) => Boolean(item.id));
}

Page({
  data: {
    items: [],
    loading: true,
    creating: false,
    error: '',
  },

  onShow() {
    this.syncTabBar();
    this.loadCart();
  },

  syncTabBar() {
    const tab = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tab && typeof tab.setData === 'function') tab.setData({ active: 2 });
  },

  async loadCart() {
    this.setData({ loading: true, error: '' });
    try {
      const payload = await getCart();
      this.setData({ items: normalizeCartItems(payload), loading: false });
    } catch (_error) {
      this.setData({ loading: false, error: '购物车加载失败，请先登录。' });
    }
  },

  async onRemove(e) {
    const bookId = e.currentTarget.dataset.id;
    if (!bookId) {
      wx.showToast({ title: '缺少图书ID，无法删除', icon: 'none' });
      return;
    }

    try {
      await removeCartItem(bookId);
      wx.showToast({ title: '已移除', icon: 'success' });
      this.loadCart();
    } catch (error) {
      wx.showToast({ title: getErrorMessage(error, '移除失败'), icon: 'none' });
    }
  },

  async onCheckout() {
    this.setData({ creating: true });
    try {
      const order = await createOrder();
      wx.showToast({ title: '已创建订单', icon: 'success' });
      this.setData({ creating: false });
      wx.navigateTo({ url: `/pages/books/orders/index?id=${order?.id || ''}` });
    } catch (error) {
      this.setData({ creating: false });
      wx.showToast({ title: getErrorMessage(error, '结算失败'), icon: 'none' });
    }
  },

  onTapBook(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    wx.navigateTo({ url: `/pages/books/detail?id=${id}` });
  },
});
