FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build:backend

COPY --from=0 /app/backend/package*.json ./
COPY --from=0 /app/backend/dist ./backend/dist
COPY --from=0 /app/backend/node_modules ./backend/node_modules

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
