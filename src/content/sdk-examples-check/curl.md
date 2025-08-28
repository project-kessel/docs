---
language: "curl"
order: 10
---

```bash
MESSAGE='{"object": {"resource_type": "group", "resource_id": "bob_club", "reporter": {"type": "rbac"}}, "relation": "member", "subject": {"resource": {"resource_type": "principal", "resource_id": "bob", "reporter": {"type": "rbac"}}}}'
curl -X POST \
  -H "Content-Type: application/json" \
  -d "$MESSAGE" \
  http://localhost:<your local port for inventory>/api/inventory/v1beta2/check
```
