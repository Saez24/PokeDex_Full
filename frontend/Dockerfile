# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Dependencies zuerst (Layer-Cache)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Quellcode kopieren + Production-Build
COPY . .
RUN npm run build -- --configuration=production

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

LABEL maintainer="Saez24" \
      description="Production Angular SPA for PokéDex"

# Nginx-Konfiguration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Angular-Build kopieren (Output-Pfad: dist/pokedex_angular/browser)
COPY --from=builder /app/dist/pokedex_angular/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://localhost/ || exit 1
