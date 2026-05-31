const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read'
];

let tokenClient = null;

export const initTokenClient = (callback) => {
  if (window.google) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: SCOPES.join(' '),
      callback: (response) => {
        if (response.access_token) {
          const expiry = Date.now() + response.expires_in * 1000;
          localStorage.setItem('gfit_token', response.access_token);
          localStorage.setItem('gfit_token_exp', expiry);
          if (callback) callback(response.access_token);
        }
      },
    });
  }
};

export const getToken = () => {
  const token = localStorage.getItem('gfit_token');
  const exp = localStorage.getItem('gfit_token_exp');
  if (token && exp && Date.now() < parseInt(exp)) return token;
  return null;
};

export const connect = () => {
  return new Promise((resolve, reject) => {
    if (!window.google) { reject(new Error('GIS not loaded')); return; }
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: SCOPES.join(' '),
      callback: (response) => {
        if (response.access_token) {
          const expiry = Date.now() + response.expires_in * 1000;
          localStorage.setItem('gfit_token', response.access_token);
          localStorage.setItem('gfit_token_exp', expiry);
          resolve(response.access_token);
        } else {
          reject(new Error('No access token in response'));
        }
      },
      // Resolve rejection when user cancels the OAuth consent popup
      error_callback: (err) => reject(new Error(err?.type || 'oauth_error')),
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

export const disconnect = () => {
  localStorage.removeItem('gfit_token');
  localStorage.removeItem('gfit_token_exp');
};

const fetchCache = new Map();
const CACHE_TTL_MS = 60000; // 1 minute cache

export const clearFetchCache = () => fetchCache.clear();

const fetchFit = async (url, method = 'GET', body = null) => {
  const token = getToken();
  if (!token) throw new Error('Not connected');

  const cacheKey = `${method}:${url}:${body ? JSON.stringify(body) : ''}`;

  if (fetchCache.has(cacheKey)) {
    const { timestamp, promise } = fetchCache.get(cacheKey);
    if (Date.now() - timestamp < CACHE_TTL_MS) {
      return promise;
    }
    fetchCache.delete(cacheKey);
  }

  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);

  const fetchPromise = fetch(url, opts).then(res => {
    if (res.status === 401) { disconnect(); throw new Error('Token expired'); }
    return res.json();
  }).catch(err => {
    fetchCache.delete(cacheKey);
    throw err;
  });

  fetchCache.set(cacheKey, { timestamp: Date.now(), promise: fetchPromise });

  return fetchPromise;
};

export const getSteps = async () => {
  const start = new Date().setHours(0, 0, 0, 0);
  const data = await fetchFit('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', 'POST', {
    aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: start,
    endTimeMillis: Date.now()
  });
  return data.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal ?? null;
};

export const getCaloriesBurned = async () => {
  const start = new Date().setHours(0, 0, 0, 0);
  const data = await fetchFit('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', 'POST', {
    aggregateBy: [{ dataTypeName: 'com.google.calories.expended' }],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: start,
    endTimeMillis: Date.now()
  });
  const val = data.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal;
  return val != null ? Math.round(val) : null;
};

export const getHeartRate = async () => {
  const startNs = new Date().setHours(0, 0, 0, 0) * 1000000;
  const endNs = Date.now() * 1000000;
  const data = await fetchFit(
    `https://www.googleapis.com/fitness/v1/users/me/dataSources/derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm/datasets/${startNs}-${endNs}`
  );
  const points = data.point || [];
  if (!points.length) return null;
  const avg = points.reduce((acc, p) => acc + p.value[0].fpVal, 0) / points.length;
  return Math.round(avg);
};

export const getSleep = async () => {
  const end = Date.now();
  const start = end - 86400000;
  const data = await fetchFit('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', 'POST', {
    aggregateBy: [{ dataTypeName: 'com.google.sleep.segment' }],
    startTimeMillis: start,
    endTimeMillis: end
  });
  const points = data.bucket?.[0]?.dataset?.[0]?.point || [];
  const totalMs = points.reduce((acc, p) => acc + (p.endTimeNanos - p.startTimeNanos) / 1000000, 0);
  return totalMs > 0 ? (totalMs / 3600000).toFixed(1) : null;
};


export const getWeeklyAverageCalories = async () => {
  const end = new Date().setHours(23, 59, 59, 999);
  const start = end - 7 * 86400000;
  const data = await fetchFit('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', 'POST', {
    aggregateBy: [{ dataTypeName: 'com.google.calories.expended' }],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: start,
    endTimeMillis: end
  });
  const buckets = data.bucket || [];
  let total = 0;
  let days = 0;
  for (const b of buckets) {
    const val = b.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal;
    if (val) {
      total += val;
      days++;
    }
  }
  return days > 0 ? Math.round(total / days) : null;
};

// 7-day average daily steps
export const get7DayStepAverage = async () => {
  const end = Date.now();
  const start = end - 7 * 86400000;
  const data = await fetchFit('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', 'POST', {
    aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: start,
    endTimeMillis: end
  });
  const buckets = data.bucket || [];
  let total = 0, days = 0;
  for (const b of buckets) {
    const val = b.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal;
    if (val) { total += val; days++; }
  }
  return days > 0 ? Math.round(total / days) : null;
};

// Resting heart rate = 20th percentile of today's HR readings
export const getRestingHeartRate = async () => {
  const startNs = new Date().setHours(0, 0, 0, 0) * 1000000;
  const endNs = Date.now() * 1000000;
  const data = await fetchFit(
    `https://www.googleapis.com/fitness/v1/users/me/dataSources/derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm/datasets/${startNs}-${endNs}`
  );
  const points = data.point || [];
  if (!points.length) return null;
  const sorted = points.map(p => p.value[0].fpVal).sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.2);
  return Math.round(sorted[idx]);
};

// Sleep history: last 7 days array of { date: 'YYYY-MM-DD', hours: float }
export const getSleepHistory = async () => {
  const end = Date.now();
  const start = end - 7 * 86400000;
  const data = await fetchFit('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', 'POST', {
    aggregateBy: [{ dataTypeName: 'com.google.sleep.segment' }],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: start,
    endTimeMillis: end
  });
  return (data.bucket || []).map(b => {
    const date = new Date(parseInt(b.startTimeMillis)).toISOString().split('T')[0];
    const points = b.dataset?.[0]?.point || [];
    const totalMs = points.reduce((acc, p) => acc + (p.endTimeNanos - p.startTimeNanos) / 1000000, 0);
    return { date, hours: parseFloat((totalMs / 3600000).toFixed(1)) };
  });
};
