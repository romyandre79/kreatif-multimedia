# ==========================================
# Multi-stage Dockerfile: Kreatif Multimedia Web App
# ==========================================

# Stage 1: Build Frontend
FROM node:20-alpine AS builder
WORKDIR /app

# Cache dependencies
COPY package*.json ./
RUN npm ci || npm install

# Copy source & build
COPY . .
RUN npm run build

# Stage 2: Serve dengan Nginx Alpine
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Hapus default page
RUN rm -rf ./*

# Copy build artifacts dari builder
COPY --from=builder /app/dist .

# Copy custom Nginx configuration
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
