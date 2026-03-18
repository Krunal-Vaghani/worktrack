FROM node:20-alpine
WORKDIR /app

# Install and build admin-dashboard first
COPY admin-dashboard/package*.json ./admin-dashboard/
RUN cd admin-dashboard && npm ci

COPY admin-dashboard/ ./admin-dashboard/
RUN cd admin-dashboard && npm run build

# Install server deps
COPY admin-server/package*.json ./admin-server/
RUN cd admin-server && npm ci --production

# Copy server source
COPY admin-server/ ./admin-server/

EXPOSE 3001
CMD ["node", "admin-server/server.js"]
