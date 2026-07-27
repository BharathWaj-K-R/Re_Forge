# ReForge Frontend

This frontend is intentionally plain HTML, CSS, and vanilla JavaScript. The old React/Vite/TypeScript implementation has been removed to keep the repository smaller and the frontend structure simpler.

## Local development

```bash
cd frontend
python3 -m http.server 5173
```

Open <http://localhost:5173>.

The backend already allows `http://localhost:5173` in CORS. Do not open `index.html` with `file://`, because browser CORS behavior can block backend API requests.

## API configuration

The backend URL is configured in `js/config.js`:

```js
window.REFORGE_CONFIG = {
  API_URL: "https://reforge-api.onrender.com",
};
```

Change that value if you need to point the frontend at a different backend.

## Render deployment

This structure supports two safe Render Static Site configurations:

### Existing Vite-style Render settings

If Render is currently configured with `frontend` as the root directory, `npm install && npm run build` as the build command, and `dist` as the publish directory, it can keep working. The new build script simply copies the static files into `dist/`.

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

### No-build static settings

You can also simplify Render later:

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Build Command | `echo "No build needed"` |
| Publish Directory | `.` |

If the frontend URL changes, update the backend Render environment variable `NEW_FRONTEND_URL` to the exact new frontend origin.

## Supported flows

- Anonymous reviews through `POST /review`
- Authenticated dashboard reviews through `POST /review` with bearer auth
- Registration, login, OTP verification, resend OTP, forgot password, and reset password through `/auth/*`
- Review history through `GET /history` and `GET /history/{review_id}`
- Clear history through `DELETE /history`
- Delete account through `DELETE /account`

Sessions use the existing `reforge_session` localStorage key.
