# SMRITI-OS Architecture

SMRITI-OS is engineered to scale from a single retail store to an enterprise network without incurring prohibitive initial infrastructure costs. We achieve this by leveraging a **"Zero Upfront Cost Architecture,"** uniting best-in-class free-tier services.

## The Infrastructure Stack

1. **Cloudflare (Edge / Network)**
   - **Role:** Handles DNS routing, DDoS protection, edge caching, and SSL termination.
   - **Advantage:** Bypasses basic routing bottlenecks and secures the application at the network edge before traffic even reaches our servers.

2. **Supabase (Database / Backend API)**
   - **Role:** Provides the primary PostgreSQL database, real-time subscriptions, and built-in Authentication.
   - **Advantage:** Acts as the "Brain" of our *Memory, Not Code* philosophy. Using Postgres Views, Functions, and Triggers, all core business logic is executed right here, eliminating the need for heavy middleware. Supabase's generous free tier provides a full Postgres instance instantly.

3. **Vercel (Frontend Hosting / Serverless Edge)**
   - **Role:** Hosts the React/Next.js and WASM-powered UI for both *SmritiERP* and *SmritiBusinessPlusRetail*.
   - **Advantage:** Automates deployments with a global edge network, bringing the UI physically closer to the users and ensuring ultra-fast load times even on slow connections.

4. **GitHub (Version Control & CI/CD)**
   - **Role:** Manages source code and automates workflows via GitHub Actions.
   - **Advantage:** GitHub Actions seamlessly trigger tests, sync database schemas, and deploy code to Vercel/Supabase, creating a zero-cost, enterprise-grade deployment pipeline.

## Implementation Workflow

- **Local Development:** Run SQLite or local Docker Postgres to prototype schema changes rapidly.
- **Preview Deployments:** Committing to a GitHub PR automatically spins up a Vercel preview environment and a branching Supabase database.
- **Production:** Merging to `main` deploys the highly-optimized WASM UI to Vercel's Edge and applies schema migrations to Supabase via GitHub Actions, guarded by Cloudflare.

By stacking these tools, SMRITI-OS realizes a robust, globally available ERP platform natively designed for **maximum scale and absolute minimum startup cost.**
