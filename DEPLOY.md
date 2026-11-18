# COIN WORLD — Deploy va Telegram Mini App Qo‘llanmasi

Ushbu qo‘llanma **COIN WORLD** loyihasini serverga joylashtirish (Cloud Run, VPS yoki Docker) va `@BotFather` orqali Telegram Mini App sifatida ishga tushirish bosqichlarini o‘z ichiga oladi.

## 1. Muhit o‘zgaruvchilarini sozlash (`.env`)

`.env.example` faylidan nusxa olib `.env` yarating (hech qachon `.env` faylini Git yoki ZIP arxivga qo‘shmang):

```bash
cp .env.example .env
```

Asosiy qiymatlar:
- `NODE_ENV=production`
- `PORT=3000`
- `APP_URL=https://sizning-domeningiz.uz` (HTTPS majburiy)
- `TELEGRAM_BOT_TOKEN=` (`@BotFather` dan olingan token — **faqat serverda saqlanadi**)
- `TELEGRAM_BOT_USERNAME=CoinWorldUzBot` (`@` belgisiz)
- `ADMIN_TELEGRAM_IDS=123456789` (Admin huquqiga ega Telegram ID lar, vergul bilan)
- `TELEGRAM_WEBHOOK_SECRET=kuchli_tasodifiy_kalit`
- `ALLOW_DEMO_MODE=false` (Ishlab chiqarishda faqat haqiqiy Telegram foydalanuvchilari uchun)

## 2. Node.js 22 orqali ishga tushirish (VPS)

```bash
npm install
npm run build
npm start
```

## 3. Docker / Cloud Run orqali ishga tushirish

```bash
docker build -t coin-world:latest .
docker run -d \
  --name coin-world \
  -p 3000:3000 \
  --env-file .env \
  coin-world:latest
```

Google Cloud Run uchun:
```bash
gcloud run deploy coin-world \
  --source . \
  --port 3000 \
  --allow-unauthenticated
```

## 4. @BotFather va Telegram Webhook sozlash

1. `@BotFather` da `/newapp` yoki `/setmenubutton` orqali **Web App URL** sifatida `https://sizning-domeningiz.uz` ni kiriting.
2. Webhook ni faollashtiring:
```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://sizning-domeningiz.uz/api/telegram/webhook","secret_token":"<TELEGRAM_WEBHOOK_SECRET>"}'
```
3. `https://sizning-domeningiz.uz/api/health` manzilida `"botConfigured": true` qaytayotganini tekshiring.
