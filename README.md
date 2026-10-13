# Reflex Duel: 2D Reaction Battle

Онлайн-дуэль на скорость реакции: React + Vite на клиенте, Express + WebSocket (`/ws`) на сервере.
Матчмейкинг, приватные комнаты по коду, фальстарты и раунды до 3 побед считает сервер.

## Локальный запуск

```bash
npm install
npm run dev          # http://localhost:3000 (Vite в режиме middleware)
```

Production-сборка:

```bash
npm run build        # dist/ (клиент) + server.js (сервер, собирается esbuild)
npm start            # NODE_ENV=production node server.js
```

## Деплой на Railway

1. Запушьте репозиторий на GitHub.
2. Railway → **New Project** → **Deploy from GitHub repo** → выберите этот репозиторий и ветку.
3. Railway сам возьмёт настройки из `railway.json`: `npm run build`, `npm start`, healthcheck `/api/health`.
   Переменную `PORT` Railway подставляет автоматически.
4. Сервис → **Settings → Networking → Generate Domain**: получите публичный адрес вида `https://<name>.up.railway.app`.
5. (Необязательно) переменная `APP_URL` с публичным адресом, если подключили свой домен.

WebSocket работает через тот же домен (`wss://<domain>/ws`), отдельная настройка не нужна.

## Важно знать

- Состояние комнат хранится в памяти сервера: запускайте **одну реплику**; при перезапуске идущие матчи обрываются.
- Профили, рейтинг, таблица лидеров и «админ»-вход хранятся в `localStorage` браузера каждого игрока,
  то есть общей таблицы лидеров между игроками нет.
