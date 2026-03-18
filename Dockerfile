FROM node:20-alpine
WORKDIR /app

# Install server deps
COPY admin-server/package*.json ./admin-server/
RUN cd admin-server && npm ci --production

# Copy server source
COPY admin-server/ ./admin-server/

# Copy pre-built dashboard (build it before docker build, or in CI)
COPY admin-dashboard/dist ./admin-dashboard/dist

EXPOSE 3001
CMD ["node", "admin-server/server.js"]
