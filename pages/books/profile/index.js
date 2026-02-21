import { getErrorMessage, getMe, getStoredUser, updateMe } from '../../../services/books';

const PROFILE_EXTRA_KEY = 'bm_profile_extra';

const UNIVERSITIES = ['清华大学', '北京大学', '上海交通大学', '浙江大学', '复旦大学', '中国人民大学', '其他'];
const SCHOOL_YEARS = ['大一', '大二', '大三', '大四', '研一', '研二'];
const GENDER_OPTIONS = ['男', '女'];

const LOCATION_TREE = [
  {
    name: '北京市',
    cities: [{ name: '北京市', districts: ['海淀区', '朝阳区', '西城区', '东城区'] }],
  },
  {
    name: '上海市',
    cities: [{ name: '上海市', districts: ['浦东新区', '徐汇区', '闵行区', '杨浦区'] }],
  },
  {
    name: '浙江省',
    cities: [
      { name: '杭州市', districts: ['西湖区', '滨江区', '余杭区', '上城区'] },
      { name: '宁波市', districts: ['海曙区', '鄞州区', '江北区', '镇海区'] },
    ],
  },
  {
    name: '广东省',
    cities: [
      { name: '广州市', districts: ['天河区', '海珠区', '番禺区', '越秀区'] },
      { name: '深圳市', districts: ['南山区', '福田区', '宝安区', '龙岗区'] },
    ],
  },
];

function clampIndex(value, max) {
  if (max <= 0) return 0;
  if (value < 0) return 0;
  if (value >= max) return max - 1;
  return value;
}

function buildLocationColumns(provinceIndex = 0, cityIndex = 0, districtIndex = 0) {
  const provinces = LOCATION_TREE.map((item) => item.name);
  const pIndex = clampIndex(provinceIndex, provinces.length);

  const cities = LOCATION_TREE[pIndex]?.cities || [];
  const cityNames = cities.map((item) => item.name);
  const cIndex = clampIndex(cityIndex, cityNames.length);

  const districts = cities[cIndex]?.districts || [];
  const dIndex = clampIndex(districtIndex, districts.length);

  return {
    columns: [provinces, cityNames, districts],
    indices: [pIndex, cIndex, dIndex],
  };
}

function buildLocationText(indices) {
  const [pIndex, cIndex, dIndex] = indices;
  const province = LOCATION_TREE[pIndex]?.name || '';
  const city = LOCATION_TREE[pIndex]?.cities?.[cIndex]?.name || '';
  const district = LOCATION_TREE[pIndex]?.cities?.[cIndex]?.districts?.[dIndex] || '';
  return [province, city, district].filter(Boolean).join(' / ');
}

function readProfileExtra() {
  const raw = wx.getStorageSync(PROFILE_EXTRA_KEY);
  if (!raw || typeof raw !== 'object') return {};
  return raw;
}

