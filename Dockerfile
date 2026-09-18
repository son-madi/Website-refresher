# Multi-stage Docker build for Railway / Cloud Run / container hosting
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies first for Docker caching
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Production runtime container
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

# Copy compiled client assets and bundled server
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
