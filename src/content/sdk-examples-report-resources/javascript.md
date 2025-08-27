---
language: "Javascript"
order: 40
---

```javascript
import { ReportResourceRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/report_resource_request";
import { ResourceRepresentations } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/resource_representations";
import { RepresentationMetadata } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/representation_metadata";
import { ClientBuilder } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2";
import "dotenv/config";

async function run() {
  try {
    // For authenticated environments, uncomment and configure the following:
    // const auth = await OAuth2ClientCredentials.fromDiscovery({
    //   clientId: CLIENT_ID,
    //   clientSecret: CLIENT_SECRET,
    //   issuerUrl: ISSUER_URL,
    // });
    // const client = new ClientBuilder(KESSEL_ENDPOINT).oauth2ClientAuthenticated(auth).buildAsync();

    // For insecure local development:
    const client = new ClientBuilder(KESSEL_ENDPOINT).insecure().buildAsync();

    const common = {
      workspace_id: "a64d17d0-aec3-410a-acd0-e0b85b22c076",
    };

    const reporter = {
      satellite_id: "ca234d8f-9861-4659-a033-e80460b2801c",
      sub_manager_id: "e9b7d65f-3f81-4c26-b86c-2db663376eed",
      insights_inventory_id: "05707922-7b0a-4fe6-982d-6adbc7695b8f",
      ansible_host: "host-1",
    };

    const metadata: RepresentationMetadata = {
      localResourceId: "dd1b73b9-3e33-4264-968c-e3ce55b9afec",
      apiHref: "https://apiHref.com/",
      consoleHref: "https://www.console.com/",
      reporterVersion: "2.7.16",
    };

    const representations: ResourceRepresentations = {
      metadata: metadata,
      common: common,
      reporter: reporter,
    };

    const reportResourceRequest: ReportResourceRequest = {
      type: "host",
      reporterType: "hbi",
      reporterInstanceId: "3088be62-1c60-4884-b133-9200542d0b3f",
      representations,
    };

    const response = await client.reportResource(reportResourceRequest);
    console.log("Resource reported successfully:");
    console.log(response);

  } catch (error) {
    console.log("gRPC error occurred during Resource reporting:");
    console.log("Exception:", error);
  }
}

run();
```
