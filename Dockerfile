FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3210

COPY package*.json ./
RUN npm ci --omit=dev

COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public

EXPOSE 3210

CMD ["node", "server.js"]
