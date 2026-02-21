const PROD_API_BASE = 'https://api.example.com';
const TOKEN_KEY = 'bm_token';
const USER_KEY = 'bm_user';
const DEVICE_KEY = 'bm_device_id';
let activeApiBase = '';

const normalizeApiBase = (value) => String(value || '').trim().replace(/\/+$/, '');
const normalizeUploadUrl = (value) => {
  if (!value || typeof value !== 'string') return value;
  const raw = value.trim();
  if (!raw) return raw;

  // Normalize legacy/relative upload paths to PROD https domain so they work on real devices.
  if (raw.startsWith('/uploads/')) return `${PROD_API_BASE}${raw}`;

  const legacyPrefixes = [
    'http://api.example.com',
    'https://api.example.com',
  ];
  for (const prefix of legacyPrefixes) {
    if (raw.startsWith(prefix)) return `${PROD_API_BASE}${raw.slice(prefix.length)}`;
  }

  return raw;
};

const normalizeUrlsDeep = (value) => {
  if (Array.isArray(value)) return value.map(normalizeUrlsDeep);
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? normalizeUploadUrl(value) : value;
  }
  const next = {};
  Object.keys(value).forEach((k) => {
    next[k] = normalizeUrlsDeep(value[k]);
  });
  return next;
};

const isDevtoolsRuntime = () => {
  try {
    const baseInfo = wx.getAppBaseInfo?.();
    const hostEnv = String(baseInfo?.host?.env || baseInfo?.host?.environment || '').toLowerCase();
    if (hostEnv.includes('devtools')) return true;

    const platform = String(wx.getDeviceInfo?.()?.platform || '').toLowerCase();
    return platform === 'devtools';
  } catch (e) {
    return false;
  }
};

const getEnvVersion = () => {
  try {
    return wx.getAccountInfoSync?.()?.miniProgram?.envVersion || 'release';
  } catch (e) {
    return 'release';
  }
};

const getApiCandidates = () => {
  const candidates = [];
  const isDevtools = isDevtoolsRuntime();
  // Keep real devices on a single stable HTTPS domain. Allow override only in devtools for debugging.
  if (isDevtools) {
    try {
      const override = wx.getStorageSync('bm_api_base_override');
      if (override) candidates.push(normalizeApiBase(override));
    } catch (e) {
      // noop
    }
    // Use HTTPS domain only so behavior matches real devices (mini program requests disallow plain HTTP).
    candidates.push(PROD_API_BASE);
  } else {
    candidates.push(PROD_API_BASE);
  }

  const deduped = [];
  candidates.forEach((item) => {
    const normalized = normalizeApiBase(item);
    if (normalized && !deduped.includes(normalized)) deduped.push(normalized);
  });

  if (activeApiBase && deduped.includes(activeApiBase)) {
    return [activeApiBase, ...deduped.filter((item) => item !== activeApiBase)];
  }

  return deduped.length > 0 ? deduped : [PROD_API_BASE];
};

const shouldRetryWithNextBase = (err) => {
  if (err?.statusCode) return false;
  const message = String(err?.message || err?.errMsg || '').toLowerCase();
  if (!message) return false;
  return (
    message.includes('request:fail') ||
    message.includes('timeout') ||
    message.includes('connection reset') ||
    message.includes('ssl') ||
    message.includes('network')
  );
};

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || '';
}

function setToken(token) {
  wx.setStorageSync(TOKEN_KEY, token || '');
}

function clearToken() {
  wx.removeStorageSync(TOKEN_KEY);
}

function setUser(user) {
  wx.setStorageSync(USER_KEY, user || null);
}

function getMiniProgramAppId() {
  try {
    return wx.getAccountInfoSync?.()?.miniProgram?.appId || '';
  } catch (e) {
    return '';
  }
}

function getDeviceId() {
  let deviceId = wx.getStorageSync(DEVICE_KEY);
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    wx.setStorageSync(DEVICE_KEY, deviceId);
  }
  return deviceId;
}

export function getStoredUser() {
  return wx.getStorageSync(USER_KEY) || null;
}

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res.code) {
          resolve(res.code);
          return;
        }
        reject(new Error('wx.login did not return code'));
      },
      fail(err) {
        reject(err);
      },
    });
  });
}

function requestOnce(base, path, options = {}) {
  const { method = 'GET', data, auth = false } = options;
  return new Promise((resolve, reject) => {
    const headers = {};
    if (auth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    if (data !== undefined && data !== null) headers['content-type'] = 'application/json';
    const reqOptions = {
      url: `${base}${path}`,
      method,
      header: headers,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(normalizeUrlsDeep(res.data));
          return;
        }
        reject({
          statusCode: res.statusCode,
          data: res.data,
          message: res?.data?.error || `HTTP ${res.statusCode}`,
        });
      },
      fail(err) {
        reject({
          ...err,
          message: err?.errMsg || err?.message || 'network request failed',
        });
      },
    };
    if (data !== undefined && data !== null) reqOptions.data = data;
    wx.request(reqOptions);
  });
}

