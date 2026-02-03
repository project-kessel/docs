#!/bin/bash

# region setup
KESSEL_BASE_URL="http://localhost:9081"

HEADERS=(
  -H "Content-Type: application/json"
)
# endregion

# region report
REPORT_MESSAGE='{"type": "document", "reporterType": "drive", "reporterInstanceId": "drive-1","representations": {"metadata": {"localResourceId": "doc-123","apiHref": "https://drive.example.com/document/123","consoleHref": "https://www.console.com/drive/documents","reporterVersion": "2.7.16"},"common": {"workspace_id": "workspace-1"},"reporter": {"document_id": "doc-123","document_name": "My Important Document","document_type": "document","created_at": "2025-08-31T10:30:00Z","file_size": 2048576,"owner_id": "user-1"}}}'

curl "${HEADERS[@]}" \
  -X POST \
  -d "$REPORT_MESSAGE" \
  "$KESSEL_BASE_URL/api/kessel/v1beta2/resources"
# endregion

# region check
# NOTE: You may need to wait for replication and caches to update.
CHECK_MESSAGE='{"object": {"resource_type": "document", "resource_id": "doc-123", "reporter": {"type": "drive"}}, "relation": "view", "subject": {"resource": {"resource_type": "principal", "resource_id": "sarah", "reporter": {"type": "rbac"}}}}'

curl "${HEADERS[@]}" \
  -X POST \
  -d "$CHECK_MESSAGE" \
  "$KESSEL_BASE_URL/api/kessel/v1beta2/check"
# endregion
