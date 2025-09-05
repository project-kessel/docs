---
language: "grpcurl"
order: 15
---

## Basic Client Setup

Set up basic grpcurl configuration for local development:

```bash
# Set your Kessel gRPC endpoint
KESSEL_GRPC_ENDPOINT="localhost:9000"

# For insecure local development:
GRPC_OPTS="-plaintext"
```

## Auth Client Setup

Configure grpcurl with authentication for production environments:

```bash
# Set grpcurl options with authentication
GRPC_OPTS="-H 'authorization: Bearer $ACCESS_TOKEN'"
```

## Creating Check Requests

Build the check request payload:

```bash
MESSAGE='{"object": {"resource_type": "document", "resource_id": "doc-123", "reporter": {"type": "drive"}}, "relation": "view", "subject": {"resource": {"resource_type": "principal", "resource_id": "sarah", "reporter": {"type": "rbac"}}}}'
```

## Sending Check Requests

Execute the check request:

```bash
grpcurl $GRPC_OPTS \
  -d "$MESSAGE" \
  "$KESSEL_GRPC_ENDPOINT" \
  kessel.inventory.v1beta2.KesselInventoryService.Check
```

## Complete Example

```bash
# Set your Kessel gRPC endpoint
KESSEL_GRPC_ENDPOINT="localhost:9000"

# For insecure local development:
GRPC_OPTS="-plaintext"

# For authenticated environments:
# GRPC_OPTS="-H 'authorization: Bearer $ACCESS_TOKEN'"
MESSAGE='{"object": {"resource_type": "document", "resource_id": "doc-123", "reporter": {"type": "drive"}}, "relation": "view", "subject": {"resource": {"resource_type": "principal", "resource_id": "sarah", "reporter": {"type": "rbac"}}}}'
grpcurl $GRPC_OPTS \
  -d "$MESSAGE" \
  "$KESSEL_GRPC_ENDPOINT" \
  kessel.inventory.v1beta2.KesselInventoryService.Check
```