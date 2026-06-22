FROM node:18-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p data uploads

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

CMD ["node", "src/app.js"]