<!-- SYNC IMPACT REPORT
Version change: 1.0.0 → 1.1.0
Modified principles: None (new constitution)
Added sections: All principles and sections as specified
Removed sections: None
Templates requiring updates: 
- ✅ .specify/templates/plan-template.md - Updated to align with new principles
- ✅ .specify/templates/spec-template.md - Updated to align with new principles  
- ✅ .specify/templates/tasks-template.md - Updated to reflect new principle-driven task types
- ✅ .specify/templates/commands/sp.constitution.md - Updated to remove outdated references
Runtime docs updated: 
- ✅ README.md - Updated to reference new constitution
- ✅ docs/quickstart.md - Updated to align with new principles
Follow-up TODOs: None
-->

# Full Stack Todo App Constitution

## Core Principles

### I. Engineering Philosophy
Spec-Driven Development is mandatory. No "vibe coding". Deterministic, reviewable, judge-traceable output. Agents must stop if requirements are missing.

### II. Development Workflow (NON-NEGOTIABLE)
Follow Specify → Plan → Tasks → Implement workflow. No code without Task ID. No implementation without approved spec. Every change must map back to spec artifacts.

### III. Architecture Principles
Event-Driven Architecture first. Async workflows over synchronous APIs. Loose coupling between services. No shared databases across services. Frontend must not directly call internal services.

### IV. Distributed Systems Rules
Kafka-compatible Pub/Sub is mandatory. Events represent facts, not commands. Consumers must be idempotent. Failures must not cascade across services.

### V. Dapr Mandates
Use Dapr Pub/Sub instead of Kafka SDKs. Use Dapr Jobs API for reminders & scheduling. Use Dapr Service Invocation for service calls. Use Dapr State Store where applicable. Infrastructure must be swappable via config, not code.

### VI. Kubernetes & Deployment Standards
Must run on Minikube locally. Must deploy to managed Kubernetes (AKS / GKE / OKE). Use Helm charts for deployment. Sidecar pattern (Dapr) is mandatory. Cloud deployment must mirror local setup.

### VII. Security & Secrets
No secrets in code or env files. Use Kubernetes Secrets or Dapr Secret Store. Credentials must never be committed. Principle of least privilege applies.

### VIII. CI/CD & Observability
CI/CD via GitHub Actions required. Automated build & deploy. Logging and monitoring must be enabled. Failures must be observable.

### IX. Agent Behavior Constraints
Agents must not invent requirements. Agents must not bypass spec files. Agents must request clarification when blocked. Constitution > Specify > Plan > Tasks hierarchy is enforced.

### X. Success Criteria
System is event-driven, not CRUD-centric. Advanced features implemented asynchronously. Infrastructure abstraction proven via Dapr. Judges can trace: Code → Task → Plan → Spec → Constitution.

## Additional Constraints

Technology stack requirements: Node.js/Express for backend, React for frontend, Kafka/Dapr for event streaming, PostgreSQL for persistence, Kubernetes for orchestration. Compliance standards: Follow OWASP security guidelines. Deployment policies: Blue-green deployments required for zero-downtime releases.

## Development Workflow

Code review requirements: All pull requests must be reviewed by at least one senior engineer. Testing gates: All automated tests must pass before merge. Deployment approval process: Automated pipeline handles deployments after successful tests and reviews.

## Governance

This constitution supersedes all other practices. All implementations must verify compliance with these principles. Complexity must be justified with clear benefits. This document governs all development activities and takes precedence over any conflicting guidance.

**Version**: 1.1.0 | **Ratified**: 2026-02-06 | **Last Amended**: 2026-02-06
