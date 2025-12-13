# Sanity GraphQL Mock Server
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (including tsx for TypeScript execution)
RUN npm install

# Copy source files
COPY schema.ts ./
COPY data.ts ./
COPY server.ts ./

# Expose GraphQL server port
EXPOSE 4000

# Start server with tsx
CMD ["npx", "tsx", "server.ts"]
