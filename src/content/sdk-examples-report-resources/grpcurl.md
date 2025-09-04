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

## Creating Report Resource Requests

Build the report resource request payload:

```bash
MESSAGE='{"type": "document", "reporter_type": "drive", "reporter_instance_id": "drive-1","representations": {"metadata": {"local_resource_id": "doc-123","api_href": "https://drive.example.com/document/123","console_href": "https://www.console.com/drive/documents","reporter_version": "2.7.16"},"common": {"workspace_id": "workspace-1"},"reporter": {"document_id": "doc-123","document_name": "My Important Document","document_type": "document","created_at": "2025-08-31T10:30:00Z","file_size": 2048576,"owner_id": "user-1"}}}'
```

## Sending Report Resource Requests

Execute the report resource request:

```bash
grpcurl $GRPC_OPTS \
  -d "$MESSAGE" \
  "$KESSEL_GRPC_ENDPOINT" \
  kessel.inventory.v1beta2.KesselInventoryService.ReportResource
```

## Complete Example

```bash
# Set your Kessel gRPC endpoint
KESSEL_GRPC_ENDPOINT="localhost:9000"

# For insecure local development:
GRPC_OPTS="-plaintext"

# For authenticated environments:
# GRPC_OPTS="-H 'authorization: Bearer $ACCESS_TOKEN'"

MESSAGE='{"type": "document", "reporter_type": "drive", "reporter_instance_id": "drive-1","representations": {"metadata": {"local_resource_id": "doc-123","api_href": "https://drive.example.com/document/123","console_href": "https://www.console.com/drive/documents","reporter_version": "2.7.16"},"common": {"workspace_id": "workspace-1"},"reporter": {"document_id": "doc-123","document_name": "My Important Document","document_type": "document","created_at": "2025-08-31T10:30:00Z","file_size": 2048576,"owner_id": "user-1"}}}'
grpcurl $GRPC_OPTS \
  -d "$MESSAGE" \
  "$KESSEL_GRPC_ENDPOINT" \
  kessel.inventory.v1beta2.KesselInventoryService.ReportResource
```