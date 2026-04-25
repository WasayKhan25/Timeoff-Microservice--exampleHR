# Time-Off Microservice Repository

This repository contains the backend implementation for a robust Time-Off Microservice built with NestJS, TypeScript, and SQLite.

## Project Structure
- `time-off-service/`: Contains the actual NestJS application and source code.
- `TRD.md`: The complete architecture design document and challenge consideration analysis.

## Overview
The Time-Off Microservice is designed to manage employee time-off requests while syncing balances with an external Human Capital Management (HCM) system.
It utilizes a local cache using SQLite to ensure fast read-times and defensively protects against external system downtime or slow API responses.

## Setup Instructions

1. **Navigate to the service directory:**
   ```bash
   cd time-off-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Running the application**
   ```bash
   # development
   npm run start

   # watch mode
   npm run start:dev
   ```
   The application runs on `http://localhost:3000` by default.

## Testing

Navigate into the `time-off-service` directory to run the test suite:

```bash
cd time-off-service

# Unit Tests
npm run test

# End-to-End Tests
npm run test:e2e
```

## Architecture highlights
- **Defensive Local Validation**: Does not arbitrarily forward requests to the HCM without verifying local caches first.
- **Optimistic Updates**: Locally deducts balances while firing an asynchronous sync request to the Mock HCM. If the HCM sync fails, it automatically rolls back the local balance and marks the request as `FAILED_SYNC`.
- **Batch Processing**: Contains webhooks to effortlessly sync bulk updates from the HCM seamlessly without conflict.
