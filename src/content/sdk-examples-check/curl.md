---
language: "curl"
order: 10
---

```bash
MESSAGE='{"object": {"resourceType": "group", "resourceId": "bob_club", "reporter": {"type": "rbac"}}, "relation": "member", "subject": {"resource": {"resourceType": "principal", "resourceId": "bob", "reporter": {"type": "rbac"}}}}'
curl -X POST \
  -H "Content-Type: application/json" \
  -d "$MESSAGE" \
  http://localhost:<your local port for inventory>/api/inventory/v1beta2/check
```
