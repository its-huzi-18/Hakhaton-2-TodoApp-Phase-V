# Implementation Research: Phase II Full-Stack Setup

## Decision Log

### 1. Database Connection & ORM
- **Decision**: Use `SQLModel` with `asyncpg` for asynchronous database access to Neon PostgreSQL.
- **Rationale**: FastAPI runs best with async drivers. SQLModel provides the best DX for Pydantic-integrated models.
- **Alternatives considered**: SQLAlchemy (Classic), Peewee. Rejected because SQLModel reduces boilerplate for API response schemas.

### 2. Authentication Flow (Better Auth ↔ FastAPI)
- **Decision**: Frontend (Next.js) uses Better Auth for session/token management. The "JWT" plugin in Better Auth will be used to generate tokens. FastAPI will verify these tokens using `python-jose` and a shared secret or public key (RS256).
- **Rationale**: Better Auth is currently the most developer-friendly auth for Next.js. Decoupling the verification via JWT allows the backend to be stateless.
- **Alternatives considered**: Clerk, NextAuth. Rejected to stay within the "Better Auth" spec requirement.

### 3. Package Management
- **Decision**: Use `uv` for the backend.
- **Rationale**: Requirement from Constitution v1.1.0 for high-performance dependency management.

### 4. Shared Types
- **Decision**: Manual synchronization initially, or use `pydantic-to-typescript` if counts exceed 5 entities.
- **Rationale**: Keeps implementation simple for Phase II.

## Dependencies Verification

| Dependency | Purpose | Status |
| :--- | :--- | :--- |
| `fastapi` | Web Framework | Confirmed |
| `sqlmodel` | ORM | Confirmed |
| `better-auth` | Frontend Auth | Confirmed |
| `neon-postgres` | Serverless Database | Confirmed |
| `python-jose` | JWT Verification | Confirmed |
