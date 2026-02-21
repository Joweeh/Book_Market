const WALLET_KEY = 'bm_wallet';

const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500];

function normalizeWallet(wallet) {
  const balance = Number(wallet?.balance || 0);
  const transactions = Array.isArray(wallet?.transactions) ? wallet.transactions : [];
  return {
    balance: Number.isFinite(balance) ? balance : 0,
    transactions,
  };
}

function formatTime(ts) {
  const date = new Date(ts);
  const pad = (n) => `${n}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

Page({
  data: {
    wallet: {
      balance: 0,
      transactions: [],
    },
    quickAmounts: QUICK_AMOUNTS,
    customAmount: '',
    transactionView: [],
  },

  onShow() {
    this.loadWallet();
  },

  loadWallet() {
    const wallet = normalizeWallet(wx.getStorageSync(WALLET_KEY));
    this.setData({
      wallet,
      transactionView: wallet.transactions.map((item) => ({
        ...item,
        timeText: formatTime(item.time || Date.now()),
      })),
    });
  },

  persistWallet(wallet) {
    wx.setStorageSync(WALLET_KEY, wallet);
    this.loadWallet();
  },

  onCustomInput(e) {
    this.setData({ customAmount: e.detail.value || '' });
  },

  onQuickRecharge(e) {
    const amount = Number(e.currentTarget.dataset.amount || 0);
    this.recharge(amount, '快捷充值');
  },

  onCustomRecharge() {
    const amount = Number(this.data.customAmount || 0);
    this.recharge(amount, '自定义充值');
  },

  recharge(amount, source) {
    if (!Number.isFinite(amount) || amount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }

    const wallet = normalizeWallet(this.data.wallet);
    const nextBalance = wallet.balance + amount;
    const transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      type: 'recharge',
      amount,
      source,
      time: Date.now(),
    };

    wallet.balance = Number(nextBalance.toFixed(2));
    wallet.transactions = [transaction, ...wallet.transactions].slice(0, 100);

    this.setData({ customAmount: '' });
    this.persistWallet(wallet);
    wx.showToast({ title: '充值成功', icon: 'success' });
  },

  onClearRecords() {
    wx.showModal({
      title: '清空记录',
      content: '确认清空余额流水记录吗？余额数值会保留。',
      success: (res) => {
        if (!res.confirm) return;
        const wallet = normalizeWallet(this.data.wallet);
        wallet.transactions = [];
        this.persistWallet(wallet);
      },
    });
  },
});
