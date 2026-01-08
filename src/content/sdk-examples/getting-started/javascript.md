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

## Creating Report Resource Requests

Build a ReportResource Request:

```javascript
// Common metadata shared across all reporters
const common = {
  workspace_id: "workspace-1",
};

// Reporter-specific data for the drive service
const reporter = {
  document_id: "doc-123",
  document_name: "My Important Document",
  document_type: "document",
  created_at: "2025-08-31T10:30:00Z",
  file_size: 2048576,
  owner_id: "user-1",
};

// Create metadata for the resource representation
const metadata = {
  localResourceId: "doc-123",
  apiHref: "https://drive.example.com/document/123",
  consoleHref: "https://www.console.com/drive/documents",
  reporterVersion: "2.7.16",
};

// Build the resource representations
const representations = {
  metadata: metadata,
  common: common,
  reporter: reporter,
};

// Create the complete report resource request
const reportResourceRequest = {
  type: "document",
  reporterType: "drive",
  reporterInstanceId: "drive-1",
  representations,
};
```

## Sending Report Resource Requests

Execute the report resource request and handle the response:

```javascript
try {
  const response = await client.reportResource(reportResourceRequest);
  console.log("Resource reported successfully:");
  console.log(response);
} catch (error) {
  console.log("gRPC error occurred during Resource reporting:");
  console.log("Exception:", error);
}
```

## Creating Check Requests

Build a permission check request:

```javascript
// Prepare the subject reference object (who is requesting access)
const subjectReference = {
    resource: {
        reporter: {
            type: "rbac",
        },
        resourceId: "sarah",
        resourceType: "principal",
    },
};

// Prepare the resource reference object (what is being accessed)
const resource = {
    reporter: {
        type: "drive",
    },
    resourceId: "doc-123",
    resourceType: "document",
};

// Build the complete check request
const check_request = {
    object: resource,
    relation: "view",
    subject: subjectReference,
};
```

## Sending Check Requests

Execute the check request and handle the response:

```javascript
try {
  const response = await client.check(check_request);
  console.log("Check response received successfully:");
  console.log(response);
} catch (error) {
  console.log("gRPC error occurred during Check:");
  console.log("Exception:", error);
}
```

## Complete Example

```javascript
import { ResourceReference } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/resource_reference";
import { SubjectReference } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/subject_reference";
import { CheckRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/check_request";
import { ReportResourceRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/report_resource_request";
import { ResourceRepresentations } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/resource_representations";
import { RepresentationMetadata } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/representation_metadata";
import { ClientBuilder } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2";
import "dotenv/config";

async function run() {
  try {
    // For insecure local development:
    const client = new ClientBuilder(process.env.KESSEL_ENDPOINT).insecure().buildAsync();

    // 1) Report a resource first
    const common = { workspace_id: "workspace-1" };
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
      metadata,
      common,
      reporter,
    };
    const reportResourceRequest: ReportResourceRequest = {
      type: "document",
      reporterType: "drive",
      reporterInstanceId: "drive-1",
      representations,
    };
    await client.reportResource(reportResourceRequest);

    // 2) Then perform a permission check
    const subjectReference: SubjectReference = {
      resource: {
        reporter: { type: "rbac" },
        resourceId: "sarah",
        resourceType: "principal",
      },
    };
    const resource: ResourceReference = {
      reporter: { type: "drive" },
      resourceId: "doc-123",
      resourceType: "document",
    };
    const check_request: CheckRequest = {
      object: resource,
      relation: "view",
      subject: subjectReference,
    };
    const response = await client.check(check_request);
    console.log("Check response received successfully:");
    console.log(response);
  } catch (error) {
    console.log("Error during report or check:");
    console.log("Exception:", error);
  }
}

run();
```

