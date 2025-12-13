# Sanity GraphQL Mock Server
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy source files
COPY schema.ts ./
COPY data.ts ./
COPY server.ts ./

# Expose GraphQL server port
EXPOSE 4000

# Start server
CMD ["npm", "start"]
