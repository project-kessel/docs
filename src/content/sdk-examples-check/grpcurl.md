---
language: "grpcurl"
order: 0
---

```bash
MESSAGE='{"object": {"resource_type": "group", "resource_id": "bob_club", "reporter": {"type": "rbac"}}, "relation": "member", "subject": {"resource": {"resource_type": "principal", "resource_id": "bob", "reporter": {"type": "rbac"}}}}'
grpcurl -plaintext -d $MESSAGE \
localhost: <your local port for inventory> \
kessel.inventory.v1beta2.KesselInventoryService.Check
```
