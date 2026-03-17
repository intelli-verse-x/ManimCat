# ManimCat Deployment Guide

English | [简体中文](https://github.com/Wing900/ManimCat/blob/main/DEPLOYMENT.zh-CN.md)

This document covers three deployment paths:

- local native deployment
- local Docker deployment
- Hugging Face Spaces deployment with Docker

## 1. Local Native Deployment

### Prerequisites

1. Node.js 18+
2. Redis running on `localhost:6379` or equivalent
3. Python / Manim runtime
4. LaTeX (`texlive`)
5. `ffmpeg`
6. `Xvfb`

### Setup

```bash
git clone https://github.com/yourusername/ManimCat.git
cd ManimCat
cp .env.example .env
```

Configure at least one AI source:

```env
MANIMCAT_ROUTE_KEYS=user_key_a,user_key_b
MANIMCAT_ROUTE_API_URLS=https://api-a.example.com/v1,https://api-b.example.com/v1
MANIMCAT_ROUTE_API_KEYS=sk-a,sk-b
MANIMCAT_ROUTE_MODELS=qwen3.5-plus,gemini-3-flash-preview
```

Optional:

```env
LOG_LEVEL=info
PROD_SUMMARY_LOG_ONLY=false
```

Install dependencies:

```bash
npm install
cd frontend && npm install
cd ..
```

Build and start:

```bash
npm run build
npm start
```

Open: `http://localhost:3000`

---

## 2. Local Docker Deployment

### Prerequisites

1. Docker 20.10+
2. Docker Compose 2.0+

### Setup

```bash
cp .env.production .env
```

Set at least one AI source:

```env
MANIMCAT_ROUTE_KEYS=user_key_a,user_key_b
MANIMCAT_ROUTE_API_URLS=https://api-a.example.com/v1,https://api-b.example.com/v1
MANIMCAT_ROUTE_API_KEYS=sk-a,sk-b
MANIMCAT_ROUTE_MODELS=qwen3.5-plus,gemini-3-flash-preview
```

Recommended production settings:

```env
NODE_ENV=production
LOG_LEVEL=info
PROD_SUMMARY_LOG_ONLY=true
```

Build and run:

```bash
docker-compose build
docker-compose up -d
```

Open: `http://localhost:3000`

---

## 3. Hugging Face Spaces Deployment

### Notes

- Use a Docker Space
- Default port is `7860`
- Environment variables must be configured in Space Settings, not only in repo files
- Seeing `injecting env (0) from .env` in startup logs is normal and does not mean Space variables failed

### Steps

1. Clone your Space repository:

```bash
git clone https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
cd YOUR_SPACE_NAME
```

2. Copy the project into the Space repo and use the Hugging Face Dockerfile when applicable.

3. In Space Settings, configure at least:

```env
PORT=7860
NODE_ENV=production
```

And one AI source:

```env
MANIMCAT_ROUTE_KEYS=user_key_a,user_key_b
MANIMCAT_ROUTE_API_URLS=https://api-a.example.com/v1,https://api-b.example.com/v1
MANIMCAT_ROUTE_API_KEYS=sk-a,sk-b
MANIMCAT_ROUTE_MODELS=qwen3.5-plus,gemini-3-flash-preview
```

Recommended production logging:

```env
NODE_ENV=production
LOG_LEVEL=info
PROD_SUMMARY_LOG_ONLY=true
```

4. Commit and push:

```bash
git add .
git commit -m "Deploy ManimCat"
git push
```

Open: `https://YOUR_SPACE.hf.space/`

---

## 4. Key-Based Upstream Routing

When you want different users to always hit different upstream providers, configure:

```env
MANIMCAT_ROUTE_KEYS=user_key_a,user_key_b
MANIMCAT_ROUTE_API_URLS=https://api-a.example.com/v1,https://api-b.example.com/v1
MANIMCAT_ROUTE_API_KEYS=sk-a,sk-b
MANIMCAT_ROUTE_MODELS=qwen3.5-plus,gemini-3-flash-preview
```

Rules:

1. All four variables support comma-separated or newline-separated values.
2. `MANIMCAT_ROUTE_KEYS` is the primary index.
3. Entries without `apiUrl` or `apiKey` are skipped.
4. Empty `model` disables that key (backend is reachable but no model is available).
5. `MANIMCAT_ROUTE_KEYS` also acts as the auth whitelist.

Priority:

1. request body `customApiConfig` (when enabled on the frontend)
2. `MANIMCAT_ROUTE_*` matching the current Bearer key

---

## 5. Frontend Multi-Profile Custom API

The frontend settings page still supports multiple `url/key/model/manimcatKey` profiles with round-robin selection per browser session.

Use that when a single user wants to manage multiple upstreams locally.

If you want stable upstream routing per user, prefer server-side `MANIMCAT_ROUTE_*`.

---

## 6. Generation History (Optional, Supabase)

ManimCat supports persistent generation history powered by Supabase. Only text data is stored (prompt, generated code, metadata). Videos and images are **not** stored in the database.

### Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the migration SQL in the Supabase SQL Editor:

```sql
-- File: src/database/migrations/001_create_history.sql
create table if not exists history (
  id          uuid primary key default gen_random_uuid(),
  client_id   text not null,
  prompt      text not null,
  code        text,
  output_mode text not null check (output_mode in ('video', 'image')),
  quality     text not null check (quality in ('low', 'medium', 'high')),
  status      text not null check (status in ('completed', 'failed')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_history_client_created
  on history (client_id, created_at desc);
```

3. Add the following environment variables:

```env
ENABLE_HISTORY_DB=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

When `ENABLE_HISTORY_DB` is `false` (the default), the history API returns empty results and no database connection is made.
