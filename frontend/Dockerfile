# Multi-stage Dockerfile for development and production

# Development stage
FROM node:18-alpine AS development

# Instalar dependências necessárias
RUN apk add --no-cache curl

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Install ALL dependencies (including dev) for development
RUN npm config set registry https://registry.npmjs.org/ && \
    npm install --silent && \
    npm cache clean --force

# Copiar source code
COPY . .

EXPOSE 3000

# Healthcheck para desenvolvimento
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Development command with hot reload
CMD ["npm", "start"]

# Production build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Install ALL dependencies for building
RUN npm config set registry https://registry.npmjs.org/ && \
    npm install --silent && \
    npm cache clean --force

# Copiar source code
COPY . .

# Build for production
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copiar build files
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuração customizada do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Healthcheck para produção
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost || exit 1

CMD ["nginx", "-g", "daemon off;"]
