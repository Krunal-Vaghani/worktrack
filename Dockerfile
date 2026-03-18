FROM node:20-alpine
WORKDIR /app

# Build admin dashboard
COPY admin-dashboard/package.json ./admin-dashboard/
RUN cd admin-dashboard && npm install --legacy-peer-deps

COPY admin-dashboard/ ./admin-dashboard/
RUN cd admin-dashboard && npm run build

# Install server
COPY admin-server/package.json ./admin-server/
RUN cd admin-server && npm install --production

COPY admin-server/ ./admin-server/

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "/app/admin-server/server.js"]
