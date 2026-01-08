#!/bin/bash
# Create a role with specified permissions
#
# Usage: Edit the configuration below, then run:
#   chmod +x create-role.sh && ./create-role.sh

# ============ CONFIGURATION ============
# Modify these values for your use case

ROLE_NAME="drive-admin-role"
PERMISSIONS=("view_document" "edit_document" "delete_document")
RELATIONS_PORT=9000

# =======================================

# Build the tuples array for all permissions
TUPLES=""
for i in "${!PERMISSIONS[@]}"; do
    PERM="${PERMISSIONS[$i]}"
    TUPLE="{\"resource\":{\"id\":\"${ROLE_NAME}\",\"type\":{\"name\":\"role\",\"namespace\":\"rbac\"}},\"relation\":\"${PERM}\",\"subject\":{\"subject\":{\"id\":\"*\",\"type\":{\"name\":\"principal\",\"namespace\":\"rbac\"}}}}"
    if [ $i -gt 0 ]; then
        TUPLES="${TUPLES},"
    fi
    TUPLES="${TUPLES}${TUPLE}"
done

MESSAGE="{\"tuples\":[${TUPLES}]}"

echo "Creating role '${ROLE_NAME}' with permissions: ${PERMISSIONS[*]}"
grpcurl -plaintext -d "${MESSAGE}" \
    "localhost:${RELATIONS_PORT}" \
    kessel.relations.v1beta1.KesselTupleService.CreateTuples
