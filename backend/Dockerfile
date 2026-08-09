# =========================
# 1. Build stage
# =========================
FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --no-audit --no-fund

COPY . .

RUN npm run build


# =========================
# 2. Production dependencies
# =========================
FROM node:24-bookworm-slim AS prod-deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev --no-audit --no-fund


# =========================
# 3. Production image
# =========================
FROM node:24-bookworm-slim AS production

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

RUN groupadd --system haymclub \
 && useradd --system \
      --gid haymclub \
      --create-home \
      haymclub

COPY --chown=haymclub:haymclub \
  --from=prod-deps \
  /app/package.json ./

COPY --chown=haymclub:haymclub \
  --from=prod-deps \
  /app/package-lock.json ./

COPY --chown=haymclub:haymclub \
  --from=prod-deps \
  /app/node_modules ./node_modules

COPY --chown=haymclub:haymclub \
  --from=build \
  /app/dist ./dist

RUN mkdir -p \
      /app/uploads/trainees \
      /app/storage/gallery \
      /app/storage/workflow-feedback \
 && chown -R haymclub:haymclub \
      /app/uploads \
      /app/storage

USER haymclub

EXPOSE 3000

HEALTHCHECK \
  --interval=30s \
  --timeout=5s \
  --start-period=20s \
  --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/src/main.js"]
