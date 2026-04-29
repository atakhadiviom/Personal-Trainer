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

const partition = (arr, left, right) => {
  const mid = Math.floor((left + right) / 2);
  let temp = arr[mid];
  arr[mid] = arr[right];
  arr[right] = temp;

  const pivot = arr[right];
  let i = left;
  for (let j = left; j < right; j++) {
    if (arr[j] < pivot) {
      temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
      i++;
    }
  }
  temp = arr[i];
  arr[i] = arr[right];
  arr[right] = temp;
  return i;
};

const quickselect = (arr, k, left = 0, right = arr.length - 1) => {
  while (left < right) {
    let pivotIndex = partition(arr, left, right);
    if (pivotIndex === k) {
      return arr[k];
    } else if (pivotIndex < k) {
      left = pivotIndex + 1;
    } else {
      right = pivotIndex - 1;
    }
  }
  return arr[k];
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
  const values = points.map(p => p.value[0].fpVal);
  const idx = Math.floor(values.length * 0.2);
  return Math.round(quickselect(values, idx));
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
