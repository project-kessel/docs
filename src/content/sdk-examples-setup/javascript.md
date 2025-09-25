---
language: "Javascript"
order: 40
---
### Import client

```bash
npm install @project-kessel/kessel-sdk
```

#### Basic Client Setup

```javascript
import { ClientBuilder } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2";

// For insecure local development:
const client = new ClientBuilder(process.env.KESSEL_ENDPOINT).insecure().buildAsync();
```

#### Auth Client Setup

```javascript
import { ClientBuilder } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2";
import {
    fetchOIDCDiscovery,
    OAuth2ClientCredentials,
} from "@project-kessel/kessel-sdk/kessel/auth";

// Fetch OIDC discovery information
const discovery = await fetchOIDCDiscovery(process.env.AUTH_DISCOVERY_ISSUER_URL);

// Create OAuth2 credentials
const oAuth2ClientCredentials = new OAuth2ClientCredentials({
    clientId: process.env.AUTH_CLIENT_ID,
    clientSecret: process.env.AUTH_CLIENT_SECRET,
    tokenEndpoint: discovery.tokenEndpoint,
});

// Build authenticated client
const client = new ClientBuilder(process.env.KESSEL_ENDPOINT)
    .oauth2ClientAuthenticated(oAuth2ClientCredentials)
    .buildAsync();
```


