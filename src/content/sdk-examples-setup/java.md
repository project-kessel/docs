---
language: "Java"
order: 60
---

#### Add dependency (Maven)
```xml
<dependency>
  <groupId>io.grpc</groupId>
  <artifactId>grpc-netty-shaded</artifactId>
  </dependency>
<dependency>
  <groupId>org.project-kessel</groupId>
  <artifactId>kessel-sdk</artifactId>
  <version>1.0.0</version>
</dependency>
<!-- Optional: Auth support for OAuth2 client credentials -->
<dependency>
  <groupId>com.nimbusds</groupId>
  <artifactId>oauth2-oidc-sdk</artifactId>
  <version>11.28</version>
</dependency>
```

#### Add dependency (Gradle)
```gradle
dependencies {
  implementation 'io.grpc:grpc-netty-shaded'
  implementation "org.project-kessel:kessel-sdk:1.0.0"
  // Optional: Auth support for OAuth2 client credentials
  implementation "com.nimbusds:oauth2-oidc-sdk:11.28"
}
```

#### Basic Client Setup
```java
import com.nimbusds.jose.util.Pair;
import io.grpc.ManagedChannel;
import org.project_kessel.api.inventory.v1beta2.ClientBuilder;
import static org.project_kessel.api.inventory.v1beta2.KesselInventoryServiceGrpc.KesselInventoryServiceBlockingStub;

String kesselEndpoint = System.getenv().getOrDefault("KESSEL_ENDPOINT", "localhost:9000");
Pair<KesselInventoryServiceBlockingStub, ManagedChannel> clientAndChannel =
    new ClientBuilder(kesselEndpoint)
        .insecure()
        .build();
KesselInventoryServiceBlockingStub client = clientAndChannel.getLeft();
```

#### Auth Client Setup
```java
import com.nimbusds.jose.util.Pair;
import io.grpc.ManagedChannel;
import org.project_kessel.api.auth.ClientConfigAuth;
import org.project_kessel.api.auth.OAuth2ClientCredentials;
import org.project_kessel.api.auth.OIDCDiscovery;
import org.project_kessel.api.auth.OIDCDiscoveryMetadata;
import org.project_kessel.api.inventory.v1beta2.ClientBuilder;
import static org.project_kessel.api.inventory.v1beta2.KesselInventoryServiceGrpc.KesselInventoryServiceBlockingStub;

String issuerUrl = System.getenv("AUTH_DISCOVERY_ISSUER_URL");
OIDCDiscoveryMetadata discovery = OIDCDiscovery.fetchOIDCDiscovery(issuerUrl);
ClientConfigAuth authConfig = new ClientConfigAuth(
    System.getenv("AUTH_CLIENT_ID"),
    System.getenv("AUTH_CLIENT_SECRET"),
    discovery.tokenEndpoint()
);
OAuth2ClientCredentials oauth = new OAuth2ClientCredentials(authConfig);

Pair<KesselInventoryServiceBlockingStub, ManagedChannel> clientAndChannel =
    new ClientBuilder(System.getenv().getOrDefault("KESSEL_ENDPOINT", "localhost:9000"))
        .oauth2ClientAuthenticated(oauth)
        .build();
KesselInventoryServiceBlockingStub client = clientAndChannel.getLeft();
```


