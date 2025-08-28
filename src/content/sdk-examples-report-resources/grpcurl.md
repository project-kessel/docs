---
language: "grpcurl"
order: 0
---

```bash
MESSAGE='{"type": "host", "reporter_type": "hbi", "reporter_instance_id": "3088be62-1c60-4884-b133-9200542d0b3f","representations": {"metadata": {"local_resource_id": "dd1b73b9-3e33-4264-968c-e3ce55b9afec","api_href": "https://apiHref.com/","console_href": "https://www.console.com/","reporter_version": "2.7.16"},"common": {"workspace_id": "a64d17d0-aec3-410a-acd0-e0b85b22c076"},"reporter": {"insights_inventory_id": "05707922-7b0a-4fe6-982d-6adbc7695b8f"}}}'
grpcurl -plaintext -d $MESSAGE \
localhost: <your local port for inventory> \
kessel.inventory.v1beta2.KesselInventoryService.ReportResource
  ```
