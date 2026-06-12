package main

import (
	"context"
	"net/http"
	"os"

	"github.com/project-kessel/kessel-sdk-go/kessel/inventory/v1beta2"
	v2 "github.com/project-kessel/kessel-sdk-go/kessel/rbac/v2"
)

var kesselClient v1beta2.KesselInventoryServiceClient

//#region setup
func init() {
	client, conn, err := v1beta2.NewClientBuilder(os.Getenv("KESSEL_ENDPOINT")).
		Insecure().
		Build()
	if err != nil {
		panic(err)
	}
	kesselClient = client
	// Note: In production, handle conn.Close() properly
}
//#endregion

//#region middleware
// RequirePermission middleware checks if user has required permission
func RequirePermission(relation string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract user from header (from your auth middleware)
		userID := r.Header.Get("X-User-ID")
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Extract workspace ID from header or request context
		workspaceID := r.Header.Get("X-Workspace-ID")
		if workspaceID == "" {
			http.Error(w, "Missing workspace", http.StatusBadRequest)
			return
		}

		// Check permission
		checkReq := &v1beta2.CheckRequest{
			Object:   v2.WorkspaceResource(workspaceID),
			Relation: relation,
			Subject:  v2.PrincipalSubject(userID, "redhat"),
		}

		response, err := kesselClient.Check(context.Background(), checkReq)
		if err != nil {
			http.Error(w, "Permission check failed", http.StatusInternalServerError)
			return
		}

		if response.Allowed != v1beta2.Allowed_ALLOWED_TRUE {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		// Permission granted
		next(w, r)
	}
}
//#endregion

//#region usage
func main() {
	http.HandleFunc("GET /integrations/{id}", RequirePermission("myservice_integration_view", getIntegrationHandler))
	http.HandleFunc("PUT /integrations/{id}", RequirePermission("myservice_integration_edit", updateIntegrationHandler))

	http.ListenAndServe(":8080", nil)
}

func getIntegrationHandler(w http.ResponseWriter, r *http.Request) {
	// Handle GET request
}

func updateIntegrationHandler(w http.ResponseWriter, r *http.Request) {
	// Handle PUT request
}
//#endregion
