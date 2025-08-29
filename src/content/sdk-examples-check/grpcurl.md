---
language: "grpcurl"
order: 0
---

```bash
MESSAGE='{"object": {"resource_type": "document", "resource_id": "doc-123", "reporter": {"type": "drive"}}, "relation": "view", "subject": {"resource": {"resource_type": "principal", "resource_id": "sarah", "reporter": {"type": "rbac"}}}}'
grpcurl -plaintext -d $MESSAGE \
localhost: <your local port for inventory> \
kessel.inventory.v1beta2.KesselInventoryService.Check
```
