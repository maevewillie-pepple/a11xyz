FROM mcr.microsoft.com/playwright:v1.62.1-noble

WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 3000

CMD ["node", "server/index.js"]
