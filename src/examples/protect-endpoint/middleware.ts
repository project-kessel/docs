import express, { Request, Response, NextFunction } from "express";
import { ClientBuilder } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2";
import { Allowed } from "@project-kessel/kessel-sdk/kessel/inventory/v1beta2/allowed";
import { principalSubject, workspaceResource } from "@project-kessel/kessel-sdk/kessel/rbac/v2";

//#region setup
const client = new ClientBuilder("localhost:9000")
  .insecure()
  .build();
//#endregion

//#region middleware
// Middleware to check permission
function requirePermission(relation: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers["x-user-id"] as string;
    const workspaceId = req.headers["x-workspace-id"] as string;

    if (!userId || !workspaceId) {
      return res.status(400).json({ error: "Missing required headers" });
    }

    try {
      const checkRequest = {
        object: workspaceResource(workspaceId),
        relation,
        subject: principalSubject(userId, "redhat"),
      };

      const response = await client.check(checkRequest);

      if (response.allowed !== Allowed.ALLOWED_TRUE) {
        return res.status(403).json({ error: "Forbidden" });
      }

      next();
    } catch (error) {
      console.error("Check failed:", error);
      return res.status(500).json({ error: "Permission check failed" });
    }
  };
}
//#endregion

//#region usage
const app = express();

app.get(
  "/integrations/:id",
  requirePermission("myservice_integration_view"),
  (req: Request, res: Response) => {
    res.json({ integration_id: req.params.id });
  }
);

app.put(
  "/integrations/:id",
  requirePermission("myservice_integration_edit"),
  (req: Request, res: Response) => {
    res.json({ status: "updated" });
  }
);

app.listen(8080);
//#endregion
