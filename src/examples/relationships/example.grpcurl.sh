#!/bin/bash

# region setup
# Set your Kessel gRPC endpoint
KESSEL_GRPC_ENDPOINT="localhost:9081"

# For insecure local development:
GRPC_OPTS="-plaintext"
# endregion

# region create
# Add a workspace relationship to a document that has not been reported
# yet: the resource is created with the provided relationship values.
CREATE_MESSAGE='{"type": "document", "reporterType": "drive", "reporterInstanceId": "drive-1", "localResourceId": "doc-456", "common": {"workspace_id": "workspace-2"}}'
grpcurl $GRPC_OPTS \
  -d "$CREATE_MESSAGE" \
  "$KESSEL_GRPC_ENDPOINT" \
  kessel.inventory.v1beta2.KesselInventoryService.AddResourceRelationships
# endregion

# region remove
# First step of changing a single-valued relationship: remove the
# existing value. Removing a value that is not present is an idempotent
# no-op. Requires doc-123 to be reported with workspace-1 first; see
# the getting-started report example.
REMOVE_MESSAGE='{"type": "document", "reporterType": "drive", "reporterInstanceId": "drive-1", "localResourceId": "doc-123", "common": {"workspace_id": "workspace-1"}}'
grpcurl $GRPC_OPTS \
  -d "$REMOVE_MESSAGE" \
  "$KESSEL_GRPC_ENDPOINT" \
  kessel.inventory.v1beta2.KesselInventoryService.RemoveResourceRelationships
# endregion

# region add
# Second step of changing a single-valued relationship: add the
# replacement value. Adding a second value without removing the existing
# one first is rejected with INVALID_ARGUMENT.
ADD_MESSAGE='{"type": "document", "reporterType": "drive", "reporterInstanceId": "drive-1", "localResourceId": "doc-123", "common": {"workspace_id": "workspace-2"}}'
grpcurl $GRPC_OPTS \
  -d "$ADD_MESSAGE" \
  "$KESSEL_GRPC_ENDPOINT" \
  kessel.inventory.v1beta2.KesselInventoryService.AddResourceRelationships
# endregion

# region check
# NOTE: You may need to wait for replication and caches to update.
CHECK_MESSAGE='{"object": {"resource_type": "document", "resource_id": "doc-123", "reporter": {"type": "drive"}}, "relation": "view", "subject": {"resource": {"resource_type": "principal", "resource_id": "sarah", "reporter": {"type": "rbac"}}}}'
grpcurl $GRPC_OPTS \
  -d "$CHECK_MESSAGE" \
  "$KESSEL_GRPC_ENDPOINT" \
  kessel.inventory.v1beta2.KesselInventoryService.Check
# endregion
