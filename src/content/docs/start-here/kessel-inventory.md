---
title: Kessel Inventory
---

# Kessel Inventory

Kessel Inventory is a service that keeps track of resources (`rhel-host`, `k8s-policy`, `k8s-cluster`, `integrations`, etc)
and the relationships (distinct from Kessel Relations) between each resource (e.g., `k8s-policy` -- `is-propagated-to` --> `k8s-cluster`).

Each resource can contain internal information, such as cluster version, node details, severity, etc.

It relies on services reporting the status of each resource and relations between those.

To prevent services from having to save yet another id, Kessel Inventory will accept the reporter's resource id in lieu
of any id that is stored in Kessel Inventory's database. As such, API calls that address a particular resource 
will require the following tuple to identify a resource:
- `local_resource_id` - Id of the resource used by the reporter.
- `resource_type` - Resource type as identified by Kessel Inventory. e.g., `rhel-host`, `integrations`, `k8s-cluster`, etc.
- `reporter_id` - Id of the reporter.
- `reporter_type` - Type of reporter. e.g., `OCM`, 'ACM', 'HBI', etc.

## Persistence

Resources and relationships are saved in a SQL database, with the specifics of each resource stored as a JSON blob.

The primary tables are `resources` and `relationships` where we store the resources and relationships data 
respectively. Each of these tables has a corresponding `_history` table where changes are stored, along with the operation that triggered the event. 

Lastly, we have the `local_to_inventory_id` table that maps a reporter's resource identifier to an id used in the database.

### Database diagram

An Entity-Relationship diagram is provided below. 

Note: Entities ResourceReporter and RelationshipReporter are actually attributes in JSON format of other entities and not an entity on its own.

```mermaid
erDiagram
    Resource {
        uint64 id
        string org_id
        json resource_data
        string resource_type
        uuid workspace_id
        ResourceReporter reporter
        string console_href
        string api_href
        Label[] labels
        date created_at
        date updated_at
    }

    ResourceHistory {
        uint64 id
        uint64 resource_id
        string org_id
        json resource_data
        string resource_type
        uuid workspace_id
        ResourceReporter reporter
        string console_href
        string api_href
        Label[] labels
        date timestamp
        string operation_type
    }

    Relationship {
        uint64 id
        string org_id
        json relationship_data
        string relationship_type
        uuid subject_id
        uuid object_id
        RelationshipReporter reporter
        date created_at
        date updated_at
    }

    RelationshipHistory {
        uint64 id
        uint64 relationship_id
        string org_id
        json relationship_data
        string relationship_type
        uuid subject_id
        uuid object_id
        RelationshipReporter reporter
        date timestamp
        string operation_type
    }

    LocalToInventoryId {
        uint64 resource_id
        date created_at
        string local_resource_id
        string resource_type
        string reporter_id
        string reporter_type
    }

    ResourceReporter["ResourceReporter<JSON>"] {
        string reporter_id
        string reporter_type
        string reporter_version
        string local_resource_id
    }

    RelationshipReporter["RelationshipReporter<JSON>"] {
        string reporter_id
        string reporter_type
        string reporter_version
        string subject_local_resource_id
        string object_local_resource_id
    }

    Label["Label<JSON>"] {
        string Key
        string Value
    }

    Resource |o--o{ ResourceHistory : has
    Relationship |o--o{ RelationshipHistory : has

    Relationship }|--|| Resource : subject
    Relationship }|--|| Resource : object

    LocalToInventoryId ||--o{ Resource : maps

%% Json maps
Resource ||--|| ResourceReporter : reporter
ResourceHistory ||--|| ResourceReporter : reporter

Resource ||--o{ Label : labels
ResourceHistory ||--o{ Label : labels

Relationship ||--|| RelationshipReporter : reporter
RelationshipHistory ||--|| RelationshipReporter : reporter
```

## Resources Lifecycle

Inventory keeps the latest data for a resource, but it also keeps a history of the changes.

