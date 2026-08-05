# StarGazer — Next.js app

Next.js 16 (App Router, TypeScript, Tailwind CSS) rewrite of the vanilla-JS dashboard in [`../web`](../web). Tracks migration issue [#209](https://github.com/nicolasnkGH/stargazer/issues/209). The legacy `web/` app stays live and untouched until this reaches parity.

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

## Build

```bash
npm run build
npm run start
```

`next.config.ts` sets `output: "standalone"` for the Docker image build (see `Dockerfile`).
