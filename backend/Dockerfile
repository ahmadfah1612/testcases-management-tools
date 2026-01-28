FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=0 /app/package*.json ./
COPY --from=0 /app/dist ./dist
COPY --from=0 /app/node_modules ./node_modules

EXPOSE 3001

CMD ["npm", "start"]
