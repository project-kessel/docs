# Event Schema Design
## Mapping to Cloud Events

The event schema will be compatible with CloudEvents, a specification for describing event data in a common way. The following describes how the fabric (Kessel Inventory) will align with the CloudEvent schema.

The attributes of CloudEvent and the usage is described [here.](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md#required-attributes)

For Kessel Inventory schema, look [here.](https://github.com/project-kessel/inventory-api/blob/main/data/kafka-event-schema.json)

### Attributes 
#### specversion (String)

##### Cloud Event Intent
The version of the CloudEvents specification which the event uses. This enables the interpretation of the context. Compliant event producers MUST use a value of 1.0 when referring to this version of the specification.

##### Kessel Inventory Intent
Same as above.

#### type (String)
##### Cloud Event Intent
This attribute contains a value describing the type of event related to the originating occurrence. Often this attribute is used for routing, observability, policy enforcement, etc. The format of this is producer defined and might include information such as the version of the type - see Versioning of CloudEvents in the Primer for more information. Constraints:
- MUST be a non-empty string 
- SHOULD be prefixed with a reverse-DNS name.
    - The prefixed domain dictates the organization which defines the semantics of this event type.
    
Examples:
- `com.github.pull_request.opened`
- `com.example.object.deleted.v2`

##### Kessel Inventory Intent
We use a string comprised of _`redhat.inventory.resources.resource_type.operation`_

- `redhat.inventory.resources.k8s-cluster.created`
- `redhat.inventory.resources.k8s-cluster.updated` 
- `redhat.inventory.resources.k8s-cluster.deleted` 

or _`redhat.inventory.resource_relationships.relationship_type.operation`_

- `redhat.inventory.resources-relationship.k8s-policy_ispropagatedto_k8s-cluster.created`
- `redhat.inventory.resources-relationship.k8s-policy_ispropagatedto_k8s-cluster.updated`
- `redhat.inventory.resources-relationship.k8s-policy_ispropagatedto_k8s-cluster.deleted`
The only valid values for operation are created, updated or deleted. This allows a consumer to filter on method and/or resource type.



#### Source (URI)

##### Cloud Event Intent
Identifies the context in which an event happened. Often this will include information such as the type of the event source, the organization publishing the event or the process that produced the event. The exact syntax and semantics behind the data encoded in the URI is defined by the event producer. 

Producers MUST ensure that source + id is unique for each distinct event. 

An application MAY assign a unique source to each distinct producer, which makes it easy to produce unique IDs since no other producer will have the same source. The application MAY use UUIDs, URNs, DNS authorities or an application-specific scheme to create unique source identifiers.

##### Kessel Inventory Intent
Inventory-URI


#### Id (String)

##### Cloud Event Intent
Identifies the event. Producers MUST ensure that source + id is unique for each distinct event. If a duplicate event is re-sent (e.g. due to a network error) it MAY have the same id. Consumers MAY assume that Events with identical source and id are duplicates.

##### Kessel Inventory Intent
inventory-api generated ID for the event


#### time (Timestamp)

##### Cloud Event Intent
Timestamp of when the occurrence happened. If the time of the occurrence cannot be determined then this attribute MAY be set to some other time (such as the current time) by the CloudEvents producer, however all producers for the same source MUST be consistent in this respect. In other words, either they all use the actual time of the occurrence or they all use the same algorithm to determine the value used.

Constraints: 
- OPTIONAL 
    - If present, MUST adhere to the format specified in RFC 3339

##### Kessel Inventory Intent
last_reported from inventory-api

 
#### datacontenttype (String per RFC 2046)

##### Cloud Event Intent
Content type of data value. This attribute enables data to carry any type of content, whereby format and encoding might differ from that of the chosen event format. For example, an event rendered using the JSON envelope format might carry an XML payload in data, and the consumer is informed by this attribute being set to "application/xml". The rules for how data content is rendered for different datacontenttype values are defined in the event format specifications.

##### Kessel Inventory Intent
"application/json"


#### data

##### Cloud Event Intent
The event payload. This specification does not place any restriction on the type of this information. It is encoded into a media format which is specified by the datacontenttype attribute (e.g. application/json), and adheres to the dataschema format when those respective attributes are present.

##### Kessel Inventory Intent
Payload will mimic the OpenAPI Specs for each method, i.e POST, PUT and DELETE. The data object will contain the information about the resource, including 
- metadata object 
- reporter_data object
- resource_data object or relationship_data object

The reporter_data will be the reporter who made the api call for which this event is referencing.


#### dataschema (URI)

##### Cloud Event Intent
Identifies the schema that data adheres to. Incompatible changes to the schema SHOULD be reflected by a different URI.

Constraints:
- OPTIONAL 
    - If present, MUST be a non-empty URI

##### Kessel Inventory Intent
Not Used

 
#### subject (String)

##### Cloud Event Intent
This describes the subject of the event in the context of the event producer (identified by source). In publish-subscribe scenarios, a subscriber will typically subscribe to events emitted by a source, but the source identifier alone might not be sufficient as a qualifier for any specific event if the source context has internal sub-structure. 

Identifying the subject of the event in context metadata (opposed to only in the data payload) is particularly helpful in generic subscription filtering scenarios where middleware is unable to interpret the data content. In the above example, the subscriber might only be interested in blobs with names ending with '.jpg' or '.jpeg' and the subject attribute allows for constructing a simple and efficient string-suffix filter for that subset of events.

##### Kessel Inventory Intent
We use a string composed of _`resources/resource_type/id where id is the ID of the resource created by the asset inventory service.`_

Example:
- `/resources/k8s-cluster/A234-1234-1234`

or _`resource-relationships/relationship_type/id`_ where id is the ID of the resource-relationship created by the asset inventory service.

Example:
- `/resources-relationships/k8s-policy_is-propagated-to_k8s-cluster/A234-1234-1234`



## Examples
### Resources
#### Create a Cluster
```json
{
    "specversion" : "1.0",
    "type": "redhat.inventory.resources.k8s-cluster.created",
    "source" : "inventory-api-uri",
    "id" : "Z789-6789-67894",
    "subject": "/resources/k8s-cluster/A234-1234-1234",
    "time" : "2018-04-05T17:31:00Z",
    "datacontenttype" : "application/json",
    "data" : {
         "metadata": {
           "id" :  "A234-1234-1234",       
           "resource_type" : "k8s-cluster",
           "last_reported" : "2018-04-05T17:31:00Z",
           "workspace": "workspace name",
           "labels": [
              {
                "key": "env",
                "value": "prod"
              }
            ]
         },
         "reporter_data": {
            "reporter_instance_id" : "an id of the reporter",
            "last_reported" : "2018-04-05T17:31:00Z",
            "reporter_type" : "ACM",
            "console_href" : "some https://referring the local-res-id",
            "api_href": "some https://referring the local-res-id",
            "local_resource_id": "id-as-supplied-by-reporter",
            "reporter_version": "2.12"
         },
         "resource_data": {
            "external_cluster_id": "cluster-guid/ARN etc",
            "cluster_status": "READY", 
            "kube_version": "v1.30.1",
            "kube_vendor": "OPENSHIFT",
            "vendor_version": "4.16",
            "cloud_platform": "AWS_UPI",
            "nodes": [
              {
                "name": "ip-10-0-0-1.ec2.internal",
                "cpu": "7500m",
                "memory": "30973224Ki",
                "labels": [
                  {
                    "key": "node.openshift.io/os_id",
                    "value": "rhcos"
                  }
                 ]
              }
             ]
          }
      }
}


```


#### Update a Cluster

```json
{
    "specversion" : "1.0",
    "type": "redhat.inventory.resources.k8s-cluster.updated",
    "source" : "inventory-api-uri",
    "id" : "Z789-6789-67895",
    "subject": "/resources/k8s-cluster/A234-1234-1234",
    "time" : "2018-04-05T17:31:00Z",
    "datacontenttype" : "application/json",
    "data" : {
         "metadata": {
           "id" :  "A234-1234-1234",      
           "resource_type" : "k8s-cluster",
           "last_reported" : "2018-04-05T17:31:00Z",
           "workspace": "workspace name",
           "labels": [
              {
                "key": "env",
                "value": "prod"
              }
            ]
         },
         "reporter_data": {
            "reporter_instance_id" : "an id of the reporter",
            "last_reported" : "2018-04-05T17:31:00Z",
            "reporter_type": "ACM",
            "console_href": "some https://referring the local-res-id",
            "api_href": "some https://referring the local-res-id",
            "local_resource_id": "id-as-supplied-by-reporter",
            "reporter_version": "2.12"
         },
         "resource_data": {
            "external_cluster_id": "cluster-guid/ARN etc",
            "cluster_status": "READY", 
            "kube_version": "v1.30.1",
            "kube_vendor": "OPENSHIFT",
            "vendor_version": "4.16",
            "cloud_platform": "AWS_UPI",
            "nodes": [
              {
                "name": "ip-10-0-0-1.ec2.internal",
                "cpu": "7500m",
                "memory": "30973224Ki",
                "labels": [
                  {
                    "key": "node.openshift.io/os_id",
                    "value": "rhcos"
                  }
                 ]
              }
             ]
          }
      }
}
```

#### Delete a Cluster
```json
{
    "specversion" : "1.0",
    "type": "redhat.inventory.resources.k8s-cluster.deleted", 
    "source" : "inventory-api-uri",
    "id" : "Z789-6789-67896",
    "subject": "/resources/k8s-cluster/A234-1234-1234",
    "time" : "2018-04-05T17:31:00Z",
    "datacontenttype" : "application/json",
    "data" : {
         "metadata": {
           "id" : "A234-1234-1234"         
          },
         "reporter_data": {
            "reporter_instance_id" : "an id of the reporter",
            "reporter_type": "ACM",
            "local_resource_id": "id-as-supplied-by-reporter",
           }
      }
}

```

#### Create a Policy
```json
{
  "specversion" : "1.0",
  "type": "redhat.inventory.resources.k8s-policy.created",
  "source" : "inventory-api-uri",
  "id" : "Z789-6789-67891",
  "subject": "/resources/k8s-policy/A234-1234-1234",
  "time" : "2018-04-05T17:31:00Z",
  "datacontenttype" : "application/json",
  "data" : {
    "metadata": {
      "id": "A234-1234-1234",
      "resource_type": "k8s-policy",
      "last_reported": "2018-04-05T17:31:00Z",
      "workspace": "workspace name",
      "labels": [
        {
          "key": "apps.open-cluster-management.io/reconcile-rate",
          "value": "high"
        }
      ]
    },
      "reporter_data": {
        "reporter_instance_id" : "an id of the reporter",
        "last_reported" : "2018-04-05T17:31:00Z",
        "reporter_type": "ACM",
        "console_href": "some https://referring the local-res-id",
        "api_href": "some https://referring the local-res-id",
        "local_resource_id": "id-as-supplied-by-reporter",
        "reporter_version": "2.12"
         },
      "resource_data": {
        "Disabled": "False",
        "severity": "LOW"
      }
    }
}
```

#### Update a Policy
```json
{
    "specversion" : "1.0",
    "type": "redhat.inventory.resources.k8s-policy.updated",
    "source" : "inventory-api-uri",
    "id" : "Z789-6789-67892",
    "subject": "/resources/k8s-policy/A234-1234-1234",
    "time" : "2018-04-05T17:31:00Z",
    "datacontenttype" : "application/json",
    "data" :{
    "metadata": {
      "id": "A234-1234-1234",
      "resource_type": "k8s-policy",
      "last_reported": "2018-04-05T17:31:00Z",
      "workspace": "workspace name",
      "labels": [
        {
          "key": "apps.open-cluster-management.io/reconcile-rate",
          "value": "high"
        }
      ]
    },
         "reporter_data": {
            "reporter_instance_id" : "an id of the reporter",
            "last_reported" : "2018-04-05T17:31:00Z",
            "reporter_type": "ACM",
            "console_href": "some https://referring the local-res-id",
            "api_href": "some https://referring the local-res-id",
            "local_resource_id": "id-as-supplied-by-reporter",
            "reporter_version": "2.12"
         },
    "resource_data": {
      "Disabled": "False",
      "severity": "LOW"
        }
    }
}
```

#### Delete a Policy
```json
{
    "specversion" : "1.0",
    "type": "redhat.inventory.resources.k8s-policy.deleted",
    "source" : "inventory-api-uri",
    "id" : "Z789-6789-67893",
    "subject": "/resources/k8s-policy/A234-1234-1234",
    "time" : "2018-04-05T17:31:00Z",
    "datacontenttype" : "application/json",
    "data" :{
    "metadata": {
      "id": "A234-1234-1234",
      "resource_type": "k8s-policy",
      "workspace": "workspace name",
    },
    "reporter_data": {
      "reporter_instance_id": "an id of the reporter" ,
      "reporter_type": "ACM",
      "local_resource_id": "id-as-supplied-by-reporter"
        }
    }
}
```

### Resource Relationships

#### Create a Relationship
```json
{
    "specversion" : "1.0",
    "type": "redhat.inventory.resources_relationship.k8s-policy_is-propagated-to_k8s-cluster.created",
    "source": "inventory-api-uri",
    "id": "Z789-6789-678944",
    "subject": "/resources-relationships/k8s-policy_is-propagated-to_k8s-cluster/A234-1234-1234",
    "time": "2018-04-05T17:31:00Z",
    "datacontenttype" : "application/json",
    "data" :{
  "metadata": {
     "id": "A234-1234-1234",
     "relationship_type": "k8s-policy_is-propagated-to_k8s-cluster",
      "last_reported": "2018-04-05T17:31:00Z",
     "workspace": "workspace name",
 	    },
    "reporter_data": {
     "reporter_type": "ACM",
     "subject_local_resource_id": "policy-id-as-supplied-by-reporter",
     "object_local_resource_id": "cluster-id-as-supplied-by-reporter",
     "reporter_version": "2.12",
           "reporter_instance_id": "an id of the reporter",
    },
   "relationship_data": {
     "status": "NO_VIOLATION",
     "k8s_policy_id": "id-in-inventory",
     "k8s_cluster_id": "id-in-inventory",
        }
    }
}
```


#### Update a Relationship
```json
{
    "specversion" : "1.0",
    "type": "redhat.inventory.resources_relationship.k8s-policy_is-propagated-to_k8s-cluster.updated",
    "source": "inventory-api-uri",
    "id": "Z789-6789-678945",
    "subject": "/resources-relationships/k8s-policy_is-propagated-to_k8s-cluster/A234-1234-1234",
    "time": "2018-04-05T17:31:00Z",
    "datacontenttype" : "application/json",
    "data" :{
  "metadata": {
     "id": "A234-1234-1234",
     "relationship_type": "k8s-policy_is-propagated-to_k8s-cluster",
      "last_reported": "2018-04-05T17:31:00Z",
     "workspace": "workspace name",
 	    },
    "reporter_data": {
     "reporter_type": "ACM",
     "subject_local_resource_id": "policy-id-as-supplied-by-reporter",
     "object_local_resource_id": "cluster-id-as-supplied-by-reporter",
     "reporter_version": "2.12",
      "reporter_instance_id": "an id of the reporter",
    },
   "relationship_data": {
     "status": "NO_VIOLATION",
     "k8s_policy_id": "id-in-inventory",
     "k8s_cluster_id": "id-in-inventory",
        }
    }
}
```


#### Delete a Relationship
```json
{

"specversion" : "1.0",
    "type": "redhat.inventory.resources_relationship.k8s-policy_is-propagated-to_k8s-cluster.deleted",
    "source": "inventory-api-uri",
    "id": "Z789-6789-678946",
    "subject": "/resources-relationships/k8s-policy_is-propagated-to_k8s-cluster/A234-1234-1234",
    "time": "2018-04-05T17:31:00Z",
    "datacontenttype" : "application/json",
    "data" :{
    "metadata": {
     "id": "A234-1234-1234",
     "relationship_type": "k8s-policy_is-propagated-to_k8s-cluster",
     "workspace": "workspace name",
 	    },
    "reporter_data": {
     "reporter_type": "ACM",
     "subject_local_resource_id": "policy-id-as-supplied-by-reporter",
     "object_local_resource_id": "cluster-id-as-supplied-by-reporter",
     "reporter_version": "2.12",
      "reporter_instance_id": "an id of the reporter",
        }
    }
}
```
