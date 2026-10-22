# SoundCart — Deployable Node.js Store

SoundCart is a responsive musical-instrument storefront built with HTML, CSS, JavaScript, Node.js and Express. The API supports products, registration/login, a cart in the browser, and demo orders. The backend uses JSON-file storage and a persistent disk when deployed using the included Render Blueprint.

## Deploy online with Render

This repository includes `render.yaml` configured for a Render Node web service with a persistent disk. **The persistent disk uses a paid Render service plan**; check Render's current pricing before confirming deployment. A persistent disk is important because user accounts and orders are stored in JSON files.

1. Extract this ZIP on your computer.
2. Create a GitHub repository and upload the *contents* of the `SoundCart-Local` folder to the repository root (so `package.json`, `server.js`, `render.yaml`, `public/`, `routes/`, `src/` and `data/` are at the root).
3. Sign in to Render and choose **New → Blueprint**.
4. Connect the GitHub repository containing `render.yaml` and create the service.
5. Review the service and disk plan/pricing, then confirm. Render generates a private `JWT_SECRET` automatically.
6. After deployment finishes, open the public `onrender.com` URL shown in Render.
7. Check `<your-service-url>/api/health`; it should return JSON with `"status":"ok"`.

If you change `render.yaml`, commit and push the changes to GitHub, then redeploy from Render.

## Run locally on Windows

1. Install Node.js 20, 22, or 24.
2. Open this folder in VS Code.
3. In the terminal, run:

   ```powershell
   npm.cmd install
   Copy-Item .env.example .env
   ```

4. Edit `.env` and replace `JWT_SECRET` with a long random secret.
5. Run `npm.cmd start` and visit `http://localhost:3000`.

## What works

- Product catalogue and product API
- Search, categories, sorting and cart in the browser
- Registration and login (passwords hashed with bcrypt)
- JWT-based API authentication
- Demo order creation and order history API
- Responsive storefront styling

## Important limitations

- **Checkout is a demo.** No real payment is taken and no payment gateway is integrated.
- The JSON-file store is appropriate for a student project/demo, not a high-traffic production shop. It does not provide database transactions or safe concurrent writes.
- Do not use real customer/payment data. For a commercial store, migrate users, inventory and orders to a database such as PostgreSQL or MongoDB, add proper operational monitoring, backups and security review, and integrate a payment provider.
- The Render Blueprint uses a persistent disk at `/var/data` so accounts and orders can survive normal restarts and redeploys. Do not run multiple server instances against the same JSON files.
- Product images are remote URLs and require an internet connection.

## Project structure

```text
SoundCart-Local/
├── data/products.json
├── public/index.html
├── public/styles.css
├── public/app.js
├── routes/api.js
├── src/store.js
├── .env.example
├── package.json
├── render.yaml
└── server.js
```
