# Smart-X dashboard image (multi-stage build).
# Build context is this folder, e.g. from Smart-X/frontend/smartx-dashboard:
#   docker build -t smartx-dashboard .

# Build stage: compile the React + TypeScript app with Node
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first so they are cached until package*.json changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Empty base URL = the dashboard calls "/api/..." on the same address it was
# loaded from, and nginx forwards those calls to the API container.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Runs "tsc -b && vite build", output goes to /app/dist
RUN npm run build

# Serve stage: a small nginx web server with only the built static files
FROM nginx:1.27-alpine AS final
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
