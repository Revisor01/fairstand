# Phase 6: GitHub & Deployment - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

App auf server.godsapp.de live deployen: GitHub Repository erstellen, CI/CD Pipeline mit GitHub Actions, Docker Images zu GHCR, Domain fairstand.godsapp.de mit SSL, Portainer Stack mit Webhook-basiertem Auto-Deploy.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure/deployment phase. Six well-defined deployment tasks:
- DEP-04: GitHub Repository erstellen und Code pushen
- DEP-05: GitHub Actions Workflow — Docker Images bauen → GHCR
- DEP-06: Domain fairstand.godsapp.de auf KeyHelp anlegen (vHost + SSL)
- DEP-07: Apache Custom Config für Traefik-Proxy
- DEP-08: Docker-Compose Stack auf Portainer deployen
- DEP-09: Portainer Webhook in GitHub Actions Secret

### Server-Infrastruktur (aus CLAUDE.md)
- Server: server.godsapp.de (Hetzner), SSH: root@server.godsapp.de
- Traefik: /opt/stacks/traefik (interner Reverse Proxy, 127.0.0.1:8888)
- Portainer: https://docker.godsapp.de
- KeyHelp für Apache vHosts + SSL
- Apache → Traefik → Docker Container

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing Traefik setup at /opt/stacks/traefik
- Portainer at https://docker.godsapp.de for stack management
- KeyHelp for domain/vHost management with automatic SSL

### Established Patterns
- Apache Custom Config format: ProxyPass → Traefik:8888 (documented in CLAUDE.md)
- Docker Compose with Traefik labels for routing
- Multi-stage Docker builds (Node.js + static serving)

### Integration Points
- GitHub Container Registry (ghcr.io) for Docker images
- Portainer Webhook for auto-deploy on push
- Apache → Traefik → Container routing chain

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>
