import dayjs from 'dayjs';

const formatTime = (date, template) => dayjs(date).format(template);

/**
 * 鏍煎紡鍖栦环鏍兼暟棰濅负瀛楃涓? * 鍙灏忔暟閮ㄥ垎杩涜濉厖锛岄粯璁や笉濉厖
 * @param price 浠锋牸鏁伴锛屼互鍒嗕负鍗曚綅!
 * @param fill 鏄惁濉厖灏忔暟閮ㄥ垎 0-涓嶅～鍏?1-濉厖绗竴浣嶅皬鏁?2-濉厖涓や綅灏忔暟
 */
function priceFormat(price, fill = 0) {
  if (isNaN(price) || price === null || price === Infinity) {
    return price;
  }

  let priceFormatValue = Math.round(parseFloat(`${price}`) * 10 ** 8) / 10 ** 8; // 鎭㈠绮惧害涓㈠け
  priceFormatValue = `${Math.ceil(priceFormatValue) / 100}`; // 鍚戜笂鍙栨暣锛屽崟浣嶈浆鎹负鍏冿紝杞崲涓哄瓧绗︿覆
  if (fill > 0) {
    // 琛ュ厖灏忔暟浣嶆暟
    if (priceFormatValue.indexOf('.') === -1) {
      priceFormatValue = `${priceFormatValue}.`;
    }
    const n = fill - priceFormatValue.split('.')[1]?.length;
    for (let i = 0; i < n; i++) {
      priceFormatValue = `${priceFormatValue}0`;
    }
  }
  return priceFormatValue;
}

/**
 * 鑾峰彇cdn瑁佸壀鍚庨摼鎺? *
 * @param {string} url 鍩虹閾炬帴
 * @param {number} width 瀹藉害锛屽崟浣峱x
 * @param {number} [height] 鍙€夛紝楂樺害锛屼笉濉椂涓巜idth鍚屽€? */
const cosThumb = (url, width, height = width) => {
  if (url.indexOf('?') > -1) {
    return url;
  }

  if (url.indexOf('http://') === 0) {
    url = url.replace('http://', 'https://');
  }

  return `${url}?imageMogr2/thumbnail/${~~width}x${~~height}`;
};

const get = (source, paths, defaultValue) => {
  if (typeof paths === 'string') {
    paths = paths
      .replace(/\[/g, '.')
      .replace(/\]/g, '')
      .split('.')
      .filter(Boolean);
  }
  const { length } = paths;
  let index = 0;
  while (source != null && index < length) {
    source = source[paths[index++]];
  }
  return source === undefined || index === 0 ? defaultValue : source;
};
let systemWidth = 0;
function getSafeScreenWidth() {
  try {
    const deviceInfo = wx.getDeviceInfo?.();
    if (deviceInfo?.screenWidth) return Number(deviceInfo.screenWidth);

    const windowInfo = wx.getWindowInfo?.();
    if (windowInfo?.screenWidth) return Number(windowInfo.screenWidth);
    if (windowInfo?.windowWidth) return Number(windowInfo.windowWidth);
  } catch (e) {
    // noop
  }
  return 0;
}

/** 获取系统宽度，为了减少启动消耗所以在函数里面做初始化 */
export const loadSystemWidth = () => {
  if (systemWidth) {
    return systemWidth;
  }

  systemWidth = getSafeScreenWidth();
  return systemWidth;
};

/**
 * 杞崲rpx涓簆x
 *
 * @description
 * 浠€涔堟椂鍊欑敤锛? * - 甯冨眬(width: 172rpx)宸茬粡鍐欏ソ, 鏌愪簺缁勪欢鍙帴鍙梡x浣滀负style鎴栬€卲rop鎸囧畾
 *
 */
const rpx2px = (rpx, round = false) => {
  loadSystemWidth();

  // px / systemWidth = rpx / 750
  const result = (rpx * systemWidth) / 750;

  if (round) {
    return Math.floor(result);
  }

  return result;
};

/**
 * 鎵嬫満鍙风爜*鍔犲瘑鍑芥暟
 * @param {string} phone 鐢佃瘽鍙? * @returns
 */
const phoneEncryption = (phone) => {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

// 鍐呯疆鎵嬫満鍙锋鍒欏瓧绗︿覆
const innerPhoneReg =
  '^1(?:3\\d|4[4-9]|5[0-35-9]|6[67]|7[0-8]|8\\d|9\\d)\\d{8}$';

/**
 * 鎵嬫満鍙锋鍒欐牎楠? * @param phone 鎵嬫満鍙? * @param phoneReg 姝ｅ垯瀛楃涓? * @returns true - 鏍￠獙閫氳繃 false - 鏍￠獙澶辫触
 */
const phoneRegCheck = (phone) => {
  const phoneRegExp = new RegExp(innerPhoneReg);
  return phoneRegExp.test(phone);
};

module.exports = {
  formatTime,
  priceFormat,
  cosThumb,
  get,
  rpx2px,
  phoneEncryption,
  phoneRegCheck,
};

