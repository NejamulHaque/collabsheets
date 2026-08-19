# ---------- CollabSheets all-in-one ----------
FROM node:20-alpine
WORKDIR /app

# 1) Frontend: install deps + build
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm install --no-audit --no-fund
COPY client/ ./client/
RUN cd client && npm run build

# 2) Backend: prod deps only
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev --no-audit --no-fund

# 3) Runtime
COPY server/ ./server/
EXPOSE 8080
CMD ["sh", "-c", "cd server && exec node server.js"]