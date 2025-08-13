---
language: "Javascript"
order: 40
---

```javascript
import "dotenv/config";
import { KesselInventoryServiceClient } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/inventory_service";
import { ResourceReference } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/resource_reference";
import { SubjectReference } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/subject_reference";
import { CheckRequest } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/check_request";
import { ChannelCredentials } from "@grpc/grpc-js";

const stub = new KesselInventoryServiceClient(
    process.env.KESSEL_ENDPOINT,
    ChannelCredentials.createInsecure(),
    {
        // Channel options
    },
);

const subjectReference: SubjectReference = {
    resource: {
        reporter: {
            type: "rbac",
        },
        resourceId: "foobar",
        resourceType: "principal",
    },
};

const resource: ResourceReference = {
    reporter: {
        type: "rbac",
    },
    resourceId: "1234",
    resourceType: "workspace",
};

const check_request: CheckRequest = {
    object: resource,
    relation: "inventory_host_view",
    subject: subjectReference,
};

stub.check(check_request, (error, response) => {
    if (!error) {
        console.log("Check response received successfully:");
        console.log(response);
    } else {
        console.log("gRPC error occurred during Check:");
        console.log(`Exception:`, error);
    }
});
```
