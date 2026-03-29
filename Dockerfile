FROM node:20-alpine

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++ 

# Copy package files first for better Docker layer caching
COPY backend/package.json backend/package-lock.json* ./

# Install dependencies
RUN npm install --production

# Copy backend source
COPY backend/ .

# Create data/upload directories
RUN mkdir -p data uploads/music uploads/covers uploads/avatars

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start server
CMD ["node", "server.js"]
