# Use a slim image to save RAM
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Match this to your Express port (usually 3000 or 8080)
EXPOSE 3000

# Start the app
CMD [ "node", "index.js" ]
