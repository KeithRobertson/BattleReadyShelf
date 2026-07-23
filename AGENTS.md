# Warhammer Collection Builder

## Stack

Frontend:
- React
- TypeScript
- Vite

Backend:
- Java 26
- Spring Boot 4

Database:
- PostgreSQL

Storage:
- AWS S3

## Rules

- UUID primary keys
- Flyway migrations only
- No direct entity exposure
- DTOs for API contracts
- REST endpoints
- Unit tests required

## Domain

CollectionModel = owned miniature

UnitDefinition = official game unit

CollectionUnitTemplate = reusable owned squad

ArmyList = playable list

ArmyListUnit = unit selected in a list