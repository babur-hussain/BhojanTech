# Indian Restaurant Management System

A production-grade, multi-tenant monorepo for managing an Indian Restaurant.

## Tech Stack
- **Monorepo:** pnpm + Turborepo
- **Backend:** Node.js, Express.js, Socket.io, Mongoose (MongoDB Atlas), ioredis (Redis)
- **Frontend (Web):** React 18, Vite, Tailwind CSS (Manager & Kitchen Staff UI)
- **Frontend (Mobile):** React Native, Expo (Waiter App)
- **Cloud & Auth:** Firebase Auth, AWS S3, Razorpay, Anthropic Claude
- **Local Dev:** Docker Compose

## Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker & Docker Compose (for local DB/Redis)

## Setup Instructions

### 1. Install Dependencies
Run the following at the root to install all workspace dependencies:
```bash
pnpm install
```

### 2. Environment Variables
Copy the `.env.example` file in the backend app to `.env` and fill in your actual credentials.
```bash
cp apps/backend/.env.example apps/backend/.env
```

### 3. Start Local Infrastructure (MongoDB & Redis)
Ensure Docker is running, then start the databases:
```bash
pnpm run docker:up
```

### 4. Run the Dev Servers
Start the backend, web, and mobile apps concurrently:
```bash
pnpm run dev
```
Alternatively, you can run them individually:
- Backend: `pnpm run dev:backend`
- Web: `pnpm run dev:web`
- Mobile: `pnpm run dev:mobile`

## Multi-Tenant Architecture
This system is designed for multi-tenancy. Every restaurant is isolated by its `restaurantId`. The MongoDB schema requires this field for all business logic collections (orders, menu items, etc.). 

## Styling and Theming
The UI uses a specific Indian-inspired color palette:
- Saffron: `#FF9933` (Primary accents)
- Deep Maroon: `#800000` (Text & buttons)
- Turmeric Yellow: `#FFC300` (Highlights)
- Warm Cream: `#FFF8F0` (Backgrounds)
