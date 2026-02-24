# ── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Vite env vars must be baked in at build time
ARG VITE_OPENROUTER_KEY
ARG VITE_HF_TOKEN
ARG VITE_IMGBB_KEY
ARG VITE_CHAT_MODEL
ARG VITE_IMAGE_MODEL
ARG VITE_API_URL=/prompterest
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build:web

# ── Serve stage ───────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
