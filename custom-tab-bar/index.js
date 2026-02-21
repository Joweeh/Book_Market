import TabMenu from './data';
Component({
  data: {
    active: 0,
    list: TabMenu,
  },

  pageLifetimes: {
    show() {
      this.init();
    },
  },

  methods: {
    onChange(event) {
      const index = Number(event.currentTarget.dataset.index);
      if (!Number.isFinite(index) || index < 0 || index >= this.data.list.length) return;
      this.setData({ active: index });
      wx.switchTab({
        url: this.data.list[index].url.startsWith('/') ? this.data.list[index].url : `/${this.data.list[index].url}`,
      });
    },

    init() {
      const page = getCurrentPages().pop();
      const route = page ? page.route.split('?')[0] : '';
      const matched = this.data.list.findIndex(
        (item) =>
          (item.url.startsWith('/') ? item.url.substr(1) : item.url) ===
          `${route}`,
      );
      const active = matched >= 0 ? matched : 0;
      this.setData({ active });
    },
  },
});