async function request(path, options = {}) {
  const bases = getApiCandidates();
  let lastError = null;

  for (let i = 0; i < bases.length; i += 1) {
    const base = bases[i];
    try {
      const result = await requestOnce(base, path, options);
      activeApiBase = base;
      return result;
    } catch (err) {
      lastError = err;
      const canRetry = i < bases.length - 1 && shouldRetryWithNextBase(err);
      if (!canRetry) break;
    }
  }

  if (lastError && !lastError.message?.includes('base=')) {
    const baseInfo = bases.join(' -> ');
    lastError.message = `${lastError.message || 'network request failed'} (base=${baseInfo})`;
  }
  throw lastError || new Error('network request failed');
}

async function authRequest(path, options = {}) {
  if (!getToken()) await login();
  try {
    return await request(path, { ...options, auth: true });
  } catch (err) {
    if (err?.statusCode === 401) {
      clearToken();
      await login();
      return request(path, { ...options, auth: true });
    }
    throw err;
  }
}

export async function login() {
  const code = await wxLogin();
  const result = await request('/api/wx/login', {
    method: 'POST',
    data: {
      code,
      appId: getMiniProgramAppId(),
      deviceId: getDeviceId(),
    },
  });
  setToken(result?.token || '');
  setUser(result?.user || null);
  return result;
}

export function getMe() {
  return authRequest('/api/me');
}

export function updateMe(payload) {
  return authRequest('/api/me', {
    method: 'PUT',
    data: payload,
  });
}

export function getBooks() {
  return request('/api/books');
}

export function getBook(id) {
  return request(`/api/books/${id}`);
}

export function getCategories() {
  return request('/api/categories');
}

export function getBookPlan(university, schoolYear) {
  const params = [];
  if (university) params.push(`university=${encodeURIComponent(university)}`);
  if (schoolYear) params.push(`schoolYear=${encodeURIComponent(schoolYear)}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return authRequest(`/api/book-plan${query}`);
}

export function getCart() {
  return authRequest('/api/cart');
}

export function addCartItem(bookId, quantity = 1) {
  return authRequest('/api/cart/items', {
    method: 'POST',
    data: { bookId, quantity },
  });
}

export function removeCartItem(bookId) {
  return authRequest(`/api/cart/items/${bookId}`, {
    method: 'DELETE',
  });
}

export function getFavorites() {
  return authRequest('/api/favorites');
}

export function addFavorite(bookId) {
  return authRequest(`/api/favorites/${bookId}`, {
    method: 'POST',
  });
}

export function removeFavorite(bookId) {
  return authRequest(`/api/favorites/${bookId}`, {
    method: 'DELETE',
  });
}

export function getOrders() {
  return authRequest('/api/orders');
}

export function getOrder(id) {
  return authRequest(`/api/orders/${id}`);
}

export function createOrder(items = null) {
  const payload = Array.isArray(items) ? { items } : {};
  return authRequest('/api/orders', {
    method: 'POST',
    data: payload,
  });
}

export function cancelOrder(id) {
  return authRequest(`/api/orders/${id}/cancel`, {
    method: 'POST',
    data: {},
  });
}

export function createSellRequest(payload) {
  return authRequest('/api/sell-requests', {
    method: 'POST',
    data: payload,
  });
}

export function getMySellRequests() {
  return authRequest('/api/sell-requests/mine');
}

export async function uploadSellImage(filePath) {
  if (!getToken()) await login();
  const token = getToken();
  const bases = getApiCandidates();
  let lastError = null;

  for (let i = 0; i < bases.length; i += 1) {
    const base = bases[i];
    try {
      const result = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${base}/api/uploads/sell-image`,
          filePath,
          name: 'file',
          header: token ? { Authorization: `Bearer ${token}` } : {},
          success(res) {
            let payload = null;
            try {
              payload = JSON.parse(res.data || '{}');
            } catch (e) {
              reject({ message: 'Invalid upload response' });
              return;
            }
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(normalizeUrlsDeep(payload));
              return;
            }
            reject({
              statusCode: res.statusCode,
              data: payload,
              message: payload?.error || `HTTP ${res.statusCode}`,
            });
          },
          fail(err) {
            reject({
              ...err,
              message: err?.errMsg || err?.message || 'upload failed',
            });
          },
        });
      });
      activeApiBase = base;
      return result;
    } catch (err) {
      lastError = err;
      const canRetry = i < bases.length - 1 && shouldRetryWithNextBase(err);
      if (!canRetry) break;
    }
  }

  throw lastError || new Error('upload failed');
}

export function getErrorMessage(err, fallback = 'Request failed') {
  if (err?.data?.error) return err.data.error;
  if (err?.errMsg) return err.errMsg;
  if (err?.message) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}
