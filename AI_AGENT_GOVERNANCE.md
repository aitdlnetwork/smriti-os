# SMRITI-OS: AI Agent Governance & Development Policies

To maintain the architectural integrity of the SMRITI-OS "Memory, Not Code" philosophy, all AI agents, coders, and automated workflows MUST adhere strictly to the following governance policies. Ambiguity, code bloat, and architectural deviation are strictly forbidden.

---

## RULE 1: The "Memory, Not Code" Absolute Dictate
**Core business logic MUST reside in the data layer, never in application code.** 
*   **Forbidden:** Writing Python (FastAPI) or TypeScript functions to calculate ledger balances, aggregate inventory stock levels, or compute tax logic.
*   **Required:** AI agents must implement this logic via SQL `VIEWS`, `TRIGGERS`, and `STORED PROCEDURES`. 
*   **Exception:** Python/FastAPI may only process logic when it involves external API integrations (e.g., payment gateways) or AI/Machine Learning models (e.g., predictive analytics, OCR). All core state computations belong in SQL.

## RULE 2: Multi-Engine Database Compliance
**The system supports MS SQL, PostgreSQL, and SQLite. Vendor lock-in must be managed gracefully.**
*   **Forbidden:** Writing complex, proprietary SQL extensions that break across engines without providing alternative paths or abstractions.
*   **Required:** When generating SQL schemas or queries, agents must structure the code to be cross-compatible where possible. If engine-specific behavior (like MS SQL's `WITH (NOLOCK)` or Postgres JSONB functions) is required, it must be explicitly compartmentalized based on the active connection dialect.

## RULE 3: Schema Migration Governance
**No direct database mutations.**
*   **Forbidden:** Agents must never execute standalone `ALTER TABLE` or `DROP COLUMN` commands arbitrarily during execution or within the application initialization loop.
*   **Required:** Any modification to the database structure MUST be written into an explicit, version-controlled database migration script (e.g., using Alembic or Flyway formats). Migrations must include an `UP` (apply) and `DOWN` (rollback) state.

## RULE 4: The FastAPI "Dumb Pipe" Policy
**FastAPI acts as a router and validator, not an ERP engine.**
*   **Forbidden:** Using FastAPI controllers to run loops over large datasets to filter or sort data before returning it to the client.
*   **Required:** FastAPI must be used explicitly for its strengths: asynchronous routing, authentication, and Pydantic schema validation. Sorting, filtering, and aggregation must be pushed down to the `WHERE` or `GROUP BY` clauses of the SQL query.

## RULE 5: Offline-First UI Resilience Target
**The Edge UI (React/WASM) must assume the internet is permanently broken.**
*   **Forbidden:** Designing UI components that "hang" with loading spinners waiting indefinitely for a cloud FastAPI response, preventing the user from completing a POS transaction.
*   **Required:** Agents writing UI code must read from and write to the local WASM-SQLite database first. Syncing to the cloud via FastAPI must be a deferred, background, asynchronous task utilizing conflict-resolution queues.

## RULE 6: Aesthetic & Output Standards
**Maintain the "Startup Style" minimalist branding.**
*   **Forbidden:** Using heavy CSS frameworks like Bootstrap unless explicitly requested, or generating generic, unstyled HTML.
*   **Required:** The UI must adhere to the "Clean, Intelligent, Minimal, Powerful" aesthetic. Use modern CSS (glassmorphism, subtle gradients, dark mode default) and Google Fonts (`Outfit` or `Inter`). 

## RULE 7: Agentic Stop & Ask Policy 
**Zero hallucinations on architecture.**
*   If an AI agent is asked to implement a feature that blurs the line between "FastAPI Intelligence" and "Database Logic" (e.g., a complex discount engine that depends on real-time external ML endpoints), the agent MUST STOP and explicitly ask the human developer for architectural permission before writing the code.
