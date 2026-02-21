import { getBookPlan, getErrorMessage, getStoredUser } from '../../../services/books';

const DEFAULT_PLAN = [
  { course: '微积分', title: '高等数学（同济版）', author: '同济大学数学系' },
  { course: '线性代数', title: '线性代数（同济版）', author: '同济大学数学系' },
  { course: '概率论', title: '概率论与数理统计（浙大版）', author: '浙江大学' },
  { course: 'C语言', title: 'C程序设计（谭浩强）', author: '谭浩强' },
  { course: '马原', title: '马克思主义基本原理', author: '高等教育出版社' },
];

const UNIVERSITIES = ['清华大学', '北京大学', '上海交通大学', '浙江大学', '复旦大学', '其他'];
const SCHOOL_YEARS = ['大一', '大二', '大三', '大四', '研一', '研二'];

function normalizePlan(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.books)) return payload.books;
  if (Array.isArray(payload?.plan)) return payload.plan;
  return [];
}

Page({
  data: {
    universities: UNIVERSITIES,
    schoolYears: SCHOOL_YEARS,
    universityIndex: 0,
    yearIndex: 0,
    selectedUniversity: UNIVERSITIES[0],
    selectedSchoolYear: SCHOOL_YEARS[0],
    plan: DEFAULT_PLAN,
    loading: false,
    error: '',
    fromServer: false,
  },

  onShow() {
    const user = getStoredUser() || {};
    if (user.university) {
      const idx = this.data.universities.findIndex((item) => item === user.university);
      if (idx >= 0) {
        this.setData({ universityIndex: idx, selectedUniversity: user.university });
      }
    }
    if (user.schoolYear) {
      const idx = this.data.schoolYears.findIndex((item) => item === user.schoolYear);
      if (idx >= 0) {
        this.setData({ yearIndex: idx, selectedSchoolYear: user.schoolYear });
      }
    }
  },

  onUniversityChange(e) {
    const index = Number(e.detail.value || 0);
    this.setData({
      universityIndex: index,
      selectedUniversity: this.data.universities[index],
    });
  },

  onYearChange(e) {
    const index = Number(e.detail.value || 0);
    this.setData({
      yearIndex: index,
      selectedSchoolYear: this.data.schoolYears[index],
    });
  },

  async onMatch() {
    this.setData({ loading: true, error: '' });
    try {
      const payload = await getBookPlan(this.data.selectedUniversity, this.data.selectedSchoolYear);
      const plan = normalizePlan(payload);

      if (plan.length === 0) {
        this.setData({
          loading: false,
          fromServer: false,
          plan: DEFAULT_PLAN,
          error: '该高校和学年的教材清单暂未配置，已展示默认方案。',
        });
        return;
      }

      this.setData({
        loading: false,
        fromServer: true,
        plan,
      });
    } catch (error) {
      this.setData({
        loading: false,
        fromServer: false,
        plan: DEFAULT_PLAN,
        error: getErrorMessage(error, '匹配接口暂不可用，已展示默认方案。'),
      });
    }
  },

  onGoSell() {
    wx.navigateTo({ url: '/pages/books/sell/index' });
  },
});
