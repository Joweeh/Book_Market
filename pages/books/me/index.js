import { getErrorMessage, getMe, getStoredUser, login } from '../../../services/books';

const WALLET_KEY = 'bm_wallet';
const PROFILE_EXTRA_KEY = 'bm_profile_extra';

const FEATURE_GROUPS = [
  {
    title: '教材服务',
    items: [
      { key: 'match', title: '教材匹配', subtitle: '按高校和学年匹配课程教材', route: '/pages/books/match/index' },
      { key: 'sell', title: '上传二手书', subtitle: '拍照提交后进入审核流程', route: '/pages/books/sell/index' },
    ],
  },
  {
    title: '交易管理',
    items: [
      { key: 'orders', title: '我的订单', subtitle: '查看与取消未完成订单', route: '/pages/books/orders/index' },
      { key: 'favorites', title: '我的收藏', subtitle: '管理关注书单与快捷下单', route: '/pages/books/favorites/index' },
    ],
  },
  {
    title: '帮助与反馈',
    items: [{ key: 'feedback', title: '反馈意见', subtitle: '提交建议或问题，我们会持续改进', route: '/pages/books/feedback/index' }],
  },
];

function normalizeWallet(wallet) {
  const balance = Number(wallet?.balance || 0);
  const transactions = Array.isArray(wallet?.transactions) ? wallet.transactions : [];
  return {
    balance: Number.isFinite(balance) ? balance : 0,
    transactions,
  };
}

function readProfileExtra() {
  const raw = wx.getStorageSync(PROFILE_EXTRA_KEY);
  if (!raw || typeof raw !== 'object') return {};
  return raw;
}

Page({
  data: {
    user: null,
    avatar: '',
    displayName: '未登录用户',
    displayId: '点击登录同步账号信息',
    schoolLine: '设置学校、学年、专业后可提升推荐准确度',
    walletBalance: '0.00',
    loading: false,
    loginError: '',
    featureGroups: FEATURE_GROUPS,
  },

  onShow() {
    this.syncTabBar();
    this.hydrateViewData();
  },

  syncTabBar() {
    const tab = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tab && typeof tab.setData === 'function') tab.setData({ active: 3 });
  },

  hydrateViewData() {
    const user = getStoredUser();
    const extra = readProfileExtra();
    const wallet = normalizeWallet(wx.getStorageSync(WALLET_KEY));
    const schoolParts = [user?.university || '', user?.schoolYear || '', user?.major || ''].filter(Boolean);

    this.setData({
      user: user || null,
      avatar: extra.avatar || '',
      displayName: user?.nick || '未登录用户',
      displayId: extra.wechatId ? `微信号：${extra.wechatId}` : user?.id ? `用户ID：${user.id}` : '点击登录同步账号信息',
      schoolLine: schoolParts.length > 0 ? schoolParts.join(' · ') : '设置学校、学年、专业后可提升推荐准确度',
      walletBalance: wallet.balance.toFixed(2),
    });
  },

  async onLoginTap() {
    this.setData({ loading: true, loginError: '' });
    try {
      await login();
      await getMe();
      this.hydrateViewData();
      this.setData({ loading: false });
      wx.showToast({ title: '登录成功', icon: 'success' });
    } catch (error) {
      const message = getErrorMessage(error, '登录失败');
      this.setData({ loading: false, loginError: `登录失败：${message}` });
      wx.showToast({ title: '登录失败', icon: 'none' });
    }
  },

  onTapProfile() {
    wx.navigateTo({ url: '/pages/books/profile/index' });
  },

  onTapWallet() {
    wx.navigateTo({ url: '/pages/books/wallet/index' });
  },

  onTapFeature(e) {
    const route = e.currentTarget.dataset.route;
    if (!route) return;
    wx.navigateTo({ url: route });
  },
});
