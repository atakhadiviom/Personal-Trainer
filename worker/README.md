# AI proxy (Cloudflare Worker)

Keeps the DeepSeek key off the client. Requires a signed-in Firebase user.

```
cd worker
npx wrangler login
npx wrangler secret put DEEPSEEK_API_KEY     # paste your key
npx wrangler deploy                          # prints https://novafit-ai-proxy.<you>.workers.dev
```

Then add the printed URL as the GitHub Actions secret `VITE_AI_PROXY_URL` and
push to `staging`. For local dev, put it in `.env` as `VITE_AI_PROXY_URL`.
