# Dockerfile for MintroAI DApp
FROM node:18-alpine

# Install dependencies for better compatibility and native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Clean install without lock file to avoid conflicts
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
