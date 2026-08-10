#!/bin/bash

# Configuration
SERVER_IP="35.154.70.105"
USER="ec2-user"
PEM_KEY="RestroOS.pem"
REMOTE_DIR="~/restaurant-app-deployment"

echo "====================================="
echo "🚀 Starting Deployment Process..."
echo "====================================="

# Ensure the .pem file has correct permissions
chmod 400 "$PEM_KEY"

# Navigate to the root directory of the monorepo to sync the required files
cd ../../

echo "📦 Syncing code to EC2 ($SERVER_IP)..."
# We only exclude large unused folders and sync the required monorepo packages.
# We include apps/backend, packages, root configs.
rsync -avz --exclude 'node_modules' \
           --exclude '.git' \
           --exclude 'apps/web' \
           --exclude 'apps/mobile' \
           --exclude 'dist' \
           --exclude '.turbo' \
           -e "ssh -i apps/backend/$PEM_KEY -o StrictHostKeyChecking=no" \
           . $USER@$SERVER_IP:$REMOTE_DIR/

echo "🐳 Connecting to server to run Docker deployment..."
ssh -i "apps/backend/$PEM_KEY" -o StrictHostKeyChecking=no $USER@$SERVER_IP << 'EOF'

  # Go to the deployment directory
  cd ~/restaurant-app-deployment

  # 1. Ensure Docker is installed
  if ! command -v docker &> /dev/null; then
    echo "⚙️  Docker not found. Installing Docker..."
    sudo yum update -y
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
  fi

  # 2. Create the Dockerfile dynamically if it doesn't exist
  cat << 'DOCKERFILE' > Dockerfile
FROM node:20-alpine
# Install pnpm, turbo, and tsx globally
RUN npm install -g pnpm turbo tsx

WORKDIR /app

# Copy the monorepo essential files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
# Copy apps and packages
COPY apps/backend ./apps/backend
COPY packages ./packages

# Install dependencies for the monorepo
RUN pnpm install --frozen-lockfile

# Build the backend application and its packages
RUN pnpm turbo run build --filter=@restaurant/backend

# Expose backend port
EXPOSE 8080

# Command to start the app using tsx to handle workspace typescript files
CMD ["npx", "--yes", "tsx", "apps/backend/src/index.ts"]
DOCKERFILE

  # 3. Clean up old unused cache / dangling images
  echo "🧹 Clearing old cache to free up space..."
  sudo docker system prune -f

  # 4. Build the new Docker image
  echo "🔨 Building backend Docker image..."
  sudo docker build -t restaurant-backend .

  # 5. Stop and remove the old container
  echo "🛑 Stopping old container..."
  sudo docker rm -f backend-server || true

  # 6. Run the new container
  echo "🔧 Ensuring Redis is running..."
  if ! sudo docker ps | grep -q redis-server; then
    sudo docker run -d --name redis-server --restart unless-stopped -p 6379:6379 redis:alpine
  fi

  echo "🌟 Starting the new backend container..."
  # We run passing the apps/backend/.env file so credentials securely go into docker
  sudo docker run -d \
    --name backend-server \
    --restart unless-stopped \
    -p 8080:8080 \
    --env-file apps/backend/.env \
    restaurant-backend

  echo "==========================================================="
  echo "✅ Deployment Successful! Backend running on Port 8080"
  echo "==========================================================="
EOF
