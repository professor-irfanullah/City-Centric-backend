FROM ghcr.io/puppeteer/puppeteer:latest

USER root

# Install curl so Coolify health checks can work
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

RUN npm install --production

COPY . .

# Change to match your server.js port
EXPOSE 4000
# Add this HEALTHCHECK instruction
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD curl -f -H "Origin: http://localhost:4000" http://localhost:4000/api/auth/test || exit 1


CMD [ "node", "server.js" ]
