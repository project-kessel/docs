---
title: Understanding Kessel
description: Learn about Kessel's concepts and how they can be leveraged to unify APIs.
---

In the simplest terms, Kessel is an inventory of resources, how they relate to one another, and how they change over time.

A "resource" can be anything: a file, a virtual white board, a linux host, a kubernetes cluster, and so on. If you are building a REST service, the resources it manages are resources to Kessel.

In many such resource-based APIs, you often need to design for several things:

- Organization of resources among tenants. Tenants can be separate customers or departments or projects within a customer. You often have both.
- Sharing of resources between users.
- Entilement of functionality or "platform" resources to tenants (e.g. different subscription plans or licensed content).
- Tracking changes to resources over time, so users can query history.
- Publishing changes to resources, so integrated workloads can react to them and automate workflows.

This can be particularly challenging in environments with many such APIs that need to share consistent semantics. For example, if your platform supports many resource types (e.g. documents, spreadsheets, and slides), if these are not all built within a monolithic service or by a single team, it can be difficult to get them to all _feel_ like they are part of the same application and experience to users. Using the same example, let's say you want to organize those resources in folders. You need them all to map to those folders the same way across each application, so organization, bulk actions, and sharing are consistent.

Kessel Inventory provides the primitives to deliver these capabilities, at scale, without reinventing them. Additionally, Kessel RBAC is a service which provides an opinionated (but highly reusable) RBAC and tenancy model out of the box.
