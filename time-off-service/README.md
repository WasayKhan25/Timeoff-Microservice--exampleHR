# Time-Off Microservice

This repository contains the backend implementation for a robust Time-Off Microservice built with NestJS, TypeScript, and SQLite.

## Overview
The Time-Off Microservice is designed to manage employee time-off requests while syncing balances with an external Human Capital Management (HCM) system.
It utilizes a local cache using SQLite to ensure fast read-times and defensively protects against external system downtime or slow API responses.

## Prerequisites
- **Node.js**: >= 18.x
- **npm**: >= 8.x

## Setup Instructions

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configuration**
   The application uses a local SQLite database named `time-off.sqlite` which will be automatically generated upon starting the application via TypeORM.

3. **Running the application**
   ```bash
   # development
   npm run start

   # watch mode
   npm run start:dev
   ```
   The application runs on `http://localhost:3000` by default.

## Testing

This project employs a rigorous testing suite covering unit and end-to-end integration tests.

```bash
# Unit Tests
npm run test

# End-to-End Tests
# Automatically fires up the mock HCM and syncs mock data through the entire lifecycle
npm run test:e2e

# Test Coverage
npm run test:cov
```

## Architecture highlights
- **Defensive Local Validation**: Does not arbitrarily forward requests to the HCM without verifying local caches first.
- **Optimistic Updates**: Locally deducts balances while firing an asynchronous sync request to the Mock HCM. If the HCM sync fails, it automatically rolls back the local balance and marks the request as `FAILED_SYNC`.
- **Batch Processing**: Contains webhooks to effortlessly sync bulk updates from the HCM seamlessly without conflict.

## Notes
A complete architecture design document and challenge consideration analysis is available in the `TRD.md` file located at the root directory of this repository.
