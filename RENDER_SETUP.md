Render deployment checklist for ZealConnect

This file lists the exact environment variables and Render settings you should configure so the backend runs without storing secrets in the repo. Do NOT commit secrets into any files.

1. Render service settings (recommended: run backend as its own service)

- Root Directory: /backend
- Environment: Node
- Build Command: npm install
- Start Command: npm start
- Health check path (optional): /api/health
- Node Version: match your local Node (e.g. 20.x)

2. Environment variables to add in Render → Service → Environment (exact keys)

- MONGO_URI -> your MongoDB connection string (mongodb+srv://...)
- PORT -> e.g. 1234 or leave blank for Render default
- NODE_ENV -> production
- JWT_SECRET -> a long random secret used to sign tokens
- FRONTEND_URL -> https://your-vercel-domain.vercel.app
- BACKEND_URL -> https://<your-render-domain>.onrender.com
- CLOUDINARY_NAME -> (set your Cloudinary cloud name)
- CLOUDINARY_API_KEY -> (set your Cloudinary API key)
- CLOUDINARY_API_SECRET -> (set your Cloudinary API secret)
- ALLOW_VERSEL -> true (optional, allows .vercel.app origins in CORS)

Notes:

- Use the exact variable names above. The backend reads these from process.env.
- For CLOUDINARY\_\* variables: do not commit them. Add them only via the Render dashboard.

3. If you prefer single-service monorepo on Render (root = repo root)

- Root Directory: /
- Build Command: npm run install-all
  (This runs installs for backend and frontend using the root package.json)
- Start Command: npm start
- Then add the same env variables listed above.

4. Vercel (frontend) setup (build-time vars)

- In Vercel Project → Settings → Environment Variables add:
  - VITE_API_URL = https://<your-render-domain>.onrender.com/api
  - VITE_SOCKET_URL = https://<your-render-domain>.onrender.com
- These are injected at build time; after adding them, redeploy the frontend.

5. Quick verification after deployment

- Check Render build logs to confirm `npm install` succeeded in /backend and cloudinary packages installed.
- After the service starts, check the service logs for `Server running on port` and CORS logs (we added CORS debug logs).
- Test endpoints with curl or Postman:
  - GET https://<your-render-domain>.onrender.com/api/health
  - POST https://<your-render-domain>.onrender.com/api/auth/signup with JSON body {"name":"Test","email":"t@test.com","password":"pass123"}

6. Removing secrets if accidentally committed

- If you committed any secrets into files, remove them and add the file to .gitignore.
- For full removal from history use a tool like BFG or git filter-repo. See: https://rtyley.github.io/bfg-repo-cleaner/

7. Troubleshooting tips

- If `Cannot find module 'express'` appears in Render logs, make sure Build Command runs `npm install` in the correct root (see step 1/3).
- If CORS errors persist, confirm FRONTEND_URL on Render exactly matches your Vercel origin (copy from browser address bar).
- If uploads fail, check cloudinary env vars and backend logs for error details.

If you want, I can:

- Add a short `render.env.example` file (without secrets) to the repo,
- Or remove any accidentally committed secret placeholders from files for you.
