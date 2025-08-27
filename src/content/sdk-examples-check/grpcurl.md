---
language: "grpcurl"
order: 0
---

```bash
MESSAGE='{"object": {"resourceType": "group", "resourceId": "bob_club", "reporter": {"type": "rbac"}}, "relation": "member", "subject": {"resource": {"resourceType": "principal", "resourceId": "bob", "reporter": {"type": "rbac"}}}}'
grpcurl -plaintext -d $MESSAGE \
localhost: <your local port for inventory> \
kessel.inventory.v1beta2.KesselInventoryService.Check
```
