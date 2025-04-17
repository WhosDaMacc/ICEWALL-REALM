@echo off

REM Install dependencies
npm install

REM Install TypeScript type definitions
npm install --save-dev @types/node @types/express @types/cors @types/helmet @types/express-rate-limit @types/body-parser @types/winston @types/nodemailer @types/class-validator

REM Create necessary directories
mkdir src\entities
mkdir src\database\migrations
mkdir src\routes
mkdir src\middleware
mkdir src\exceptions
mkdir logs

REM Initialize database
createdb icewall_realm

REM Run migrations
npm run migrate

REM Build the project
npm run build

echo Setup completed successfully! 