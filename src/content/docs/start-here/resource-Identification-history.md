The following is a list of scenarios that impact how resource history is maintained.  

### Resource Identification
The identification of a resource, i.e. _local_resource_id_, can not be assumed to be globally unique. However, this id can be assumed to be unique within the scope of the reporter for that resource type. In other words, a reporter can not have a host with the same id as another host, a cluster with the same id as another cluster, etc. 

Thus, in order to identify a resource, when a reporter does a POST, the POST must include the following:
 
- resource_type
- local_resource_id
- reporter_type

This says that the above tuple provides a unique identification of a resource. This is not quite the case.

When we say that a resource id is unique within the scope of the reporter, we really mean an instance of the reporter.  If a reporter can have more than one instance, e.g. one can have multiple ACM hub clusters, then we must be able to distinguish between instances to ensure uniqueness.  Thus, by capturing the reporter_instance_id, we can ensure uniqueness with the tuple:

- reporter_type
- reporter_instance_id
- resource_type
- local_resource_id

### Resource Identification and lifecycle
The above ensures that the identification of a resource is unique within the lifecycle of that managed resource. With respect to maintaining history of a resource, there are a couple of nuances that need to be considered: 

1. Once a reporter issues a delete of a resource, the reporter might reuse ids. For example, a user creates a cluster Foo. After some time, they delete this cluster.  At some future time, they decide to create a new cluster named Foo. Foo is still unique within the context of the reporter. However, Foo is not the same resource as the previous Foo. 

	Thus, inventory can not just blindly link any resource with the same ..reporter_type/reporter_instance_id/resource_type/local_resource_id. Similarly to how deduplication works across reporters, a resource_type-specific correlator must be used to see if this is the same resource. In the example of a cluster, there is an external_cluster_id that is used for deduplication.  In the example above, the first Foo and the second Foo would have different external_cluster_ids; thus, they are different clusters.

2. A delete, i.e. rest operation, tells inventory to delete this resource as it no longer exists within the management domain. However, there are 2 different types of delete. Using a cluster example: 
	1. One might issue a “destroy” which actually deletes the managed cluster. In this case, a delete would be issued to inventory. Any future creating of a cluster which could lead to conflict would be the same as #1 above.
	
	2. One might issue a “detach” which removes the cluster from management but does not impact the actual cluster. Given that this cluster still exists, one could decide to bring this cluster back under management, i.e. import the cluster.  In this case, the cluster could have a different local_resource_id, but the cluster is actually the same resource, i.e. it has the same external_resource_id. This case is very similar to having 2 different reporters reporting on the same resource where deduplication resolves that these are the same resource and we would link them in history. 
	
Given the above, without a correlator defined in the resource model, a specific resource_type can not have: 

- more than one reporter type 
- more than one reporter instance
- a resource span across a delete in history, even if the delete is a “detach”

Currently, the only resource model that has a correlator is a k8s-cluster.


