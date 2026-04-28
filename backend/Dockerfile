FROM node:22-alpine AS builder
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY shared/editor-schema/package.json ./shared/editor-schema/
RUN npm ci
COPY . .
RUN npm run build:shared
RUN npm -w backend run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /repo/node_modules /app/node_modules
COPY --from=builder /repo/shared /app/shared
COPY --from=builder /repo/backend/package.json /app/backend/
COPY --from=builder /repo/backend/dist /app/backend/dist
WORKDIR /app/backend
EXPOSE 8080
CMD ["node", "dist/index.js"]
