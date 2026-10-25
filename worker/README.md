# AI proxy (Cloudflare Worker)

Keeps the DeepSeek key off the client. Requires a signed-in Firebase user.

```
cd worker
npx wrangler login
npx wrangler secret put DEEPSEEK_API_KEY     # paste your key
npx wrangler deploy                          # prints https://novafit-ai-proxy.<you>.workers.dev
```

Then set the printed URL as `VITE_AI_PROXY_URL` in `.github/workflows/firebase-deploy.yml` and
push to `staging`. For local dev, put it in `.env` as `VITE_AI_PROXY_URL`.
