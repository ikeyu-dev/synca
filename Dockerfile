FROM node:20-slim

# Puppeteer用のChromium依存パッケージをインストール
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-ipafont-mincho \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# PuppeteerにインストールされたChromiumを使用させる
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
