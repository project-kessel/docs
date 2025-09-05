---
language: "curl"
order: 10
---

## Basic Client Setup

Set up basic curl configuration for local development:

```bash
# Set your Kessel endpoint
KESSEL_BASE_URL="http://localhost:8081"

HEADERS=(
  -H "Content-Type: application/json"
)
```

## Auth Client Setup

Configure curl with authentication for production environments:

```bash
# Set headers with authentication
HEADERS=(
  -H "Content-Type: application/json"
  -H "Authorization: Bearer $ACCESS_TOKEN"
)
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

## Complete Example

```bash
# Set your Kessel endpoint
KESSEL_BASE_URL="http://localhost:8080"

# Set common headers for API requests
HEADERS=(
  -H "Content-Type: application/json"
)

# For authenticated environments, add authorization header:
# HEADERS+=(
#   -H "Authorization: Bearer $ACCESS_TOKEN"
# )

MESSAGE='{"type": "document", "reporter_type": "drive", "reporter_instance_id": "drive-1","representations": {"metadata": {"local_resource_id": "doc-123","api_href": "https://drive.example.com/document/123","console_href": "https://www.console.com/drive/documents","reporter_version": "2.7.16"},"common": {"workspace_id": "workspace-1"},"reporter": {"document_id": "doc-123","document_name": "My Important Document","document_type": "document","created_at": "2025-08-31T10:30:00Z","file_size": 2048576,"owner_id": "user-1"}}}'
curl "${HEADERS[@]}" \
  -X POST \
  -d "$MESSAGE" \
  "$KESSEL_BASE_URL/api/inventory/v1beta2/resources"
```