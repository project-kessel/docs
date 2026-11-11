#!/bin/bash

# region setup
# Set your Kessel gRPC endpoint
KESSEL_GRPC_ENDPOINT="localhost:9081"

# For insecure local development:
GRPC_OPTS="-plaintext"
# endregion

# region add
# Add the workspace relationship to an existing document without
# re-reporting its full representation. Only the named relationship
# values change; every other field is left untouched.
ADD_MESSAGE='{"type": "document", "reporterType": "drive", "reporterInstanceId": "drive-1", "localResourceId": "doc-123", "common": {"workspace_id": "workspace-2"}}'
grpcurl $GRPC_OPTS \
  -d "$ADD_MESSAGE" \
  "$KESSEL_GRPC_ENDPOINT" \
  kessel.inventory.v1beta2.KesselInventoryService.AddResourceRelationships
# endregion

# region remove
# Remove the previous workspace relationship. Removing a value that is
# not present is an idempotent no-op.
REMOVE_MESSAGE='{"type": "document", "reporterType": "drive", "reporterInstanceId": "drive-1", "localResourceId": "doc-123", "common": {"workspace_id": "workspace-1"}}'
grpcurl $GRPC_OPTS \
  -d "$REMOVE_MESSAGE" \
  "$KESSEL_GRPC_ENDPOINT" \
  kessel.inventory.v1beta2.KesselInventoryService.RemoveResourceRelationships
# endregion

# region check
# NOTE: You may need to wait for replication and caches to update.
CHECK_MESSAGE='{"object": {"resource_type": "document", "resource_id": "doc-123", "reporter": {"type": "drive"}}, "relation": "view", "subject": {"resource": {"resource_type": "principal", "resource_id": "sarah", "reporter": {"type": "rbac"}}}}'
grpcurl $GRPC_OPTS \
  -d "$CHECK_MESSAGE" \
  "$KESSEL_GRPC_ENDPOINT" \
  kessel.inventory.v1beta2.KesselInventoryService.Check
# endregion
