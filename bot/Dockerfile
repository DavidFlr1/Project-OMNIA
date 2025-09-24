FROM node:18-alpine

# Install Python for logic service
RUN apk add --no-cache python3 py3-pip

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY requirements.txt ./

# Install dependencies
RUN npm install
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install -r requirements.txt

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Default environment variables (can be overridden)
ENV AGENT_PORT=3001
ENV LOGIC_PORT=4001
ENV SUBPORT=1
ENV MINECRAFT_USERNAME=MinecraftBot

# Expose dynamic ports
EXPOSE 3001-3025 4001-4025

# Default command (can be overridden)
CMD ["npm", "run", "start:combined"]





