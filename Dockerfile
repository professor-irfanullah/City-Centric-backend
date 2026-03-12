# We need a heavier base for Puppeteer's browser requirements
FROM ghcr.io/puppeteer/puppeteer:latest

USER root

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
# Puppeteer needs to skip downloading its own chrome because we use the one in the image
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

RUN npm install --production

# Bundle app source
COPY . .

# Match your Express port
EXPOSE 3000

# Start the app using server.js
CMD [ "node", "server.js" ]
