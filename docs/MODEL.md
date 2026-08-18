IMPORTANT:

This document is NOT the source of truth for the current implementation.

For current behaviour, use this order of authority:

1. Existing source code
2. Database migrations
3. OpenAPI specification
4. Tests
5. This document

This document describes future domain intent only.
Do not create missing entities, tables, endpoints, or relationships merely because they appear here.

# Domain Model - BattleReadyShelf

> **Status: aspirational / target design.** This describes where the domain model is heading, not what's implemented today. As of now only the **Collection domain** partially exists in code (`ModelDefinition`, `CollectionModel`, `CollectionModelImage`, `ArmyCollection` — see `backend/src/main/java/com/keith/battlereadyshelf/`), plus a minimal `FactionEntity` (id, externalId, name, parentFactionId) used purely as catalogue categorisation/filtering for `ModelDefinition` — it has no draft/publish workflow, no points/keywords/battlefieldRole, and is **not** the full Rules-domain `Faction` (with `GameSystem`, `UnitDefinition`, `WargearDefinition`, points rules, etc.) described below, which does not exist yet. The **Army domain** (ArmyList/ArmyUnit as distinct from the current simple `ArmyCollection`) also does not exist yet. Treat entity/field names here as design intent, not ground truth — check the actual entities/migrations for current reality.

## Core Design Principles

The system contains three distinct domains:

### Rules Domain

Represents official game definitions.

Examples:

* Poxwalker
* Plague Marine
* Typhus

These are not owned by a user.

---

### Collection Domain

Represents models owned by a specific user.

Examples:

* My painted Poxwalker #1
* My painted Poxwalker #2
* My converted Typhus

---

### Army Domain

Represents units selected for a specific army list.

Examples:

* Army List: Death Guard 2000pts
* Unit: Poxwalker Screen
* Unit: Typhus Bodyguard

---

# Rules Domain

## ModelDefinition

Represents a single official miniature type.

Examples:

* Poxwalker
* Plague Marine
* Typhus

### Fields

```text id="n9g0vv"
id
name
faction
keywords
description
baseSize
```

### Notes

A ModelDefinition is not owned by a user.

---

## UnitDefinition

Represents an official datasheet.

Examples:

* Poxwalkers
* Plague Marines
* Deathshroud Terminators

### Fields

```text id="3k1t76"
id
name
faction
battlefieldRole
keywords
```

### Relationships

```text id="6tv7s3"
UnitDefinition
    contains
        UnitCompositionRules
```

---

## UnitCompositionRule

Defines what models may exist within a unit.

Examples:

```text id="26n5b6"
10-20 Poxwalkers

1 Champion + 4-9 Marines

0-2 Special Weapons
```

### Fields

```text id="9tx7y8"
id
unitDefinitionId

minimumModels
maximumModels

allowedModelDefinitionId
```

---

## WargearDefinition

Represents an official selectable option.

Examples:

```text id="6dbqxh"
Plasma Gun
Power Fist
Heavy Plague Weapon
```

### Fields

```text id="g3jrw4"
id
name
description
```

---

## UnitOptionDefinition

Represents a selectable option for a datasheet.

Examples:

```text id="wzr2wo"
1 Marine may take Plasma Gun

Champion may take Power Fist
```

### Fields

```text id="0ayktn"
id
unitDefinitionId

wargearDefinitionId

minimumSelections
maximumSelections
```

---

## UnitPointsRule

Defines how points are calculated.

Examples:

```text id="j4pq8m"
10 Poxwalkers = 65

20 Poxwalkers = 130

5 Terminators = 180
```

### Fields

```text id="v25ib6"
id
unitDefinitionId

modelCount

points
```

### Notes

Points should be data driven.

Never hardcode points.

---

# Collection Domain

## CollectionModel

Represents a specific miniature owned by a user.

Examples:

```text id="pral9k"
Painted Poxwalker #1

Rusty Bob

Green Typhus
```

### Fields

```text id="u5m7bz"
id

ownerId

displayName

notes

modelDefinitionId

imageUrl
```

### Relationships

```text id="j0v1ul"
CollectionModel
    references
        ModelDefinition
```

---

## CollectionUnitTemplate

Represents a reusable group of owned models.

Examples:

```text id="6j2a66"
Painted Poxwalker Horde

Tournament Deathshroud
```

### Fields

```text id="myq8i4"
id

ownerId

name

description
```

### Notes

This is a user convenience feature.

It does not exist in game rules.

---

## CollectionUnitMember

### Fields

```text id="9j6c6d"
templateId

collectionModelId
```

---

# Army Domain

## ArmyList

Represents a saved army list.

Examples:

```text id="ix59kr"
Death Guard 2000

League List

Narrative Campaign
```

### Fields

```text id="wz88m5"
id

ownerId

name

description

targetPoints
```

---

## ArmyUnit

Represents a unit included in an army list.

Examples:

```text id="qojvdu"
Poxwalker Screen

Objective Holders

Typhus Escort
```

### Fields

```text id="lxg9e2"
id

armyListId

unitDefinitionId

name

notes
```

### Notes

ArmyUnit is a snapshot of a unit in a specific list.

---

## ArmyUnitModel

Represents the actual models used in a unit.

### Fields

```text id="wn2n4n"
id

armyUnitId

modelDefinitionId
```

### Notes

This allows:

```text id="bdbpxu"
10 Poxwalkers

20 Poxwalkers

Custom compositions
```

without depending on CollectionUnitTemplate.

---

# Proxy System

## ProxyAssignment

Represents a model being used as something else.

Examples:

```text id="r7m5a6"
Zombie used as Poxwalker

Plague Marine used as Typhus
```

### Fields

```text id="xxv3x4"
id

armyUnitModelId

actualModelDefinitionId

representedModelDefinitionId
```

---

## Collection Proxy

Example:

```text id="jyl2mx"
Owned Cultist

Used as Poxwalker
```

### Relationship

```text id="64hcv7"
CollectionModel
    -> ProxyAssignment
```

---

## External Proxy

Example:

```text id="g0ktib"
Borrowed Model

Paper Token

Future Purchase
```

### Fields

```text id="6hd10n"
displayName

notes
```

### Notes

No CollectionModel required.

---

# Leadership System

## UnitAttachmentRule

Defines valid attachments.

Examples:

```text id="oj0wzm"
Typhus may join Poxwalkers

Lord of Contagion may join Terminators
```

### Fields

```text id="ag3jxx"
leaderUnitDefinitionId

targetUnitDefinitionId
```

---

## ArmyUnitAttachment

Represents an actual attachment in a list.

Examples:

```text id="w0zh4n"
Typhus attached to Poxwalker Unit
```

### Fields

```text id="bbrc1o"
parentArmyUnitId

attachedArmyUnitId
```

---

# Validation Concepts

## Army Validation

Examples:

```text id="wb4bsv"
Max 3 units

Max 6 Battleline

Exactly 2000 points

Valid leader attachment
```

---

## Collection Validation

Examples:

```text id="yb9j0e"
Army uses 20 Poxwalkers

Collection owns 15

Validation Error
```

---

# Key Architectural Rule

Army lists should never directly depend on CollectionUnitTemplate.

Instead:

```text id="nl3zk0"
CollectionUnitTemplate
    → Convenience Feature

ArmyUnit
    → Actual Army Data
```

A template can be used to create an ArmyUnit, but once created the ArmyUnit should be independent.

This prevents future edits to a template accidentally modifying existing army lists.
