FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# openssl is required by the Prisma engines on Alpine
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts \
 && npm install --no-save --ignore-scripts prisma@6.19.3
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/lib/server/credentials.js ./src/lib/server/credentials.js
# /app/prisma is a persistent volume (it holds the database), so the schema and
# migrations from this image are kept elsewhere and synced in on startup.
COPY --from=builder /app/prisma ./prisma-image
RUN rm -f ./prisma-image/*.db && mkdir -p ./prisma

EXPOSE 3000
CMD ["node", "scripts/start.mjs"]
