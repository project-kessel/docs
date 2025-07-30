---
title: "Package: middleware"
docType: client-package
---

Package for reusable middleware or utilities not specific to transport (e.g. gRPC) or API version.

TODO: Doubtful of the below stance

It is okay to couple middleware to a specific API version internally. It is expected that, if used by clients, they are accounting for the support matrix of the SDKs and server versions. If the API of the middleware needs to change itself in a breaking way, bump the [package's version](#releases-and-versioning).

`.{integration}`: can be further nested if the middleware is only relevant to a particular integration (e.g. `middleware.django` or `middleware.spring`). Note treatment of [dependencies](#dependencies).
