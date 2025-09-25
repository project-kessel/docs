---
language: "curl"
order: 10
---
### Setup Client
```bash
# Set your Kessel endpoint
KESSEL_BASE_URL="http://localhost:9000"

# Set common headers for API requests
HEADERS=(
  -H "Content-Type: application/json"
)

# For authenticated environments, add authorization header:
# HEADERS+=(
#   -H "Authorization: Bearer $ACCESS_TOKEN"
# )
```


