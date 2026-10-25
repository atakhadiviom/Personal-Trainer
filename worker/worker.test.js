// @vitest-environment node
import { describe, it, expect } from 'vitest';
import worker from './src/index.js';

const env = {
  FIREBASE_PROJECT_ID: 'demo',
  ALLOWED_ORIGINS: 'https://app.example',
  DEEPSEEK_API_KEY: 'x',
};
const req = (init = {}) =>
  new Request('https://proxy.example/', { method: 'POST', body: '{}', ...init, headers: { Origin: 'https://app.example', ...(init.headers || {}) } });

describe('AI proxy worker', () => {
  it('answers CORS preflight for allowed origins', async () => {
    const res = await worker.fetch(req({ method: 'OPTIONS', body: undefined }), env);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example');
  });

  it('rejects disallowed origins', async () => {
    const res = await worker.fetch(req({ headers: { Origin: 'https://evil.example' } }), env);
    expect(res.status).toBe(403);
  });

  it('rejects requests without a valid Firebase token', async () => {
    const res = await worker.fetch(req({ headers: { Authorization: 'Bearer not.a.jwt' } }), env);
    expect(res.status).toBe(401);
  });

  it('allows the built-in origins even if ALLOWED_ORIGINS is missing', async () => {
    const res = await worker.fetch(
      req({ method: 'OPTIONS', body: undefined, headers: { Origin: 'https://novafit-ai-5be0c.web.app' } }),
      { FIREBASE_PROJECT_ID: 'demo' }
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://novafit-ai-5be0c.web.app');
  });

  it('serves a health check on GET', async () => {
    const res = await worker.fetch(req({ method: 'GET', body: undefined }), env);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.hasKey).toBe(true);
  });
});
