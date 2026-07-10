# Stage 1: Build the Node.js / React Web Application
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json tsconfig.json vite.config.ts ./
RUN npm install

# Copy source code and build the application
COPY src/ ./src/
COPY index.html ./
COPY server.ts ./
RUN npm run build

# Stage 2: Final production runtime combining Python 3.11, FFmpeg, and Node.js
FROM python:3.11-slim

# Install Node.js, FFmpeg, and essential compilation tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    ffmpeg \
    libsm6 \
    libxext6 \
    git \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create input and output directories for the video pipeline
RUN mkdir -p /app/input /app/output

# Copy Python requirements first to leverage Docker cache
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python pipeline scripts
COPY pipeline.py main.py /app/

# Copy built application assets and required production files from builder stage
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package*.json /app/

# Install production node dependencies inside the runtime container
RUN npm install --only=production

# Expose port 3000 for the Express web server
EXPOSE 3000

# Set standard volume mount points
VOLUME ["/input", "/output"]

# Production environment configurations
ENV PORT=3000
ENV NODE_ENV=production
ENV OFFLINE_MODE="false"

# Start the full-stack React + Express web server by default
CMD ["npm", "start"]
