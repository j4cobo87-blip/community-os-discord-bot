FROM node:20-alpine

WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm i --omit=dev; fi

# Copy source
COPY src ./src

# Data dir for persistence
RUN mkdir -p /app/data

CMD ["node", "src/index.js"]
