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
    initTokenClient(resolve);
    if (!tokenClient) { reject(new Error('GIS not loaded')); return; }
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

export const disconnect = () => {
  localStorage.removeItem('gfit_token');
  localStorage.removeItem('gfit_token_exp');
};

const fetchFit = async (url, method = 'GET', body = null) => {
  const token = getToken();
  if (!token) throw new Error('Not connected');
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (res.status === 401) { disconnect(); throw new Error('Token expired'); }
  return res.json();
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
