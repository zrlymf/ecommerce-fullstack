# 🧠 Belanjain Backend API

This is the server-side application for the Belanjain E-commerce platform. It handles business logic, database transactions (Prisma), authentication, and scheduled tasks.

## 🛠️ Tech Stack
* **Framework:** NestJS (Node.js)
* **Language:** TypeScript
* **Database:** MySQL via Prisma ORM
* **Auth:** JWT (Passport module)
* **Task Scheduling:** `@nestjs/schedule` (Cron Jobs)

## ⚙️ Environment Variables (.env)
Create a `.env` file in the `backend` folder and configure the following:

```env
# Database Connection
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE_NAME"

# Authentication
JWT_SECRET="your_super_secret_key"
JWT_REFRESH_SECRET="your_refresh_secret_key"
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# Email Service (SMTP)
MAIL_HOST="smtp.gmail.com"
MAIL_USER="your_email@gmail.com"
MAIL_PASS="your_app_password"

# Server Port
PORT=3000

## 🚀 Running the App

# Install Dependencies
pnpm install

# Database Migration
npx prisma generate
npx prisma migrate dev --name init

# Start Server
pnpm run start:dev

The API will be available at http://localhost:3000.

## 🧪 Testing

# Unit tests
pnpm run test

# End-to-End tests
pnpm run test:e2e
