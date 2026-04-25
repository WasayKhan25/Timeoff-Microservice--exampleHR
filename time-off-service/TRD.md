# Technical Requirement Document (TRD): Time-Off Microservice

## 1. Introduction
The Time-Off Microservice manages employee time-off requests and balances, bridging the gap between our internal platform (ExampleHR/ReadyOn) and the third-party Human Capital Management (HCM) system, which acts as the ultimate Source of Truth. 

## 2. Goals & Product Context
*   **Accurate Tracking:** Employees should see an accurate time-off balance.
*   **Request Management:** Employees and managers can request and approve time off knowing the underlying data is reliable.
*   **Robust Syncing:** Keep ExampleHR and the HCM in sync despite external changes (e.g., annual refresh, work anniversaries).
*   **Resiliency:** The system must handle unreliable responses from the HCM system defensively.

## 3. Architecture Overview
*   **Framework:** NestJS (Node.js/TypeScript) for a modular, maintainable, and scalable backend.
*   **Database:** SQLite, interacted with via an ORM (TypeORM) to store local caches of balances and manage request states.
*   **Components:**
    *   **Time-Off API:** REST endpoints for clients to view balances and submit requests.
    *   **HCM Sync Service:** Background service/workers responsible for real-time and batch syncing with the HCM.
    *   **Mock HCM Server:** An internal set of endpoints used strictly for testing and simulating the HCM's behavior.

## 4. Data Model (SQLite)
*   **Employee:** `id`, `name`, `locationId`
*   **Location:** `id`, `name`
*   **TimeOffBalance:** `id`, `employeeId`, `locationId`, `balanceDays`, `lastSyncedAt`
*   **TimeOffRequest:** `id`, `employeeId`, `daysRequested`, `status` (PENDING, APPROVED, REJECTED, FAILED_SYNC), `createdAt`

*Note: Balances are explicitly tracked per-employee, per-location as per requirements.*

## 5. API Design (Internal Microservice)
*   `GET /balances/:employeeId/:locationId` - Retrieve the current available balance for an employee. (Fetches locally, may trigger a background sync).
*   `POST /requests` - Submit a new time-off request. 
*   `POST /webhooks/hcm/batch-sync` - Endpoint for the HCM to push batch balance updates to our system.

## 6. Synchronization Strategy
*   **Local Caching with Lazy Refresh:** When a balance is requested, we serve the local cache. If the cache is deemed "stale" (older than a threshold), we asynchronously fetch the real-time balance from the HCM to update the local store.
*   **Optimistic Updates with Rollback:** When a request is created, we deduct the balance locally and set the request to `PENDING`. We then attempt to sync the deduction with the HCM. If the HCM returns an error (or lacks balance), we roll back the local deduction and mark the request as `FAILED_SYNC`.
*   **Batch Ingestion:** When the HCM sends a batch payload, we bulk upsert the `TimeOffBalance` table, effectively overriding our local cache with the Source of Truth.

## 7. Challenges & Suggested Solutions
*   **Challenge:** HCM updates balances independently (anniversaries, year-end).
    *   **Solution:** We rely on the HCM's batch endpoint to push these updates to us. To cover gaps, we implement a periodic background cron job that requests real-time syncs for active employees.
*   **Challenge:** HCM fails to send errors for invalid dimensions or insufficient balances.
    *   **Solution:** **Defensive Local Validation.** We maintain a strict local ledger. Before sending a request to the HCM, we validate it against our *local* balance. If our local balance says 0, we reject the request immediately without hitting the HCM. If the HCM succeeds but our local balance was wrong, we resync the specific employee.
*   **Challenge:** Network partitions or HCM downtime.
    *   **Solution:** Implement a retry mechanism with exponential backoff for outbound HCM requests. Store requests in a queue to process them when the HCM is back online.

## 8. Alternatives Considered
*   **Alternative 1: Direct Pass-through to HCM (No Local DB).**
    *   *Pros:* Always 100% accurate, no syncing logic required.
    *   *Cons:* Highly dependent on HCM uptime and latency. Fails the requirement to handle batch endpoints.
    *   *Decision:* Rejected in favor of local caching.
*   **Alternative 2: Event-Driven Architecture (Kafka/RabbitMQ) for Sync.**
    *   *Pros:* Extremely robust for distributed systems.
    *   *Cons:* Overkill for the scope of a take-home assessment specifying SQLite.
    *   *Decision:* Rejected. Will use simple async promises or a lightweight database-backed queue.

## 9. Testing Strategy (Agentic Rigor)
*   **Mock HCM Module:** A dedicated NestJS module that simulates the HCM. It will have state (in-memory or separate SQLite tables) and endpoints (`/mock-hcm/balance`, `/mock-hcm/deduct`). We will configure it to occasionally throw errors, ignore invalid data, or simulate latency to test our defensive programming.
*   **Unit Tests (Jest):** Thoroughly test the calculation logic, validation logic, and state machine of a TimeOffRequest.
*   **E2E Tests (Supertest):** Test the full flow.