When a resource is created, a new entry is added to the `resource_history` table, indicating the operation as `CREATE`.

The operation type (`CREATE`, `UPDATE` or `DELETE`) corresponds to the action taken on the resource.
Each entry in the `resource_history` may be deleted once it reach a certain time. 

### Resource lifecycle diagram

```mermaid
flowchart LR
%% Nodes
    CreateResource("Create Resource")
    CreateResourceExists{"Resource already reported?"}
    CreateResourceDo("Adds resource")
    CreateResourceHistory("Add resource_history(CREATE)")

    UpdateResource("Update Resource")
    UpdateResourceExists{"Resource already reported by same reporter?"}
    UpdateResourceDo("Updates resource")
    UpdateResourceHistory("Add resource_history(UPDATE)")

    DeleteResource("Delete Resource")
    DeleteResourceExists{"Resource exists?"}
    DeleteCopyResourceDo("Deletes resource")
    DeleteResourceHistory("Add resource_history(DELETE)")
    DeleteResourceRelationships("Deletes relations where this resource is the object or subject")

    Fail("Fail")

%% Links
    
    CreateResource --> CreateResourceExists
    CreateResourceExists -- No --> CreateResourceDo --> CreateResourceHistory
    CreateResourceExists -- Yes --> Fail

    UpdateResource --> UpdateResourceExists
    UpdateResourceExists -- No --> CreateResourceDo
    UpdateResourceExists -- Yes --> UpdateResourceDo --> UpdateResourceHistory

    DeleteResource --> DeleteResourceExists
    DeleteResourceExists -- No --> Fail
    DeleteResourceExists -- Yes --> DeleteCopyResourceDo --> DeleteResourceHistory --> DeleteResourceRelationships
```

### Relationship lifecycle

The lifecycle of a relationship is similar to a resource, as there is a history table where changes on the relationship are tracked.
It follows the same approach, indicating operations (`CREATE`, `UPDATE` and `DELETE`).
Note that when a resource is deleted, any associated relationships are also removed; however, no entry is made in the history table for these deletions.

### Relationship lifecycle diagram

```mermaid
flowchart LR
%% Nodes
    CreateRelationship("Create Relationship")
    CreateRelationshipExists{"Relationship already reported by same reporter?"}
    CreateRelationshipDo("Adds relationship")
    CreateRelationshipHistory("Add relationship_history(CREATE)")

    UpdateRelationship("Update Relationship")
    UpdateRelationshipExists{"Relationship already reported?"}
    UpdateRelationshipDo("Updates relationship")
    UpdateRelationshipHistory("Add relationship_history(UPDATE)")

    DeleteRelationship("Delete Relationship")
    DeleteRelationshipExists{"Relationship exists?"}
    DeleteCopyRelationshipDo("Deletes relationship")
    DeleteRelationshipHistory("Add relationship_history(DELETE)")

    ResourceIsDeleted("Resource is deleted")
    ResourceIsDeletedExists{"Is it part of any relationship?"}
    ResourceIsDeletedDeleteRelationship("Delete relationship")

    Fail("Fail")

%% Links

    CreateRelationship --> CreateRelationshipExists
    CreateRelationshipExists -- No --> CreateRelationshipDo --> CreateRelationshipHistory
    CreateRelationshipExists -- Yes --> Fail

    UpdateRelationship --> UpdateRelationshipExists
    UpdateRelationshipExists -- No --> CreateRelationshipDo
    UpdateRelationshipExists -- Yes --> UpdateRelationshipDo --> UpdateRelationshipHistory

    DeleteRelationship --> DeleteRelationshipExists
    DeleteRelationshipExists -- No --> Fail
    DeleteRelationshipExists -- Yes --> DeleteCopyRelationshipDo --> DeleteRelationshipHistory

    ResourceIsDeleted --> ResourceIsDeletedExists -- Yes --> ResourceIsDeletedDeleteRelationship
```
