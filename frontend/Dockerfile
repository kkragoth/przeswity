FROM node:22-alpine AS builder
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY shared/editor-schema/package.json ./shared/editor-schema/
RUN npm ci
COPY . .
RUN npm run build:shared
RUN npm -w frontend run build

FROM nginx:alpine AS runner
COPY --from=builder /repo/frontend/dist /usr/share/nginx/html
EXPOSE 80
