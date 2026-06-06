# Timelyn

Desktop + Telegram device management system.

## Project Structure

```
timelyn/
├── server/                  # Backend (Express + Socket.IO + MongoDB + Telegram)
│   ├── src/
│   │   ├── index.js         # Entry point
│   │   ├── config/db.js     # MongoDB connection
│   │   ├── models/Device.js # Mongoose device schema
│   │   └── services/
│   │       ├── socket.js    # Socket.IO handler
│   │       └── telegram.js  # Telegram bot (inline keyboards)
│   ├── .env.example
│   └── package.json
├── client/                  # Electron desktop app
│   ├── src/
│   │   ├── main.js          # Electron main process + Socket.IO client
│   │   ├── preload.js       # Context bridge
│   │   └── renderer/        # Dark UI
│   │       ├── index.html
│   │       ├── styles.css
│   │       └── app.js
│   └── package.json
└── README.md
```

## Setup

### 1. Server

```bash
cd server
cp .env.example .env
# Edit .env — set MONGODB_URI and TELEGRAM_BOT_TOKEN
npm install
npm run dev
```

### 2. Client

```bash
cd client
npm install
npm start
```

## Environment Variables

| Variable             | Description                  | Default                                    |
| -------------------- | ---------------------------- | ------------------------------------------ |
| `PORT`               | Server port                  | `3000`                                     |
| `MONGODB_URI`        | MongoDB connection string    | `mongodb://localhost:27017/timelyn`        |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token           | —                                          |
| `CORS_ORIGIN`        | Allowed CORS origin          | `http://localhost:3000`                    |

## Telegram Bot Commands

| Button               | Action                           |
| -------------------- | -------------------------------- |
| `/start`             | Show inline keyboard             |
| 📱 My Devices        | List paired devices              |
| 🔗 Connect Device    | Enter pair code (PAIR-XXXXXXXX) to link device |
| 📊 Status            | Bot and device statistics        |

## Architecture

1. **Electron client** generates a pair code and connects to the server via Socket.IO.
2. **Server** registers the device in MongoDB and listens for connection events.
3. **User** opens Telegram bot, clicks "Connect Device", and sends the pair code.
4. **Bot** validates the code, links the device to the Telegram account.
5. **Server** sends Telegram notifications when linked devices go online/offline.

## Device Schema (MongoDB)

| Field         | Type   | Description                                     |
| ------------- | ------ | ----------------------------------------------- |
| ownerId       | String | Telegram chat ID (null if unpaired)             |
| deviceId      | String | Unique device identifier                        |
| deviceSecret  | String | 64-char hex secret (prevents impersonation)     |
| deviceName    | String | OS hostname                                     |
| pairCode      | String | Pairing code (`PAIR-` + 8 alphanumeric chars)   |
| status        | String | `online` / `offline`                            |
| socketId      | String | Active Socket.IO connection ID                  |
| paired        | Bool   | Whether device is linked to a user              |
| lastSeen      | Date   | Last activity timestamp                         |
