# ReForge Frontend

The frontend is intentionally plain HTML, CSS, and vanilla JavaScript. It has no React, Vite, or runtime npm dependencies.

## Local development

```bash
cd frontend
python3 -m http.server 5173
```

Open <http://localhost:5173>.

The backend allows `http://localhost:5173` in CORS. Do not open `index.html` with `file://`, because browser CORS behavior can block backend API requests.

## API configuration

The backend URL is configured in `js/config.js`:

```js
window.REFORGE_CONFIG = {
  API_URL: "https://reforge-api.onrender.com",
};
```

For local development against the local backend, temporarily set it to `http://localhost:8000`.

## Render deployment

The existing Render Static Site configuration can continue using the compatibility build:

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

The current `npm run build` script only copies `index.html`, `css/`, `js/`, and `assets/` into `dist/`. It does not run React or Vite.

After confirming the frontend works, Render can optionally be simplified to a no-build static deployment:

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Build Command | `echo "No build needed"` |
| Publish Directory | `.` |

Do not remove `package.json` while the existing Render build configuration still depends on `npm run build`.

## Supported application flows

- Anonymous code reviews through `POST /review`
- Authenticated dashboard reviews through `POST /review` with bearer authentication
- Account registration through `POST /auth/register`
- Login through `POST /auth/login`
- Current-user lookup through `GET /auth/me`
- Review history through `GET /history` and `GET /history/{review_id}`
- Clear history through `DELETE /history`
- Delete account through `DELETE /account`

Sessions use the existing `reforge_session` localStorage key.
