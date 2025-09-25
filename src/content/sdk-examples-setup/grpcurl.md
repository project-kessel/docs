---
language: "grpcurl"
order: 15
---
### Setup Client

```bash
# Set your Kessel gRPC endpoint
KESSEL_GRPC_ENDPOINT="localhost:9000"

# For insecure local development:
GRPC_OPTS="-plaintext"

# For authenticated environments:
# GRPC_OPTS="-H 'authorization: Bearer $ACCESS_TOKEN'"
```


