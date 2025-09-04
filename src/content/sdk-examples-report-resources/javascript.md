---
language: "Javascript"
order: 40
---

```javascript
import { ReportResourceRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/report_resource_request";
import { ResourceRepresentations } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/resource_representations";
import { RepresentationMetadata } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/representation_metadata";
import { ClientBuilder } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2";
import {
  fetchOIDCDiscovery,
  OAuth2ClientCredentials,
} from "@project-kessel/kessel-sdk/kessel/auth";
import "dotenv/config";

async function run() {
  try {
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
    const client = new ClientBuilder(KESSEL_ENDPOINT).insecure().buildAsync();

    const common = {
      workspace_id: "workspace-1",
    };

    const reporter = {
      document_id: "doc-123",
      document_name: "My Important Document",
      document_type: "document",
      created_at: "2025-08-31T10:30:00Z",
      file_size: 2048576,
      owner_id: "user-1",
    };

    const metadata: RepresentationMetadata = {
      localResourceId: "doc-123",
      apiHref: "https://drive.example.com/document/123",
      consoleHref: "https://www.console.com/drive/documents",
      reporterVersion: "2.7.16",
    };

    const representations: ResourceRepresentations = {
      metadata: metadata,
      common: common,
      reporter: reporter,
    };

    const reportResourceRequest: ReportResourceRequest = {
      type: "document",
      reporterType: "drive",
      reporterInstanceId: "drive-1",
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
