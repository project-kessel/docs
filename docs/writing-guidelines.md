# Writing Guidelines

This document defines writing standards for Kessel documentation, covering abstraction levels, terminology, audience-appropriate language, and integration with the Diataxis framework.

## Table of Contents

- [Audience and Abstraction Levels](#audience-and-abstraction-levels)
- [Implementation Details and Abstraction](#implementation-details-and-abstraction)
- [Terminology Reference](#terminology-reference)
- [Diataxis Framework Integration](#diataxis-framework-integration)
- [Code Examples](#code-examples)
- [Writing Style](#writing-style)

---

## Audience and Abstraction Levels

Kessel documentation serves two primary audiences:

### User-Facing Documentation

**Audience**: Application developers integrating with Kessel  
**Goal**: Help users accomplish tasks without needing to understand internal architecture  
**Locations**: `building-with-kessel/`, `start-here/`

**Abstraction level**: Logical components and concepts
- Focus on **what** Kessel does, not **how** it's implemented
- Use domain terminology (authorization, resources, permissions)
- Hide implementation technologies behind logical names

### Maintainer Documentation

**Audience**: Kessel operators, SREs, internal developers  
**Goal**: Explain architecture, deployment, troubleshooting, and internals  
**Locations**: `running-kessel/`, `contributing/`

**Abstraction level**: Implementation details encouraged
- Show **how** Kessel works internally
- Name specific technologies (SpiceDB, Debezium, Kafka, PostgreSQL)
- Explain architectural decisions and trade-offs

---

## Implementation Details and Abstraction

User-facing documentation should refer to **logical components**, not implementation technologies.

### User-Facing Terminology

Use these terms in `building-with-kessel/` and `start-here/`:

| ❌ Avoid (Implementation) | ✅ Use (Logical) | Context |
|---------------------------|------------------|---------|
| SpiceDB | authorization graph, relations storage, authorization backend | When discussing where relationship data is stored |
| SpiceDB traversal | permission evaluation, permission check | When explaining how checks work |
| ZedToken | consistency token, snapshot token | When explaining consistency guarantees |
| Debezium + Kafka | CDC pipeline, event stream, replication pipeline | When explaining data flow |
| PostgreSQL WAL | transaction log, database changes | When explaining CDC mechanics |
| PostgreSQL | inventory database, resource database | When discussing storage |
| Kafka topics | event topics, event channels | When discussing event routing |
| LISTEN/NOTIFY | notification mechanism, write visibility | When explaining IMMEDIATE mode |

### When to Mention Implementation Details

It's acceptable to name specific technologies in these contexts:

#### 1. Architecture Documentation

File: `running-kessel/architecture.mdx`

**Acceptable**:
```markdown
Kessel uses SpiceDB as its authorization engine. SpiceDB stores relationship tuples 
and evaluates permission checks using the Zanzibar model.
```

**Why**: Operators need to know what components to deploy and monitor.

#### 2. Troubleshooting Guides

File: `running-kessel/troubleshooting/cdc-lag.mdx`

**Acceptable**:
```markdown
Check Debezium connector status:
```bash
curl http://debezium-connect:8083/connectors/kessel-cdc/status
```
```

**Why**: Debugging requires knowing the actual component names.

#### 3. Migration Guides

File: `building-with-kessel/how-to/migrate-from-v1.mdx`

**Acceptable**:
```markdown
Kessel v2 replaced the custom authorization backend with SpiceDB, which 
provides better scalability and consistency guarantees.
```

**Why**: Users migrating need to understand what changed architecturally.

#### 4. Performance Tuning

File: `running-kessel/monitoring-kessel/performance.mdx`

**Acceptable**:
```markdown
SpiceDB replica count directly affects read throughput for permission checks.
```

**Why**: Performance tuning requires understanding the actual components.

### Examples

#### ❌ Too Implementation-Focused (User Doc)

```markdown
## How Permission Checks Work

When you call `Check()`, the Relations API forwards your request to SpiceDB. 
SpiceDB looks up the relationship tuples stored in its CockroachDB backend 
and traverses the graph using Zanzibar's evaluation algorithm. The response 
includes a ZedToken which you can use for consistency.
```

**Problem**: Exposes SpiceDB, CockroachDB, Zanzibar, ZedToken to users who don't need this detail.

#### ✅ Appropriately Abstract (User Doc)

```markdown
## How Permission Checks Work

When you call `Check()`, Kessel evaluates the permission by traversing the 
authorization graph. It checks if the user has a role binding that grants 
the requested permission, following workspace hierarchy if needed. The 
response includes a consistency token you can use to ensure future checks 
reflect at least this state.
```

**Better**: Focuses on **what happens** from the user's perspective, not implementation.

#### ✅ Implementation-Focused (Maintainer Doc)

```markdown
## Authorization Architecture

Kessel uses SpiceDB as its authorization engine. SpiceDB stores relationship 
tuples in a CockroachDB cluster and evaluates permission checks using the 
Zanzibar model. Each write returns a ZedToken representing a specific point 
in SpiceDB's transaction log.

**Why SpiceDB**: Native support for hierarchical relationships, proven 
scalability at Google-scale, and built-in consistency token support.
```

**Correct**: Maintainer docs can and should explain implementation choices.

---

## Terminology Reference

### Preferred Terms by Context

#### Authorization Concepts

| Concept | User Term | Maintainer Term | Notes |
|---------|-----------|-----------------|-------|
| Where relationships are stored | authorization graph, relations storage | SpiceDB | Users don't need to know it's SpiceDB |
| Checking permissions | permission check, authorization check | SpiceDB Check RPC | Users call SDK methods, not raw RPCs |
| Permission result | allowed/denied, access decision | SpiceDB CheckResponse | Abstract the response type |
| Consistency point | consistency token | ZedToken | Implementation detail |

#### Data Flow

| Concept | User Term | Maintainer Term | Notes |
|---------|-----------|-----------------|-------|
| Resource → Authorization flow | CDC pipeline, replication pipeline | Debezium + Kafka + Consumer | Implementation stack |
| Event propagation | event stream, asynchronous replication | Kafka topics | Kafka is implementation |
| Database changes | transaction log, committed changes | PostgreSQL WAL | WAL is Postgres-specific |

#### Storage

| Concept | User Term | Maintainer Term | Notes |
|---------|-----------|-----------------|-------|
| Where resources live | inventory database | PostgreSQL | Database choice is implementation |
| Resource metadata table | resource table | `resource` table schema | Users don't query directly |

#### Consistency

| Concept | User Term | Maintainer Term | Notes |
|---------|-----------|-----------------|-------|
| Sync write mode | write visibility: IMMEDIATE | LISTEN/NOTIFY mechanism | Users set mode, don't need mechanics |
| Eventual sync | eventual consistency, replication lag | Consumer lag, Kafka lag | Use business term, not Kafka metric |

---

## Diataxis Framework Integration

Kessel documentation follows the [Diataxis framework](https://diataxis.fr/), which defines four documentation types. Each type has different rules for abstraction and implementation details.

### Tutorials (Learning-Oriented)

**Location**: `start-here/`  
**Abstraction level**: High - hide all implementation details  
**Goal**: Get users productive quickly

**Rules**:
- ✅ Use logical terminology only ("authorization graph", "CDC pipeline")
- ✅ Show working examples with minimal explanation
- ✅ Assume no prior knowledge of Kessel internals
- ❌ Do not mention SpiceDB, Debezium, Kafka, or other implementation tech
- ❌ Do not explain architectural decisions (save for explanations)

### How-To Guides (Task-Oriented)

**Location**: `building-with-kessel/how-to/`  
**Abstraction level**: High - focus on the task, not the mechanism  
**Goal**: Help users accomplish specific tasks

**Rules**:
- ✅ Use logical terminology ("consistency token", "authorization check")
- ✅ Show complete, runnable examples
- ✅ Link to concept docs for "why" and "how it works"
- ⚠️ Mention implementation only when directly relevant to the task
- ❌ Do not explain architecture unless needed for the task

**Example**: A how-to on "Configure strong consistency" can mention that consistency tokens come from the authorization backend, but doesn't need to say "SpiceDB returns ZedTokens."

### Explanations (Understanding-Oriented)

**Location**: `building-with-kessel/concepts/`  
**Abstraction level**: Medium - explain concepts, minimize implementation  
**Goal**: Build mental models of how Kessel works

**Rules**:
- ✅ Use logical terminology as primary language
- ⚠️ Mention implementation when it clarifies the concept
- ✅ Explain **why** things work this way
- ✅ Use diagrams to show relationships and flows
- ⚠️ Implementation details acceptable if they aid understanding

**Example**: A concept doc on consistency can say "the authorization backend uses consistency tokens" and link to architecture docs for details on SpiceDB.

**Current issue**: `concepts/rbac.mdx` mentions "SpiceDB" 22 times - should abstract most of these to "authorization graph" or "relations storage."

### Reference (Information-Oriented)

**Location**: `building-with-kessel/reference/`  
**Abstraction level**: Low - precise and factual  
**Goal**: Provide exact specifications

**Rules**:
- ✅ Use exact API/SDK terminology
- ✅ Document actual field names, types, return values
- ⚠️ Implementation details acceptable when documenting APIs
- ✅ Link to how-tos for usage examples

**Example**: API reference can say "returns a `ZedToken` in the response" because that's the actual field name in the protobuf.

---

## Code Examples

All code examples in user-facing documentation must follow these standards (see also [CONTRIBUTING.md](../CONTRIBUTING.md)):

### Completeness

✅ **Good** - Complete, runnable:
```python
from kessel import InventoryClient

# Initialize client
client = InventoryClient(
    url="https://inventory.example.com",
    client_id="your-client-id",
    client_secret="your-client-secret"
)

# Check permission
try:
    result = client.check(
        resource_type="host",
        resource_id="host-123",
        permission="inventory:hosts:read",
        subject="user@example.com"
    )
    if result.allowed:
        print("Access granted")
except Exception as e:
    print(f"Check failed: {e}")
```

❌ **Bad** - Incomplete snippet:
```python
result = client.check(...)
if result.allowed:
    print("Access granted")
```

### Abstraction in Comments

Code examples should use **logical terms** in comments:

✅ **Good**:
```go
// Check permission against the authorization graph
resp, err := client.Check(ctx, &pb.CheckRequest{
    Resource: "host-123",
    Permission: "inventory:hosts:read",
})
```

❌ **Bad**:
```go
// SpiceDB will traverse the tuple graph using Zanzibar evaluation
resp, err := client.Check(ctx, &pb.CheckRequest{
    Resource: "host-123",
    Permission: "inventory:hosts:read",
})
```

### Region Markers

Use region markers for selective inclusion. See [AGENTS.md](../AGENTS.md#region-markers) for complete syntax reference and [AGENTS.md](../AGENTS.md#codeexamples-component-usage) for CodeExamples component usage.

```python
# region check-permission
try:
    result = client.check(
        resource_type="host",
        resource_id="host-123",
        permission="inventory:hosts:read",
    )
    if result.allowed:
        print("Access granted")
except Exception as e:
    print(f"Check failed: {e}")
# endregion check-permission
```

---

## Writing Style

### Voice and Tone

- **Active voice**: "Kessel evaluates permissions" not "Permissions are evaluated by Kessel"
- **Direct language**: Avoid qualifiers like "generally", "typically", "usually" unless genuinely uncertain
- **Imperative in how-tos**: "Configure TLS" not "You can configure TLS"
- **Explanatory in concepts**: "The CDC pipeline propagates changes" not "Configure the CDC pipeline"

### Sentence Structure

- **Target sentence length**: 15-20 words for user docs, up to 25 for technical docs
- **Break up complex ideas**: Use bullets, numbered lists, and subheadings
- **One idea per sentence**: Avoid compound sentences with multiple clauses

### Formatting

- **Bold** for new terms on first use: "A **role binding** connects a role to a subject"
- **Code formatting** for: API names (`Check`), field names (`resource_id`), types (`CheckRequest`)
- **Inline code** for values: set `consistency` to `"at_least_as_fresh"`
- **Aside components** for tips, warnings, cautions (see Starlight docs)

### Links

- **Link forward**: Concepts → how-tos, how-tos → reference
- **Link backward**: How-tos → concepts (for understanding)
- **Use descriptive link text**: "See [consistency model](../concepts/consistency)" not "See [here](../link)"

---

## Integration with Other Guidelines

This document focuses on **writing style and abstraction**. For domain-specific technical guidance, see:

- [API Contracts](./api-contracts-guidelines.md) - API versioning, SDK conventions, protobuf patterns
- [Security](./security-guidelines.md) - OAuth2, TLS, permissions, authentication patterns
- [Integration](./integration-guidelines.md) - Kessel architecture, CDC, SDK usage patterns
- [Performance](./performance-guidelines.md) - Optimization, caching, native compilation
- [Error Handling](./error-handling-guidelines.md) - Error patterns, retry logic, monitoring
- [Database](./database-guidelines.md) - Schema conventions, outbox pattern, CDC

---

## Examples: Rewriting for Proper Abstraction

### Example 1: Concept Document

#### ❌ Before (Too Implementation-Focused)

```markdown
## How SpiceDB Evaluates Permissions

When you call Check(), SpiceDB receives the request via the Relations API gRPC endpoint. 
SpiceDB queries its CockroachDB backend for relationship tuples matching the pattern 
`resource#permission@subject`. It then traverses the graph using Zanzibar's recursive 
evaluation algorithm, following the `t_parent` relation up the workspace hierarchy.
```

#### ✅ After (Appropriately Abstract)

```markdown
## How Permission Checks Work

When you call Check(), Kessel evaluates the permission by querying the authorization graph 
for relationships between the subject and the resource. The evaluation follows the workspace 
hierarchy, checking each level for role bindings that grant the requested permission.
```

**Changes**:
- "SpiceDB" → "Kessel" or "authorization graph"
- "Relations API gRPC endpoint" → implicit (users call SDK, not raw gRPC)
- "CockroachDB backend" → removed (implementation detail)
- "Zanzibar's recursive evaluation algorithm" → "evaluation" (algorithm is implementation)
- Kept "workspace hierarchy" and "role bindings" (domain concepts users need)

### Example 2: How-To Guide

#### ❌ Before

```markdown
To ensure your Check() sees the latest data, pass the ZedToken you got from 
SpiceDB's write response as the consistency parameter.
```

#### ✅ After

```markdown
To ensure your Check() reflects recent changes, pass the consistency token from 
the write response as the consistency parameter.
```

**Changes**:
- "ZedToken" → "consistency token" (logical term)
- "SpiceDB's write response" → "write response" (users call SDK, not SpiceDB directly)

### Example 3: Architecture Document

#### ✅ Before (Correct - this is maintainer content)

```markdown
## CDC Pipeline Architecture

Kessel uses Debezium to capture PostgreSQL WAL changes. Events are published to 
Kafka topics, consumed by the embedded consumer service, which transforms them 
into SpiceDB relationship tuples via the Relations API.
```

**Why this is correct**: Architecture docs are for operators who need implementation details.

---

## Checklist for Documentation Reviews

When reviewing documentation (human or AI), check:

### User-Facing Docs (`building-with-kessel/`, `start-here/`)

- [ ] No mentions of SpiceDB (use "authorization graph", "relations storage")
- [ ] No mentions of Debezium, Kafka topics, PostgreSQL WAL (use "CDC pipeline", "event stream")
- [ ] No mentions of ZedToken (use "consistency token")
- [ ] Code examples are complete and runnable
- [ ] Comments in code use logical terminology
- [ ] Links to concepts for "why" and "how it works"
- [ ] Follows appropriate Diataxis type (tutorial/how-to/explanation/reference)

### Maintainer Docs (`running-kessel/`, `contributing/`)

- [ ] Implementation details are present and accurate
- [ ] Architecture decisions are explained
- [ ] Links to source code or config files where relevant
- [ ] Troubleshooting includes actual component names
- [ ] Performance guidance references real metrics and components

---

## AI Agent Instructions

When generating or updating documentation:

1. **Determine audience**: Check file location - `building-with-kessel/` is user-facing, `running-kessel/` is maintainer
2. **Choose terminology**: Use terminology table above - map SpiceDB → authorization graph in user docs
3. **Validate abstraction**: Flag any implementation detail leaks in user-facing documentation
4. **Check Diataxis type**: Verify doc matches its intended type (tutorial/how-to/explanation/reference)
5. **Review examples**: Ensure code examples are complete, runnable, and use logical terminology in comments

**Red flags in user docs**:
- Mentions of SpiceDB, Debezium, Kafka, CockroachDB, PostgreSQL, ZedToken
- RPC method names instead of SDK method names
- Internal component names (pod names, service names)
- Implementation algorithms (Zanzibar, Raft, etc.)

**When in doubt**: Abstract more. Users can always dive into architecture docs if they want details.
