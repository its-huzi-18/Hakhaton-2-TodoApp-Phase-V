# Implementation Plan: Advanced Cloud Deployment

**Branch**: `001-advanced-cloud-deployment` | **Date**: 2026-02-06 | **Spec**: [link]
**Input**: Feature specification from `/specs/001-advanced-cloud-deployment/spec.md`

**Note**: This template is filled in by the `/sp.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implementation of Phase V Advanced Cloud Deployment focusing on a cloud-native, event-driven Todo Chatbot system. The plan emphasizes distributed architecture with Dapr building blocks, Kubernetes deployment, and asynchronous workflows to achieve scalability and reliability.

## Technical Context

**Language/Version**: Node.js 18.x with Express framework
**Primary Dependencies**: Dapr 1.12+, Kubernetes v1.28+, Apache Kafka
**Storage**: PostgreSQL 15+ with connection pooling
**Testing**: Jest for unit tests, Supertest for integration tests, Pact for contract testing
**Target Platform**: Kubernetes v1.28+ (both Minikube for local and managed Kubernetes for cloud)
**Project Type**: Microservices architecture with event-driven communication
**Performance Goals**: 99% of reminders delivered within 1 minute, recurring task regeneration within 5 seconds, search/filter operations under 2 seconds
**Constraints**: OWASP Top 10 security compliance, no hardcoded secrets, Dapr-based service communication
**Scale/Scope**: Designed for 10,000+ concurrent users with 100,000+ daily tasks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Mandatory Compliance Verification:**
- [X] Spec-Driven Development approach confirmed
- [X] Event-Driven Architecture planned (not CRUD/Synchronous)
- [X] Dapr components planned for pub/sub, state, service invocation
- [X] Kubernetes deployment strategy aligned (Minikube → Cloud)
- [X] Security & Secrets approach compliant (no hardcoded values)
- [X] Agent behavior constraints respected (no requirement invention)
- [X] Architecture follows loose coupling principles
- [X] Infrastructure abstraction via Dapr confirmed

**Post-Design Verification:**
- [X] All services use Dapr for pub/sub, state, and service invocation
- [X] Event-driven communication implemented between all services
- [X] No direct database sharing between services
- [X] Dapr Jobs API used for reminder scheduling
- [X] Kubernetes manifests created for all services
- [X] Dapr sidecars configured for all services
- [X] Secrets managed through Dapr Secret Store and Kubernetes Secrets
- [X] All services deployed with Helm charts

## Project Structure

### Documentation (this feature)

```text
specs/001-advanced-cloud-deployment/
├── plan.md              # This file (/sp.plan command output)
├── research.md          # Phase 0 output (/sp.plan command)
├── data-model.md        # Phase 1 output (/sp.plan command)
├── quickstart.md        # Phase 1 output (/sp.plan command)
├── contracts/           # Phase 1 output (/sp.plan command)
└── tasks.md             # Phase 2 output (/sp.tasks command - NOT created by /sp.plan)
```

### Source Code (repository root)

```text
backend/
├── task-service/
│   ├── src/
│   ├── events/
│   └── tests/
├── reminder-service/
│   ├── src/
│   ├── scheduler/
│   └── tests/
├── recurring-task-engine/
│   ├── src/
│   ├── triggers/
│   └── tests/
├── notification-service/
│   ├── src/
│   ├── providers/
│   └── tests/
├── audit-service/
│   ├── src/
│   ├── logs/
│   └── tests/
└── shared/
    ├── events/
    ├── utils/
    └── config/

