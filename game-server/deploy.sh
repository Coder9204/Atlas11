#!/bin/bash
# Deploy Atlas Game Server to Cloud Run
# Usage: ./deploy.sh [project-id]

set -e

PROJECT_ID=${1:-$(gcloud config get-value project)}

if [ -z "$PROJECT_ID" ]; then
  echo "Error: No project ID specified and no default project set."
  echo "Usage: ./deploy.sh <project-id>"
  exit 1
fi

echo "Deploying Atlas Game Server to project: $PROJECT_ID"
echo ""

# Build TypeScript first
echo "Building TypeScript..."
npm run build

# Build Docker image
echo "Building Docker image..."
docker build -t gcr.io/$PROJECT_ID/atlas-game-server:latest .

# Push to Container Registry
echo "Pushing to Container Registry..."
docker push gcr.io/$PROJECT_ID/atlas-game-server:latest

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy atlas-game-server \
  --image gcr.io/$PROJECT_ID/atlas-game-server:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 80 \
  --timeout 300 \
  --session-affinity \
  --project $PROJECT_ID

echo ""
echo "Deployment complete!"
echo ""

# Get the service URL
SERVICE_URL=$(gcloud run services describe atlas-game-server \
  --region us-central1 \
  --project $PROJECT_ID \
  --format 'value(status.url)')

echo "Game Server URL: $SERVICE_URL"
echo "WebSocket endpoint: ${SERVICE_URL/https/wss}/play/{gameType}"
echo ""
echo "To connect Firebase Hosting, run:"
echo "  firebase deploy --only hosting"
