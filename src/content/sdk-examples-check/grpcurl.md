---
language: "grpcurl"
order: 15
---
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

# 1) Report a resource first
REPORT_MESSAGE='{"type": "document", "reporter_type": "drive", "reporter_instance_id": "drive-1","representations": {"metadata": {"local_resource_id": "doc-123","api_href": "https://drive.example.com/document/123","console_href": "https://www.console.com/drive/documents","reporter_version": "2.7.16"},"common": {"workspace_id": "workspace-1"},"reporter": {"document_id": "doc-123","document_name": "My Important Document","document_type": "document","created_at": "2025-08-31T10:30:00Z","file_size": 2048576,"owner_id": "user-1"}}}'
grpcurl $GRPC_OPTS \
  -d "$REPORT_MESSAGE" \
  "$KESSEL_GRPC_ENDPOINT" \
  kessel.inventory.v1beta2.KesselInventoryService.ReportResource

# 2) Then perform a permission check
CHECK_MESSAGE='{"object": {"resource_type": "document", "resource_id": "doc-123", "reporter": {"type": "drive"}}, "relation": "view", "subject": {"resource": {"resource_type": "principal", "resource_id": "sarah", "reporter": {"type": "rbac"}}}}'
grpcurl $GRPC_OPTS \
  -d "$CHECK_MESSAGE" \
  "$KESSEL_GRPC_ENDPOINT" \
  kessel.inventory.v1beta2.KesselInventoryService.Check
```