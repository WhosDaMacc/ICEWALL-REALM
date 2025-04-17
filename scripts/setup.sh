#!/bin/bash

# Install dependencies
npm install

# Install TypeScript type definitions
npm install --save-dev @types/node @types/express @types/cors @types/helmet @types/express-rate-limit @types/body-parser @types/winston @types/nodemailer @types/class-validator

# Create necessary directories
mkdir -p src/entities
mkdir -p src/database/migrations
mkdir -p src/routes
mkdir -p src/middleware
mkdir -p src/exceptions
mkdir -p logs

# Initialize database
createdb icewall_realm

# Run migrations
npm run migrate

# Build the project
npm run build

echo "Setup completed successfully!" 