Perfect pivot. BCA app is a feature, not a product. You want *School.ai for Bharat - Multi-tenant AI OS for all schools/colleges.*

Here is senior architecture for that - this is what you pitch to judges/VCs.

### 1. Product Vision
*One platform, all institutions:* One school signs up, gets their own isolated AI campus. Teachers get MagicSchool-like tools, Students get Khanmigo-like tutor, Parents get progress bot. Works in Bengali/Hindi/English.

*Core loop:* `School Admin -> Creates Classes -> Teachers upload syllabus -> AI auto-generates lesson plans + tutor + quizzes for students`

### 2. Multi-Tenant SaaS Architecture
[ Global CDN - Cloudflare ]
          |
[ API Gateway - FastAPI + Clerk/Auth.js ]
          |
+-----------------------------------------------+
|   Tenant Router Middleware                     |
|   tenant_id = subdomain (raiganj-college.app)  |
|   All data filtered by tenant_id - 100% isolation |
+-----------------------------------------------+
          |
+---------+---------+---------+---------+
| Teacher | Student | Admin   | Parent  |
| Service | Tutor   | Service | Service |
+---------+---------+---------+---------+
          |
+-----------------------------------------------+
| AI Orchestration Layer - System One + Two      |
| Laya Cluster (Router) -> LLM Router           |
| - Laya decides: is it lesson plan? doubt?     |
|   cheating? urgent? which language?           |
| - Route to Qwen3 32B (cloud) or Qwen2 0.5B (offline app) |
+-----------------------------------------------+
          |
+-----------------------------------------------+
| Data Layer - Per Tenant Isolation             |
| Postgres (Row Level Security by tenant_id)    |
| Qdrant Cloud - collection per tenant          |
| S3 - bucket/prefix per tenant for PDFs/videos |
+-----------------------------------------------+
### 3. RBAC - 5 Roles
Role | What They See | AI Tools
Super Admin (You) | All schools, billing, usage | -
District/School Admin | Teachers, classes, analytics | AI curriculum mapper, teacher performance
Teacher | Own classes, students | Lesson plan gen, quiz gen, assignment auto-grade, Doubt inbox
Student | Own subjects, tutor | Personal tutor (Bengali/Hindi), homework helper, mock test
Parent | Child progress only | Weekly report bot in WhatsApp
### 4. AI Architecture - Hybrid (Cloud + Offline)

This is your moat vs SchoolAI:

*Cloud Mode (school has WiFi):*
Laya (on server) -> Qwen3 32B / GPT-4o-mini via OpenRouter -> full power

*Offline Mode (your USP for WB/Bihar/NE schools):*
Same API contract, but mobile app has embedded Laya 420MB + Qwen2 0.5B 380MB + SQLite-vec. Syncs when online.

One codebase, two runtimes. School.ai can't do offline.

### 5. Tech Stack - Scale Version

- *Frontend:* Next.js 14 (Super Admin + School Admin) + Expo App (Student/Teacher offline app) - One design system
- *Backend:* FastAPI monolith first (don't do microservices at 0 users) + Celery for embedding jobs
- *Auth:* Clerk - handles school subdomains + role invites
- *DB:* Postgres with `tenant_id` RLS, Prisma
- *Vector:* Qdrant Cloud - `collection = tenant_{id}_notes`
- *LLM:* OpenRouter (you can switch models without code) + llama.rn for offline
- *Laya:* Self-hosted on Fly.io - 25ms classification, saves 70% LLM cost

### 6. Data Model - Multi-tenant
Tenant (school) -> has many Users -> has many Classes -> has many Subjects
Subject -> has many Documents (syllabus, notes) -> has many Chunks (vector)
StudentQuery -> LayaResult { intent, subject, language } -> AIAnswer -> QuizAttempt
Every table has `tenant_id`. No cross-school data leak - mandatory for FERPA / NEP 2020.

### 7. Revenue & Scale

- Base APK / Web App: Free
- School Plan: Rs 4999/mo per school (upto 500 students) - includes 10k AI queries
- Extra storage: S3 pay-as-you-go
- Offline license: One-time Rs 50/student for low-connectivity schools - you give them preloaded tablets

This architecture starts with your BCA college as Tenant #1, then you onboard Raiganj University as Tenant #2 same day, zero code change.

Want I draft the database schema + FastAPI tenant middleware code so you can start building this week?