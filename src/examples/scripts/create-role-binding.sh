#!/bin/bash
# Create a role binding that grants a user access to a role for a specific resource
#
# Usage: Edit the configuration below.
# 
# The script can be copied directly into a terminal or saved as a file.

# ============ CONFIGURATION ============
# Modify these values for your use case

ROLE_NAME="drive-admin-role"
USER_ID="sarah"
RESOURCE_ID="workspace-1"
RELATIONS_PORT=9000

# =======================================

# Auto-generate a deterministic binding ID from the inputs
BINDING_ID="${ROLE_NAME}--${USER_ID}--${RESOURCE_ID}"

echo "Creating role binding '${BINDING_ID}'"
echo "  Role:     ${ROLE_NAME}"
echo "  User:     ${USER_ID}"
echo "  Resource: ${RESOURCE_ID}"

# Create all three relationships in a single call:
# 1. role_binding -> granted -> role
# 2. role_binding -> subject -> user  
# 3. workspace -> user_grant -> role_binding
MESSAGE="{\"tuples\":[
  {\"resource\":{\"id\":\"${BINDING_ID}\",\"type\":{\"name\":\"role_binding\",\"namespace\":\"rbac\"}},\"relation\":\"granted\",\"subject\":{\"subject\":{\"id\":\"${ROLE_NAME}\",\"type\":{\"name\":\"role\",\"namespace\":\"rbac\"}}}},
  {\"resource\":{\"id\":\"${BINDING_ID}\",\"type\":{\"name\":\"role_binding\",\"namespace\":\"rbac\"}},\"relation\":\"subject\",\"subject\":{\"subject\":{\"id\":\"${USER_ID}\",\"type\":{\"name\":\"principal\",\"namespace\":\"rbac\"}}}},
  {\"resource\":{\"id\":\"${RESOURCE_ID}\",\"type\":{\"name\":\"workspace\",\"namespace\":\"rbac\"}},\"relation\":\"user_grant\",\"subject\":{\"subject\":{\"id\":\"${BINDING_ID}\",\"type\":{\"name\":\"role_binding\",\"namespace\":\"rbac\"}}}}
]}"

grpcurl -plaintext -d "${MESSAGE}" \
    "localhost:${RELATIONS_PORT}" \
    kessel.relations.v1beta1.KesselTupleService.CreateTuples
