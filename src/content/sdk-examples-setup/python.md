---
language: "Python"
order: 20
---
### Import client

```bash
pip install kessel-sdk
```

#### Basic Client Setup

```python
from kessel.inventory.v1beta2 import ClientBuilder

# For insecure local development:
stub, channel = ClientBuilder(KESSEL_ENDPOINT).insecure().build()
```

#### Auth Client Setup

Install the SDK with auth dependencies:
```bash
pip install "kessel-sdk[auth]"
```

```python
from kessel.auth import fetch_oidc_discovery, OAuth2ClientCredentials
from kessel.inventory.v1beta2 import ClientBuilder

# Fetch OIDC discovery information
discovery = fetch_oidc_discovery(ISSUER_URL)

# Create OAuth2 credentials
auth_credentials = OAuth2ClientCredentials(
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    token_endpoint=discovery.token_endpoint,
)

# Build authenticated client
stub, channel = ClientBuilder(KESSEL_ENDPOINT).oauth2_client_authenticated(auth_credentials).build()
```