Page({
  data: {
    user: null,
    loading: false,
    saving: false,
    error: '',

    universities: UNIVERSITIES,
    schoolYears: SCHOOL_YEARS,
    genderOptions: GENDER_OPTIONS,
    universityIndex: 0,
    yearIndex: 0,
    genderIndex: 0,
    locationColumns: buildLocationColumns(0, 0, 0).columns,
    locationIndex: [0, 0, 0],

    form: {
      avatar: '',
      nick: '',
      university: UNIVERSITIES[0],
      schoolYear: SCHOOL_YEARS[0],
      major: '',
      location: buildLocationText([0, 0, 0]),
      coursesText: '',
      phone: '',
      wechatId: '',
    },
  },

  onShow() {
    this.loadProfile();
  },

  resolveIndex(list, value) {
    const idx = list.findIndex((item) => item === value);
    return idx >= 0 ? idx : 0;
  },

  syncForm(user, extra = {}) {
    const universityIndex = this.resolveIndex(this.data.universities, user?.university || this.data.universities[0]);
    const yearIndex = this.resolveIndex(this.data.schoolYears, user?.schoolYear || this.data.schoolYears[0]);
    const genderIndex = this.resolveIndex(this.data.genderOptions, extra.gender || this.data.genderOptions[0]);

    const locationStorage = wx.getStorageSync('bm_location') || {};
    const locationIndex = Array.isArray(locationStorage.indices) ? locationStorage.indices : [0, 0, 0];
    const locationSetup = buildLocationColumns(locationIndex[0], locationIndex[1], locationIndex[2]);

    const courses = wx.getStorageSync('bm_courses');
    const majorStorage = wx.getStorageSync('bm_major') || '';

    this.setData({
      user: user || null,
      universityIndex,
      yearIndex,
      genderIndex,
      locationColumns: locationSetup.columns,
      locationIndex: locationSetup.indices,
      form: {
        avatar: extra.avatar || '',
        nick: user?.nick || '',
        university: this.data.universities[universityIndex],
        schoolYear: this.data.schoolYears[yearIndex],
        major: user?.major || majorStorage,
        location: locationStorage.text || buildLocationText(locationSetup.indices),
        coursesText: Array.isArray(courses) ? courses.join('，') : '',
        phone: user?.phone || extra.phone || '',
        wechatId: user?.wechatId || extra.wechatId || '',
      },
    });
  },

  async loadProfile() {
    this.setData({ loading: true, error: '' });
    const localUser = getStoredUser();
    const extra = readProfileExtra();
    this.syncForm(localUser || {}, extra);

    try {
      const user = await getMe();
      this.syncForm(user || {}, readProfileExtra());
      this.setData({ loading: false });
    } catch (error) {
      this.setData({
        loading: false,
        error: `当前未登录或登录态失效：${getErrorMessage(error, '请稍后重试')}`,
      });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    if (!field) return;
    this.setData({ [`form.${field}`]: e.detail.value || '' });
  },

  onUniversityChange(e) {
    const universityIndex = Number(e.detail.value || 0);
    this.setData({
      universityIndex,
      'form.university': this.data.universities[universityIndex],
    });
  },

  onYearChange(e) {
    const yearIndex = Number(e.detail.value || 0);
    this.setData({
      yearIndex,
      'form.schoolYear': this.data.schoolYears[yearIndex],
    });
  },

  onGenderChange(e) {
    const genderIndex = Number(e.detail.value || 0);
    this.setData({ genderIndex });
  },

  onLocationColumnChange(e) {
    const column = Number(e.detail.column);
    const value = Number(e.detail.value);
    const current = this.data.locationIndex.slice();

    if (column === 0) {
      current[0] = value;
      current[1] = 0;
      current[2] = 0;
    } else if (column === 1) {
      current[1] = value;
      current[2] = 0;
    } else {
      current[2] = value;
    }

    const setup = buildLocationColumns(current[0], current[1], current[2]);
    this.setData({
      locationColumns: setup.columns,
      locationIndex: setup.indices,
    });
  },

  onLocationChange(e) {
    const locationIndex = e.detail.value || [0, 0, 0];
    const setup = buildLocationColumns(locationIndex[0], locationIndex[1], locationIndex[2]);
    this.setData({
      locationColumns: setup.columns,
      locationIndex: setup.indices,
      'form.location': buildLocationText(setup.indices),
    });
  },

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const filePath = res?.tempFiles?.[0]?.tempFilePath;
        if (!filePath) return;
        this.setData({ 'form.avatar': filePath });
      },
    });
  },

  async onSave() {
    const nick = String(this.data.form.nick || '').trim();
    const major = String(this.data.form.major || '').trim();
    const coursesText = String(this.data.form.coursesText || '').trim();

    if (!nick) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    this.setData({ saving: true, error: '' });
    try {
      const user = await updateMe({
        nick,
        university: this.data.form.university,
        schoolYear: this.data.form.schoolYear,
        major,
        phone: String(this.data.form.phone || '').trim(),
        wechatId: String(this.data.form.wechatId || '').trim(),
      });

      const courses = coursesText
        .split(/[\n,，、;；]/)
        .map((item) => item.trim())
        .filter(Boolean);

      wx.setStorageSync('bm_courses', courses);
      wx.setStorageSync('bm_major', major);
      wx.setStorageSync('bm_location', {
        indices: this.data.locationIndex,
        text: this.data.form.location,
      });

      const extra = {
        avatar: this.data.form.avatar,
        gender: this.data.genderOptions[this.data.genderIndex] || '男',
      };

      wx.setStorageSync(PROFILE_EXTRA_KEY, extra);
      wx.setStorageSync('bm_user', user || null);
      this.setData({ saving: false, user: user || null });
      wx.showToast({ title: '资料已保存', icon: 'success' });
    } catch (error) {
      const message = getErrorMessage(error, '保存失败');
      this.setData({ saving: false, error: message });
      wx.showToast({ title: message.slice(0, 18), icon: 'none' });
    }
  },
});
