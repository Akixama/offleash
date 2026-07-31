# Offleash

Offleash is a persistent animal-society simulation. Every visitor observes the same evolving Maplewood neighborhood, while each browser has its own two-nudge allowance, word discoveries, and influence history.

## Run it locally

1. Install Node.js 22 or newer.
2. Create a free Postgres database with Neon, Vercel Postgres, Supabase, or another Postgres provider.
3. Copy `.env.example` to `.env.local` and replace the sample value with your database connection string.
4. Run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The database tables are created automatically on the first visit.

## Deploy to Vercel

1. Put this folder in a GitHub repository.
2. In Vercel, choose **Add New → Project** and import that repository.
3. Add a Postgres database from the Vercel Marketplace, or use any existing Postgres database.
4. In **Project Settings → Environment Variables**, add `DATABASE_URL` with the database connection string.
5. Deploy. No custom build command or output directory is needed.

Each browser receives an anonymous ID stored in local storage. Clearing browser storage creates a fresh player profile. The simulated neighborhood itself is shared by all visitors.

## Hosting elsewhere

This is a standard Next.js application. It can also run on Netlify or any Node.js host that supports Next.js and provides the `DATABASE_URL` environment variable.
