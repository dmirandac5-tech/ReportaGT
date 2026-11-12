# ReportaGT — imagen de producción
# Build multi-stage: compila better-sqlite3 (nativo) en una capa separada
# de la imagen final, para que quede lo más liviana posible.

FROM node:22-alpine AS builder
WORKDIR /app
# Herramientas de compilación que better-sqlite3 necesita para su parte nativa
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copiamos node_modules ya compilado y el código de la app
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY server.js ./
COPY src ./src
COPY public ./public

# Carpetas de datos persistentes (se montan como volúmenes en Kubernetes)
RUN mkdir -p /app/uploads /app/dbdata && chown -R node:node /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/config', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
