import { cancelOrder, getErrorMessage, getOrders } from '../../../services/books';

function normalizeOrders(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.orders || payload?.items || [];
  return rows.map((order) => {
    const status = String(order?.status || '').toLowerCase();
    const blockList = ['cancelled', 'canceled', 'completed', 'closed', 'refunded'];
    const canCancel = !blockList.includes(status);

    const items = Array.isArray(order?.items) ? order.items : [];
    const normalizedItems = items.map((item) => {
      const book = item.book || item.bookInfo || {};
      return {
        id: item.book_id || item.bookId || item.id || book.id,
        quantity: Number(item.quantity || item.count || 1),
        price: item.price ?? book.price ?? 0,
        title: item.title || book.title || `图书 ${item.book_id || item.id || ''}`,
      };
    });

    return {
      ...order,
      canCancel,
      normalizedItems,
    };
  });
}

Page({
  data: {
    orders: [],
    loading: true,
    error: '',
    currentOrderId: '',
  },

  onLoad(query) {
    this.setData({ currentOrderId: query?.id || '' });
  },

  onShow() {
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true, error: '' });
    try {
      const payload = await getOrders();
      this.setData({ orders: normalizeOrders(payload), loading: false });
    } catch (_error) {
      this.setData({ loading: false, error: '订单加载失败，请先登录。' });
    }
  },

  async onCancel(e) {
    const orderId = e.currentTarget.dataset.id;
    if (!orderId) {
      wx.showToast({ title: '缺少订单ID，无法取消', icon: 'none' });
      return;
    }

    try {
      await cancelOrder(orderId);
      wx.showToast({ title: '订单已取消', icon: 'success' });
      this.loadOrders();
    } catch (error) {
      wx.showToast({ title: getErrorMessage(error, '取消失败'), icon: 'none' });
    }
  },

  onTapBook(e) {
    const bookId = e.currentTarget.dataset.id;
    if (!bookId) return;
    wx.navigateTo({ url: `/pages/books/detail?id=${bookId}` });
  },
});
