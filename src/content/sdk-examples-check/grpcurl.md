---
language: "grpcurl"
order: 0
---

```bash
MESSAGE='{"object": {"resourceType": "host", "resourceId": "dd1b73b9-3e33-4264-968c-e3ce55b9afec", "reporter": {"type": "hbi", "instanceId": "3088be62-1c60-4884-b133-9200542d0b3f"}}, "relation": "workspace", "subject": {"resource": {"resourceType": "workspace", "resourceId": "a64d17d0-aec3-410a-acd0-e0b85b22c076", "reporter": {"type": "rbac", "instanceId": "3088be62-1c60-4884-b133-9200542d0b3f"}}}}'
grpcurl -plaintext -d $MESSAGE \
localhost: <your local port for inventory> \
kessel.inventory.v1beta2.KesselInventoryService.Check
```
