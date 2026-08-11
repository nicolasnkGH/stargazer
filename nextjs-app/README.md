# StarGazer — Next.js app

Next.js 16 (App Router, TypeScript, Tailwind CSS) frontend for the StarGazer dashboard. This is the production frontend, replacing the legacy vanilla JS app as part of [#209](https://github.com/nicolasnkGH/stargazer/issues/209).

## Development

```bash
npm install
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

Route handlers under `src/app/api/*` proxy to the Python/FastAPI backend in [`../api`](../api). Point them at a running backend with:

```bash
API_BACKEND=http://localhost:8181 npm run dev
```

For Docker Compose (default in .env.example) use `API_BACKEND=http://stargazer-api:8181`; for Cloud Run, set to the Cloud Run service URL.

## Build

```bash
npm run build
npm run start
```

`next.config.ts` sets `output: "standalone"` for the Docker image build (see `Dockerfile`).
