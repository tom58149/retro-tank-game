# Stage 1: Build the client-side game bundle
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . .

ARG VITE_SENTRY_DSN=""
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

RUN npm run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine

RUN rm -rf /etc/nginx/conf.d/*

# Provide standard Cloud Run Nginx config
RUN echo 'events { worker_connections 1024; } \
http { \
    include /etc/nginx/mime.types; \
    default_type application/octet-stream; \
    sendfile on; \
    server { \
        listen 8080; \
        root /usr/share/nginx/html; \
        index index.html; \
        location / { try_files $uri $uri/ /index.html; } \
        location /healthz { return 200 "OK"; add_header Content-Type text/plain; } \
    } \
}' > /etc/nginx/nginx.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
