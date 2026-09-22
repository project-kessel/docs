---
title: Migration Pattern Reference
description: Reference for the five Kessel RBAC migration patterns, including decision tree, request translations, role definitions, and workspace lookup APIs.
sidebar:
  order: 50
---

This document defines the five patterns for migrating permissions from RBAC v1 to Kessel RBAC v2. For the practical step-by-step migration guide, see [Migrate from RBAC v1 to v2](/docs/building-with-kessel/how-to/migrate-from-rbac-v1-to-v2/).

For permissions schema design, see the [Design Permissions guide](/docs/building-with-kessel/how-to/design-permissions/). For Kessel concepts, see [RBAC Concepts](/docs/building-with-kessel/concepts/rbac/).

---

## The Compatibility Constraint

**The binding level must be compatible with the check level: workspace bindings inherit downward, not upward.** If they diverge, permissions silently fail.

Example: RBAC generates a role binding at the Default Workspace, but your app checks for that permission at the Root Workspace. Because the Default Workspace does not inherit upward to the Root, the permission is never granted in v2 — even though it would be granted in v1. This violates the forward compatibility requirement.

This constraint means that the decision of where to check access and where RBAC binds roles must be coordinated. The five patterns below define this coordination.

---

## Pattern Summary

| Category | Pattern | When to Use (all conditions satisfied) | Examples |
|----------|---------|---------------------------------------|----------|
| Workspace-aware assets | [1. Native](#pattern-1-native-workspace-aware-low-cardinality) | Resource is workspace-aware AND EITHER queries return <10k results OR >80% of results are accessible | Workspaces, Hosts (low-cardinality ops) |
| Workspace-aware assets | [2. Native workspace-level list](#pattern-2-native-workspace-level-list-workspace-aware-high-cardinality) | Resource is workspace-aware AND queries return >10k results AND <80% of results are accessible | Hosts (high-cardinality ops) |
| Non-workspace-aware assets | [3. Default Workspace](#pattern-3-default-workspace-non-workspace-aware-assets) | Resource is NOT workspace-aware AND can be conceptualized as an "asset" (customer manages CRUD; could be placed in a workspace) | Repositories, SCAP policies |
| Org-wide settings | [4. Root Workspace](#pattern-4-root-workspace-org-wide-asset-centric-settings) | Resource is the organization AND the operation is "asset-centric" (could be workspace-level in the future) | Advisor recommendation acknowledgement |
| Org-wide settings | [5. Organization-level](#pattern-5-organization-level-non-asset-centric-settings) | Resource is the organization AND the operation is NOT asset-centric (would never belong at workspace level) | Authentication policy |

---

## Decision Tree

```
Is your resource already Workspace-aware?
├── Yes (Workspace-aware assets)
│   ├── Queries return <10k results OR >80% of results are likely accessible?
│   │   └── Yes → Pattern 1: Native
│   └── Queries return >10k results AND <80% likely accessible?
│       └── Yes → Pattern 2: Native workspace-level list
│
└── No
    ├── Could this resource be conceptualized as an "asset"
    │   (customer manages CRUD; could belong in a Workspace)?
    │   └── Yes → Pattern 3: Default Workspace
    │
    └── Is this resource the Organization itself (org-wide setting)?
        ├── Is the setting "asset-centric"
        │   (applies to workspace/host resources; could be workspace-level in the future)?
        │   └── Yes → Pattern 4: Root Workspace
        └── Is the setting NOT asset-centric
            (would never belong at workspace level)?
            └── Yes → Pattern 5: Organization-level
```

---

## Pattern 1: Native (Workspace-Aware, Low Cardinality)

### When to Use

Your resource is already organized into workspaces, AND either:
- Queries return fewer than ~10,000 results (total, paginated), OR
- More than ~80% of results are likely accessible to the requesting user

This is the **ideal case** — maximum flexibility, simplicity, and performance. You model the resource natively in Kessel and query access per-resource using `Check` (post-filtering) or `StreamedListObjects` (pre-filtering).

The only known case of this so far are Workspaces themselves.

### Why Workspace-Aware is Required

Modeling a resource natively in Kessel requires connecting it to the workspace hierarchy so it inherits access from bindings at the workspace level. If the resource is not already workspace-aware, making it so is out of scope for initial migration — use Pattern 3, 4, or 5 instead.

### Request Translation

| Request Input | Translation | Kessel Input |
|---------------|-------------|--------------|
| `org_id` | n/a | n/a |
| `resource` | Format as resource reference or resource type | `object` (for Checks) or `object_type` (for List Objects) |
| `operation` | 1:1 mapping to relation (permission) | `relation` |
| `user` | Format as subject reference | `subject` |

### Implementation

For each authorization check, provide the specific resource identity to Kessel:

- **Detail views / writes**: Use `Check` (reads), `CheckForUpdate` (writes or reads that expose credentials or other highly sensitive data) against the specific resource
- **List views**: Use `StreamedListObjects` to pre-filter, or `Check` per-result to post-filter

See [Protect an Endpoint](/docs/building-with-kessel/how-to/protect-endpoint/) for SDK-specific examples.

### Setting Up Access

Create roles with the appropriate permissions via `POST /api/rbac/v2/roles/` (`Roles.CreateOrUpdateRoleRequest`):

```json
{
  "name": "Custom Inventory Admin",
  "description": "Custom role for inventory management",
  "permissions": [
    { "application": "inventory", "resource_type": "hosts", "operation": "read" },
    { "application": "inventory", "resource_type": "hosts", "operation": "write" }
  ]
}
```

Bind roles to workspaces via `POST /api/rbac/v2/role-bindings:batchCreate/` (`RoleBindings.BatchCreateRoleBindingsRequest`):

```json
{
  "requests": [
    {
      "resource": { "id": "e4277742-b91c-43f1-a185-b827e8574345", "type": "workspace" },
      "subject":  { "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "type": "group" },
      "role":     { "id": "550e8400-e29b-41d4-a716-446655440002" }
    }
  ]
}
```

---

## Pattern 2: Native Workspace-Level List (Workspace-Aware, High Cardinality)

### When to Use

Your resource is already organized into workspaces, AND:
- Queries can return more than ~10,000 results (paginated), AND
- Less than ~80% of results are likely accessible to the requesting user

Services with operations relating to **Hosts** should follow this pattern.

### Why a Different Pattern

With >10k access-controlled resources and low access probability, checking each resource individually via Kessel becomes prohibitively slow (multiple seconds at ~100k results). Instead, separate **list** permissions from other operations: check access at the **workspace level** using `StreamedListObjects`, then pass the accessible workspace IDs as a filter in your application's database query.

This requires your application's database to track which workspace each asset belongs to. Workspace-aware assets like Hosts already do this via Inventory Groups.

### Request Translation

| Request Input | Translation | Kessel Input |
|---------------|-------------|--------------|
| `org_id` | n/a | n/a |
| `resource` | n/a (check at workspace level instead) | `object_type` = `rbac/workspace` |
| `operation` | 1:1 mapping to relation (permission) that includes host-level permission | `relation` |
| `user` | Format as subject reference | `subject` |

### Contingent Permissions

The relation used to query Kessel should be configured (via KSL schema) to require **both** the assigned RBAC permission specific to your application **and** view permissions for the host. This externalizes the common application logic that requires `inventory:hosts:read` at the workspace level alongside the application's more specific permission.

In KSL, use `@rbac.add_contingent_permission()` to combine inventory host view with app-specific permissions.

In SpiceDB schema terms, this is modeled as an intersection:

```
definition rbac/workspace {
    permission patch_system_edit = inventory_host_view & patch_system_edit_assigned
}
```

A user needs both `inventory:hosts:read` (for `inventory_host_view`) and `patch:system:write` (for `patch_system_edit_assigned`) on the same workspace to have the `patch_system_edit` permission.

### Implementation Flow

1. Call `StreamedListObjects` with `object_type = rbac/workspace` and the appropriate contingent relation to get workspace IDs the user can access
2. Use those workspace IDs as a filter in your application's database query (e.g., `WHERE workspace_id IN (...)`)
3. For detail/write operations on individual resources, use `Check` or `CheckForUpdate` against the specific resource

---

## Pattern 3: Default Workspace (Non-Workspace-Aware Assets)

### When to Use

Your resource is NOT already organized into workspaces, AND the resource can be conceptualized as an **asset** — something the customer manages (CRUD operations), that could be placed into a workspace in the future.

Examples: Repositories, SCAP policies.

### Why Default Workspace

These assets _should_ eventually be workspace-aware, but making them so requires significant development effort. As a low-cost stopgap compatible with the v2 model, treat them as implicitly placed in the **Default Workspace**. This allows future migration to full workspace awareness without changing the authorization level.

Instead of integrating these resources natively with Kessel, check access against the Default Workspace directly.

### Request Translation

| Request Input | Translation | Kessel Input |
|---------------|-------------|--------------|
| `org_id` | Look up Default Workspace ID for the org from RBAC | `object` (the Default Workspace) |
| `resource` | n/a (check against Default Workspace instead) | n/a |
| `operation` | 1:1 mapping to relation (permission) | `relation` |
| `user` | Format as subject reference | `subject` |

### Implementation

1. Look up the Default Workspace ID (see [Looking Up Built-In Workspaces](#looking-up-built-in-workspaces))
2. Use the Default Workspace as the `object` in your Kessel `Check` or `CheckForUpdate` call
3. All authorization checks for this resource go against the Default Workspace

### Setting Up Role Bindings

Bind roles to the Default Workspace via `POST /api/rbac/v2/role-bindings:batchCreate/` (`RoleBindings.BatchCreateRoleBindingsRequest`):

```json
{
  "requests": [
    {
      "resource": { "id": "<default-workspace-uuid>", "type": "workspace" },
      "subject":  { "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "type": "group" },
      "role":     { "id": "550e8400-e29b-41d4-a716-446655440002" }
    }
  ]
}
```

---

## Pattern 4: Root Workspace (Org-Wide Asset-Centric Settings)

### When to Use

The resource today is **the organization as a whole** (e.g., managing an organization-wide setting), AND the operation is **asset-centric** — it applies to workspaces or workspace-placed resources like hosts, and we can imagine a workspace-level or host-level configuration in the future.

Examples: Advisor recommendation acknowledgement (can be org-level or host-level), RHC configuration.

### Why Root Workspace

The Root Workspace represents "the whole organization" in the workspace hierarchy. Because permissions inherit downward, a role binding at the Root Workspace grants access across all child workspaces. This makes it the correct stand-in for org-wide asset-centric settings.

Using the Default Workspace would be wrong — the Default Workspace does not represent the entire organization when there is also a Root Workspace above it. When workspaces become fully adopted, settings bound at the Default Workspace would not cover other top-level workspaces.

### Request Translation

| Request Input | Translation | Kessel Input |
|---------------|-------------|--------------|
| `org_id` | Look up Root Workspace ID for the org from RBAC | `object` (the Root Workspace) |
| `resource` | n/a (check against Root Workspace instead) | n/a |
| `operation` | 1:1 mapping to relation (permission) | `relation` |
| `user` | Format as subject reference | `subject` |

### Customer UX Consideration

Customers must bind roles at the Root Workspace to gain access to modify these settings. If a customer binds a role with these permissions to a different workspace (e.g., the Default Workspace), the permission will not apply to the Root Workspace-level setting, which may be confusing. This trade-off is accepted because:

- It allows easier future migration of these settings to be natively workspace-aware
- Requiring permissions at the organization level is not necessarily more obvious
- As of writing, organization-level permissions are still being developed

### Setting Up Role Bindings

Bind roles to the Root Workspace:

```json
{
  "requests": [
    {
      "resource": { "id": "<root-workspace-uuid>", "type": "workspace" },
      "subject":  { "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "type": "group" },
      "role":     { "id": "550e8400-e29b-41d4-a716-446655440002" }
    }
  ]
}
```

---

## Pattern 5: Organization-Level (Non-Asset-Centric Settings)

### When to Use

The resource today is **the organization as a whole**, AND the operation is **not asset-centric** — it would never make sense at a workspace level. These are typically meta-authorization or authentication concerns.

Examples: Authentication policy, permission to invite users, permission to create user groups.

### How It Works

Bind roles and check access at the **tenant** level. The `resource.type` is `"tenant"` (from the `ResourceType` enum) and the `resource.id` is the tenant resource ID (format: `{domain}/{org_id}`, e.g., `redhat/12345`).

### Request Translation

| Request Input | Translation | Kessel Input |
|---------------|-------------|--------------|
| `org_id` | Format as tenant resource ID | `object` (the Tenant) |
| `resource` | n/a | n/a |
| `operation` | 1:1 mapping to relation (permission) | `relation` |
| `user` | Format as subject reference | `subject` |

### Setting Up Role Bindings

```json
{
  "requests": [
    {
      "resource": { "id": "redhat/12345", "type": "tenant" },
      "subject":  { "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "type": "group" },
      "role":     { "id": "550e8400-e29b-41d4-a716-446655440002" }
    }
  ]
}
```

---

## How RBAC Migrates Access Grants

Understanding how RBAC migrates v1 access grants to v2 is essential for ensuring forward compatibility. This section describes the migration algorithm so that application teams can verify their check level will match.

### Migration is Per-Role, Not Per-Permission

RBAC migrates access on a **v2 Role basis**, not a per-permission basis. It picks the resource to bind to based on the **"highest"** permission requirement in the role:

```
Organization (tenant)        ← binds here if any permission is org-level (Pattern 5)
  └── Root Workspace         ← binds here if any permission is asset-centric org-wide (Pattern 4)
      └── Default Workspace  ← default: binds here if no permissions require higher (Pattern 3)
```

For example, if a v2 Role has at least one permission that is organization-level, the entire role gets bound at the organization level. This may technically increase the scope of privilege beyond the minimum for some permissions, but it retains policy compatibility while minimizing complexity.

### Edge Case: Mixed Organization and Root Permissions

It is technically possible that a v2 Role contains both a permission requiring organization-level binding and one requiring root workspace binding. In this case, RBAC would split the v1 access into two bindings — one at the organization level, one at the root workspace. However, there are no known cases where this happens, because no system roles include these permissions together, and custom roles cannot include organization-level non-asset-centric permissions (e.g., user admin access).

### Default Roles

Default roles are bound at multiple levels in this model. RBAC maintains separate "Default Parent Roles" at each applicable built-in resource (organization, root workspace, default workspace), choosing the correct placement using the same highest-level algorithm. If a role changes such that it needs binding at a higher or lower level, RBAC ensures the other levels are updated accordingly.

---

## Role Definitions

Permissions are associated with roles via [role files](https://github.com/project-kessel/rbac-config/tree/master/configs/prod/roles) in the `rbac-config` repository. The role definition mechanism remains the same between v1 and v2.

When onboarding a new permission to Kessel, consider defining it in the RHEL persona-based roles in addition to any application-specific roles. The RHEL persona roles are:

- **RHEL viewer** — read-only access across RHEL services
- **RHEL operator** — edit access to system configs, inventory, policies, and notifications; read access to compliance, patch, vulnerabilities, and more
- **RHEL administrator** — full access across RHEL services

These persona-based roles are defined in the [`rhel.json` role file](https://github.com/project-kessel/rbac-config/tree/master/configs/prod/roles). Including new permissions in these roles provides a consistent cross-application experience for customers, ensuring new permissions are available to users with the appropriate RHEL-wide access level without requiring per-application role configuration.

---

## Why gRPC

Kessel client SDKs use gRPC to communicate with Kessel services rather than REST. This design choice was made for several reasons:

- **Performance**: gRPC uses HTTP/2 with binary serialization (Protocol Buffers), providing lower latency and smaller payloads compared to JSON-over-HTTP/1.1. Authorization checks are high-frequency, low-latency operations where this matters.
- **Streaming**: The [`StreamedListObjects`](https://buf.build/project-kessel/inventory-api/docs/main:kessel.inventory.v1beta2#kessel.inventory.v1beta2.KesselInventoryService.StreamedListObjects) API returns workspace IDs incrementally via server-side streaming, allowing applications to begin processing results before the full set is available. REST does not natively support this pattern.
- **Type safety**: Protocol Buffer definitions provide strongly-typed contracts shared between client and server, reducing integration errors.
- **Consistency with SpiceDB**: Kessel's authorization backend (SpiceDB) natively exposes a gRPC API. Using gRPC end-to-end avoids the overhead and fidelity loss of a REST translation layer.

All Kessel SDKs ([Go](https://github.com/project-kessel/kessel-sdk-go), [Java](https://github.com/project-kessel/kessel-sdk-java), [Python](https://github.com/project-kessel/kessel-sdk-py), [Node](https://github.com/project-kessel/kessel-sdk-node), [Ruby](https://github.com/project-kessel/kessel-sdk-ruby)) abstract the gRPC transport, so applications interact with idiomatic client libraries rather than raw gRPC calls.

---

## Looking Up Built-In Workspaces

Patterns 3 and 4 require looking up the Default or Root Workspace ID from RBAC. These `/api/rbac/v2` endpoints are RBAC management endpoints (not Inventory API endpoints). Workspace lookup requests must use the service's own OAuth token (not forward `x-rh-identity`) and include the `x-rh-rbac-org-id` header. See the [Root/Default workspace pattern](/docs/building-with-kessel/how-to/migrate-from-rbac-v1-to-v2/#rootdefault-workspace-pattern) section in the migration guide for details.

Use `GET /api/rbac/v2/workspaces/` with the `type` query parameter:

```
GET /api/rbac/v2/workspaces/?type=root&with_ancestry=true
GET /api/rbac/v2/workspaces/?type=default&with_ancestry=true
```

Response (`Workspaces.WorkspaceListResponse`):

```json
{
  "meta": { "count": 1, "limit": 10, "offset": 0 },
  "links": {
    "first": "/api/rbac/v2/workspaces/?type=root&with_ancestry=true&limit=10&offset=0",
    "next": null,
    "previous": null,
    "last": "/api/rbac/v2/workspaces/?type=root&with_ancestry=true&limit=10&offset=0"
  },
  "data": [
    {
      "id": "c1f729e2-3e2b-4f9e-b247-a4b568393e11",
      "type": "root",
      "name": "Root Workspace",
      "description": "Root workspace for the tenant",
      "created": "2024-08-04T12:00:00Z",
      "modified": "2024-08-04T12:00:00Z"
    }
  ]
}
```

### Caching

The Default and Root Workspace IDs are **immutable** for a given tenant. Cache them aggressively to avoid the latency and reliability cost of an RBAC lookup on every request. This lookup adds extra latency and a dependency on RBAC availability. Kessel client libraries are expected to encapsulate this lookup with built-in caching of these immutable values.

---

## Further Reading

- [Migrate from RBAC v1 to v2](/docs/building-with-kessel/how-to/migrate-from-rbac-v1-to-v2/) — Step-by-step migration guide with KSL examples and implementation details
- [Design Permissions](/docs/building-with-kessel/how-to/design-permissions/) — Permission schema design guide
- [Protect an Endpoint](/docs/building-with-kessel/how-to/protect-endpoint/) — SDK implementation guide with middleware examples
- [Coming from RBAC v1](/docs/building-with-kessel/concepts/coming-from-rbac-v1/) — Conceptual comparison for v1 users
- [RBAC v1 to v2 concept map](/docs/building-with-kessel/reference/v1-v2-concept-map/) — Lookup table of v1 concepts and their v2 equivalents