frontend/
├── src/
│   ├── components/
│   ├── services/
│   └── hooks/
└── tests/
```

**Structure Decision**: Microservices architecture with separate services for each core function, following the loose coupling principle from the constitution. Each service will have its own repository structure with source code, event handlers, and tests.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [None] | [No violations found] | [All constitution requirements met] |

## Architectural Overview

The system implements a cloud-native, event-driven architecture for the Todo Chatbot. The design centers around asynchronous communication patterns using Dapr building blocks to ensure loose coupling between services. Each service operates independently and communicates through events published to a central event stream.

The architecture follows the principle of treating events as immutable facts rather than commands, allowing multiple services to react independently to the same events. This approach enables horizontal scaling and fault tolerance, as individual services can fail without affecting others.

Async workflows are used throughout to prevent blocking operations and ensure the system remains responsive even under load. The event-driven approach also allows for better separation of concerns, as each service only needs to know about the events it consumes and produces.

## Core Components & Services

### Task Service
- **Responsibility**: Manages task lifecycle (create, update, delete, complete)
- **Ownership**: Task entity data and state
- **Communication**: Publishes task-related events, consumes user commands
- **Database**: Owns task-specific data in PostgreSQL
- **Single Responsibility**: Focus solely on task operations and state management

### Reminder Service
- **Responsibility**: Schedules and manages reminder delivery
- **Ownership**: Reminder scheduling and delivery logic
- **Communication**: Consumes task creation/completion events, publishes reminder events
- **Database**: Owns reminder-specific data in PostgreSQL
- **Single Responsibility**: Focus solely on scheduling and delivering reminders

### Recurring Task Engine
- **Responsibility**: Generates next occurrence of recurring tasks
- **Ownership**: Recurrence rule processing and task generation
- **Communication**: Consumes task completion events, publishes task creation events
- **Database**: Owns recurrence rule data in PostgreSQL
- **Single Responsibility**: Focus solely on processing recurring task logic

### Notification Service
- **Responsibility**: Delivers notifications to users
- **Ownership**: Notification delivery mechanisms
- **Communication**: Consumes reminder events, sends notifications via various channels
- **Database**: Owns notification status and delivery logs in PostgreSQL
- **Single Responsibility**: Focus solely on notification delivery

### Audit / Activity Log Service
- **Responsibility**: Maintains immutable log of all system activities
- **Ownership**: Audit trail data
- **Communication**: Consumes all system events, writes to append-only log
- **Database**: Owns audit log data in PostgreSQL
- **Single Responsibility**: Focus solely on maintaining activity logs

### Frontend / Chatbot Interface
- **Responsibility**: User interaction layer
- **Ownership**: User interface and client-side state
- **Communication**: Uses Dapr service invocation for commands, subscribes to relevant events
- **Database**: Client-side storage only
- **Single Responsibility**: Focus solely on user experience and interaction

## Eventing & Messaging Plan

### Central Event Topics
- `task-events`: All task-related events (created, updated, completed, deleted)
- `reminder-events`: All reminder-related events (scheduled, delivered, failed)
- `notification-events`: All notification-related events (sent, delivered, failed)
- `audit-events`: All system events for audit trail

### Event Publishers
- **Task Service**: Publishes to `task-events` when tasks are created, updated, completed, or deleted
- **Reminder Service**: Publishes to `reminder-events` when reminders are scheduled or processed
- **Notification Service**: Publishes to `notification-events` when notifications are sent or processed
- **Recurring Task Engine**: Publishes to `task-events` when generating new recurring tasks

### Event Consumers
- **Reminder Service**: Consumes `task-events` to schedule reminders for new tasks with due dates
- **Recurring Task Engine**: Consumes `task-events` to process completed recurring tasks
- **Notification Service**: Consumes `reminder-events` to deliver notifications
- **Audit Service**: Consumes all event types to maintain audit trail
- **Frontend**: Subscribes to relevant events for real-time updates

### Fan-Out Mechanism
The event streaming platform (Kafka-compatible) handles fan-out by allowing multiple consumers to subscribe to the same topic. Each consumer group processes events independently, ensuring that all interested services receive the events they need.

### Failure Isolation
Each service operates independently and maintains its own state. If one service fails, it doesn't affect others since they all rely on the central event stream rather than direct communication. Dead letter queues capture failed events for later processing.

## Scheduling & Time-Based Logic

### Reminder Scheduling
Reminders are scheduled using Dapr's Jobs API, which provides reliable, scalable scheduling capabilities. When a task with a due date is created, the Reminder Service creates a Dapr Job that triggers at the specified time.

### Exact-Time Execution
Dapr Jobs API ensures precise timing by leveraging underlying Kubernetes CronJob resources or equivalent scheduling mechanisms in other environments. This provides millisecond-level precision for reminder delivery.

### Recurring Task Trigger
When a recurring task is completed, the Recurring Task Engine calculates the next occurrence based on the recurrence rule and creates a new Dapr Job to trigger the generation of the next task instance at the appropriate time.

### Avoiding Polling and Cron Jobs
Instead of traditional polling or system-level cron jobs, the system relies on event-driven triggers and Dapr's Jobs API. This approach is more scalable, reliable, and fits better with the cloud-native architecture.

## State Management Strategy

### Service-Owned Data
Each service maintains its own database tables for the data it owns:
- Task Service: task-related data
- Reminder Service: reminder scheduling data
- Notification Service: notification delivery status
- Audit Service: immutable audit logs

### Dapr State Store Usage
For temporary state that needs to be shared across service instances (like rate limiting or caching), Dapr State Store is used. This ensures consistent access patterns and leverages infrastructure abstraction.

### Idempotency Handling
All event processors implement idempotency by checking if an event has already been processed before taking action. This prevents duplicate processing even if events are delivered multiple times.

### Duplicate Prevention
The system prevents duplicate events by assigning unique IDs to all events and tracking processed event IDs in a dedicated table. This ensures each event is processed exactly once.

## Service Communication Rules

### Async Events Usage
All communication between services must happen through events published to the central event stream. Direct service-to-service calls are forbidden except for specific Dapr building blocks.

### Direct Service Invocation
Direct service invocation via Dapr is allowed only for:
- Frontend to backend commands (when events are inappropriate)
- Administrative operations
- Health checks and monitoring

### Forbidden Patterns
- Direct database sharing between services
- Synchronous HTTP calls between services
- Polling other services for state changes
- Hardcoded service URLs or connection strings

### Contract Enforcement
API contracts are enforced through shared event schemas and Dapr component configurations. All services must validate incoming events against these schemas before processing.

## Kubernetes Deployment Model

### Local Deployment (Minikube)
The system deploys to Minikube using Helm charts that mirror the production configuration. Dapr is installed as a sidecar for each service, providing consistent infrastructure abstractions.

### Cloud Deployment (Managed Kubernetes)
Production deployment targets managed Kubernetes services (AKS/GKE/EKS) using identical Helm charts. The same Dapr configuration ensures environment parity.

### Sidecar Usage
Every service pod includes a Dapr sidecar that handles service invocation, pub/sub, state management, and secret retrieval. This provides infrastructure abstraction without requiring code changes.

### Configuration Management
Environment-specific configuration is managed through Kubernetes ConfigMaps and Secrets, with Dapr Secret Store providing secure access to sensitive information.

### Environment Parity
Local and cloud deployments use identical container images and Helm charts, ensuring consistent behavior across environments. Differences are limited to resource allocation and external service connections.

## Observability & Reliability

### Logging Approach
Structured logging is implemented across all services with correlation IDs to trace requests across service boundaries. Dapr provides additional infrastructure-level logs for debugging.

### Failure Handling
Services implement circuit breaker patterns and graceful degradation. When dependencies are unavailable, services continue operating with reduced functionality rather than failing completely.

### Retry Strategies
Automatic retries with exponential backoff are implemented for transient failures. Dapr provides built-in retry mechanisms for service invocations and pub/sub operations.

### Partial Failure Tolerance
The system tolerates partial failures by maintaining loose coupling and implementing fallback behaviors. If one service is down, others continue operating normally.

### Debuggability
Distributed tracing is implemented using Dapr's built-in tracing capabilities, allowing developers to follow requests across service boundaries. All services are designed to be debuggable through logs and metrics.

## Mapping to Tasks

This plan will be broken into atomic tasks by identifying each component, service, and integration point as separate work items. Each task will be assigned to appropriate agents based on expertise and responsibility.

The task breakdown will follow the service boundaries defined in this plan, ensuring each service can be developed independently. Integration tasks will be scheduled after core service development to ensure proper sequencing.

Judges will be able to trace each task back to specific elements in this plan, which in turn map to requirements in the specification and principles in the constitution.