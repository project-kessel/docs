---
title: "Package: grpc"
docType: client-package
---

Package for utility methods or middleware specific to gRPC and are therefore only coupled to gRPC versions, not to a service API version (e.g. generic gRPC authentication middleware code goes here).

**MUST NOT** import anything from the other defined peer packages.

**SHOULD** expose utility methods to construct `CallCredentials` relevant to recommended Kessel authentication methods (e.g. OAuth), following the same pattern as gRPC / google-auth-\* libraries for that language.
