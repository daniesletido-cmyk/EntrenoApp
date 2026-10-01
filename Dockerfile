# EntrenoApp - Dockerfile para despliegue en Railway / Cloud
# 1. Instalar dependencias
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit

# 2. Compilar aplicación Next.js
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
RUN node scripts/copy-standalone-assets.mjs

# 3. Imagen final de ejecución
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV ENTRENO_DATA_DIR=/data
ENV NEXT_TELEMETRY_DISABLED=1

# Crear carpeta de datos persistentes (volumen de Railway)
RUN mkdir -p /data

# Copiar artefactos del servidor standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/seed ./seed

EXPOSE 3000

CMD ["node", "server.js"]
