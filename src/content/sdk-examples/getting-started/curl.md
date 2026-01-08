---
language: "curl"
order: 10
---
### Setup Client
```bash
# Set your Kessel endpoint
KESSEL_BASE_URL="http://localhost:9000"

# Set common headers for API requests
HEADERS=(
  -H "Content-Type: application/json"
)

# For authenticated environments, add authorization header:
# HEADERS+=(
#   -H "Authorization: Bearer $ACCESS_TOKEN"
# )
```

## Creating Report Resource Requests

Build the report resource request payload:

```bash
MESSAGE='{"type": "document", "reporter_type": "drive", "reporter_instance_id": "drive-1","representations": {"metadata": {"local_resource_id": "doc-123","api_href": "https://drive.example.com/document/123","console_href": "https://www.console.com/drive/documents","reporter_version": "2.7.16"},"common": {"workspace_id": "workspace-1"},"reporter": {"document_id": "doc-123","document_name": "My Important Document","document_type": "document","created_at": "2025-08-31T10:30:00Z","file_size": 2048576,"owner_id": "user-1"}}}'
```

## Sending Report Resource Requests

Execute the report resource request:

```bash
curl "${HEADERS[@]}" \
  -X POST \
  -d "$MESSAGE" \
  "$KESSEL_BASE_URL/api/inventory/v1beta2/resources"
```

## Creating Check Requests

Build the check request payload:

```bash
MESSAGE='{"object": {"resource_type": "document", "resource_id": "doc-123", "reporter": {"type": "drive"}}, "relation": "view", "subject": {"resource": {"resource_type": "principal", "resource_id": "sarah", "reporter": {"type": "rbac"}}}}'
```

## Sending Check Requests

Execute the check request:

```bash
curl "${HEADERS[@]}" \
  -X POST \
  -d "$MESSAGE" \
  "$KESSEL_BASE_URL/api/inventory/v1beta2/check"
```

## Complete Example

```bash
# Set your Kessel endpoint
KESSEL_BASE_URL="http://localhost:9000"

# Set common headers for API requests
HEADERS=(
  -H "Content-Type: application/json"
)

# For authenticated environments, add authorization header:
# HEADERS+=(
#   -H "Authorization: Bearer $ACCESS_TOKEN"
# )

# 1) Report a resource first
REPORT_MESSAGE='{"type": "document", "reporter_type": "drive", "reporter_instance_id": "drive-1","representations": {"metadata": {"local_resource_id": "doc-123","api_href": "https://drive.example.com/document/123","console_href": "https://www.console.com/drive/documents","reporter_version": "2.7.16"},"common": {"workspace_id": "workspace-1"},"reporter": {"document_id": "doc-123","document_name": "My Important Document","document_type": "document","created_at": "2025-08-31T10:30:00Z","file_size": 2048576,"owner_id": "user-1"}}}'
curl "${HEADERS[@]}" \
  -X POST \
  -d "$REPORT_MESSAGE" \
  "$KESSEL_BASE_URL/api/inventory/v1beta2/resources"

# 2) Then perform a permission check
CHECK_MESSAGE='{"object": {"resource_type": "document", "resource_id": "doc-123", "reporter": {"type": "drive"}}, "relation": "view", "subject": {"resource": {"resource_type": "principal", "resource_id": "sarah", "reporter": {"type": "rbac"}}}}'
curl "${HEADERS[@]}" \
  -X POST \
  -d "$CHECK_MESSAGE" \
  "$KESSEL_BASE_URL/api/inventory/v1beta2/check"
```
