---
language: "Javascript"
order: 40
---

```javascript
import { ResourceReference } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/resource_reference";
import { SubjectReference } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/subject_reference";
import { CheckRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/check_request";
import { ClientBuilder } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2";
import "dotenv/config";

async function run() {
  try {
    // For authenticated environments, uncomment and configure the following:
    // For authenticated environments, uncomment and configure the following:
    // const discovery = await fetchOIDCDiscovery(
    //   process.env.AUTH_DISCOVERY_ISSUER_URL,
    // );

    // const oAuth2ClientCredentials = new OAuth2ClientCredentials({
    //   clientId: process.env.AUTH_CLIENT_ID!,
    //   clientSecret: process.env.AUTH_CLIENT_SECRET!,
    //   tokenEndpoint: discovery.tokenEndpoint,
    // });

    // const client = new ClientBuilder(process.env.KESSEL_ENDPOINT)
    //   .oauth2ClientAuthenticated(oAuth2ClientCredentials)
    //   .buildAsync(); // Or .build if using the callback client

    // For insecure local development:
    const client = new ClientBuilder(process.env.KESSEL_ENDPOINT).insecure().buildAsync();

    const subjectReference: SubjectReference = {
        resource: {
            reporter: {
                type: "rbac",
            },
            resourceId: "bob",
            resourceType: "principal",
        },
    };

    const resource: ResourceReference = {
        reporter: {
            type: "rbac",
        },
        resourceId: "bob_club",
        resourceType: "group",
    };

    const check_request: CheckRequest = {
        object: resource,
        relation: "member",
        subject: subjectReference,
    };

    const response = await client.check(check_request);
    console.log("Check response received successfully:");
    console.log(response);

  } catch (error) {
    console.log("gRPC error occurred during Check:");
    console.log("Exception:", error);
  }
}

run();
```
