---
language: "Javascript"
order: 40
---
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
