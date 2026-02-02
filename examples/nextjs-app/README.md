# passfort Example – Walkthrough

This example shows how to protect specific routes in a Next.js app with a password. No Vercel Pro required.

## Step 1: Install dependencies

From the **project root** (passfort/):

```bash
pnpm install           # Install all workspace deps
pnpm run build         # Build the package
cd examples/nextjs-app
pnpm run dev           # Run the example
```

Or if using the published npm package:

```bash
npx create-next-app@latest my-app --typescript
cd my-app
pnpm add passfort
# or: npm install passfort
```

## Step 2: Add the middleware

Create or update `middleware.ts` at your **project root** (same level as `app/`):

```typescript
import { withPasswordProtect } from 'passfort/next';

export default withPasswordProtect({
  paths: ['/admin', '/dashboard', '/protected'],
});

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/protected/:path*'],
};
```

**What this does:**

- `paths` – Which route prefixes require a password
- `matcher` – Tells Next.js when to run the middleware (reduces overhead)

## Step 3: Set environment variables

Copy the example and add your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
PASSFORT_PASSWORD=changeme
PASSFORT_SECRET=your-secret-min-16-chars
```

- **PASSFORT_PASSWORD** – The password users must enter (use a hash in production)
- **PASSFORT_SECRET** – Min 16 chars, for signing session cookies. Generate: `openssl rand -base64 24`

> `PASSWORD_PROTECT_*` env vars also work for backward compatibility.

## Step 4: Run locally

```bash
pnpm run dev
```

Open:

- `http://localhost:3000` – Public, no password
- `http://localhost:3000/admin` – Protected; you'll see the password form

Enter `changeme` (or whatever you set). After success, you'll be redirected to `/admin` and stay logged in via a cookie.

## Step 5: Deploy to Vercel

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add env vars: **Settings → Environment Variables**
   - `PASSFORT_PASSWORD` (or `PASSFORT_HASH` for production)
   - `PASSFORT_SECRET`
4. Deploy

Protected routes will ask for the password on every deployment.

## Production: Use a password hash

For production, avoid storing the plain password:

```bash
npx passfort hash "your-secure-password"
```

Add the output as `PASSFORT_HASH` in Vercel. Remove `PASSFORT_PASSWORD`.

## Protecting the entire site

To protect everything except static assets:

```typescript
export default withPasswordProtect({
  protectAll: true,
  excludePaths: ['/login'],
});

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
```

## Customizing the form

**In middleware.ts:**

```typescript
withPasswordProtect({
  paths: ['/admin'],
  form: {
    title: 'Preview Access',
    description: 'Enter the key to view this preview.',
    theme: 'light', // or 'dark'
  },
});
```

**Or via env vars:** `PASSFORT_FORM_TITLE`, `PASSFORT_FORM_DESCRIPTION`, `PASSFORT_FORM_THEME` (light/dark), etc.

## Project structure

```
examples/nextjs-app/
├── middleware.ts      # Password protection – runs before every matched request
├── app/
│   ├── page.tsx       # Public
│   ├── admin/         # Protected
│   │   └── page.tsx
│   └── dashboard/     # Protected
│       └── page.tsx
├── .env.local         # Your secrets (not committed)
└── .env.example       # Template
```
