# Bmedical

Platforma eshte e ndertuar me `React + Vite` ne frontend dhe `Node.js + Express + PostgreSQL` ne backend.

## Konfigurimi

Krijo nje skedar `.env` bazuar te `.env.example`.

```env
VITE_API_ENDPOINT=/api/physio
VITE_API_TOKEN=
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/bmedical
JWT_SECRET=change-this-super-secret-key
SUPERADMIN_EMAIL=admin@bmedical.com
SUPERADMIN_PASSWORD=admin@bmedical.com
SUPERADMIN_NAME=Bmedical Super Admin
CORS_ORIGIN=https://bmedical.online
```

## Komandat

```bash
npm install
npm run dev
npm run start:api
```

## Backend

Backend-i ekspozon endpoint-in `POST /api/physio` dhe mbeshtet keto action-e:

- `admin_login`
- `login`
- `register`
- `me`
- `logout`

Superadmin-i krijohet automatikisht ne nisje nga vlerat:

- `SUPERADMIN_EMAIL`
- `SUPERADMIN_PASSWORD`
- `SUPERADMIN_NAME`

## Deploy ne VPS

1. Ekzekuto skemen PostgreSQL nga [schema.sql](C:/Users/Win10/Downloads/New%20folder%20(2)/src/db/schema.sql:1)
2. Ngrije API-ne me `npm run start:api`
3. Ne Nginx/CloudPanel proxyo ` /api/physio ` te `http://127.0.0.1:4000/api/physio`
4. Bej `npm run build` dhe ngarko build-in e frontend-it
