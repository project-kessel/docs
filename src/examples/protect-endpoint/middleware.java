package com.example.kessel;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

import org.project_kessel.api.inventory.v1beta2.*;
import org.project_kessel.api.rbac.v2.Utils;
import static org.project_kessel.api.inventory.v1beta2.KesselInventoryServiceGrpc.KesselInventoryServiceBlockingStub;

//#region setup
public class ProtectEndpointExample {
    private final KesselInventoryServiceBlockingStub kesselClient;

    public ProtectEndpointExample() {
        this.kesselClient = new ClientBuilder("localhost:9000")
            .insecure()
            .build();
    }
//#endregion

//#region middleware
    // Servlet filter for permission checking
    public class PermissionFilter implements Filter {
        private final String relation;

        public PermissionFilter(String relation) {
            this.relation = relation;
        }

        @Override
        public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
                throws IOException, ServletException {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            HttpServletResponse httpResponse = (HttpServletResponse) response;

            String userId = httpRequest.getHeader("X-User-ID");
            String workspaceId = httpRequest.getHeader("X-Workspace-ID");

            if (userId == null || workspaceId == null) {
                httpResponse.sendError(HttpStatus.BAD_REQUEST.value(), "Missing required headers");
                return;
            }

            CheckRequest checkRequest = CheckRequest.newBuilder()
                .setObject(Utils.workspaceResource(workspaceId))
                .setRelation(relation)
                .setSubject(Utils.principalSubject(userId, "redhat"))
                .build();

            try {
                CheckResponse checkResponse = kesselClient.check(checkRequest);

                if (checkResponse.getAllowed() != Allowed.ALLOWED_TRUE) {
                    httpResponse.sendError(HttpStatus.FORBIDDEN.value(), "Forbidden");
                    return;
                }

                chain.doFilter(request, response);
            } catch (Exception e) {
                httpResponse.sendError(HttpStatus.INTERNAL_SERVER_ERROR.value(),
                    "Permission check failed");
            }
        }
    }
//#endregion

//#region usage
    @RestController
    @RequestMapping("/integrations")
    public class IntegrationController {

        @GetMapping("/{id}")
        public ResponseEntity<?> getIntegration(@PathVariable String id) {
            return ResponseEntity.ok(Map.of("integration_id", id));
        }

        @PutMapping("/{id}")
        public ResponseEntity<?> updateIntegration(@PathVariable String id) {
            return ResponseEntity.ok(Map.of("status", "updated"));
        }
    }
//#endregion
}
