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
KESSEL_BASE_URL="http://localhost:8080"

# Set common headers for API requests
HEADERS=(
  -H "Content-Type: application/json"
)

# For authenticated environments, add authorization header:
# HEADERS+=(
#   -H "Authorization: Bearer $ACCESS_TOKEN"
# )

MESSAGE='{"object": {"resource_type": "document", "resource_id": "doc-123", "reporter": {"type": "drive"}}, "relation": "view", "subject": {"resource": {"resource_type": "principal", "resource_id": "sarah", "reporter": {"type": "rbac"}}}}'
curl "${HEADERS[@]}" \
  -X POST \
  -d "$MESSAGE" \
  "$KESSEL_BASE_URL/api/inventory/v1beta2/check"
```