---
language: "curl"
order: 10
---

```bash
MESSAGE='{"object": {"resource_type": "document", "resource_id": "doc-123", "reporter": {"type": "drive"}}, "relation": "view", "subject": {"resource": {"resource_type": "principal", "resource_id": "sarah", "reporter": {"type": "rbac"}}}}'
curl -X POST \
  -H "Content-Type: application/json" \
  -d "$MESSAGE" \
  http://localhost:<your local port for inventory>/api/inventory/v1beta2/check
```
