package com.porto.ciops.coa.obs.identityaccess;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@EnabledIfEnvironmentVariable(named = "IAM_INTEGRATION_DB_URL", matches = ".+")
class SecurityAdministrationIntegrationTest {

	private static final String ADMIN_PASSWORD = "Test-only-" + UUID.randomUUID();
	private static final String USER_PASSWORD = "Test-only-" + UUID.randomUUID();
	private static final String SESSION_NAMESPACE = "obs:identity:test:" + UUID.randomUUID();

	@LocalServerPort
	int port;

	@Autowired
	ObjectMapper json;

	@Autowired
	org.springframework.jdbc.core.simple.JdbcClient auditJdbc;

	@DynamicPropertySource
	static void properties(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", () -> System.getenv("IAM_INTEGRATION_DB_URL"));
		registry.add("spring.datasource.username", () -> System.getenv("IAM_INTEGRATION_DB_USERNAME"));
		registry.add("spring.datasource.password", () -> System.getenv("IAM_INTEGRATION_DB_PASSWORD"));
		registry.add("spring.data.redis.host", () -> "127.0.0.1");
		registry.add("spring.data.redis.port", () ->
			System.getenv().getOrDefault("IAM_INTEGRATION_REDIS_PORT", "56379")
		);
		registry.add("spring.data.redis.database", () -> 14);
		registry.add("spring.session.data.redis.namespace", () -> SESSION_NAMESPACE);
		registry.add("server.servlet.session.cookie.secure", () -> false);
		registry.add("obs.identity.security.production-mode", () -> false);
		registry.add("BOOTSTRAP_ADMIN_USERNAME", () -> "qa-admin");
		registry.add("BOOTSTRAP_ADMIN_PASSWORD", () -> ADMIN_PASSWORD);
		registry.add("logging.structured.format.console", () -> "");
		registry.add("debug", () -> false);
		registry.add("spring.devtools.add-properties", () -> false);
		registry.add("logging.level.root", () -> "INFO");
	}

	private HttpClient client() {
		return HttpClient.newBuilder()
			.cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
			.build();
	}

	private HttpResponse<String> request(
		HttpClient client,
		String method,
		String path,
		Object body,
		boolean csrf
	) throws Exception {
		var builder = HttpRequest.newBuilder(
			URI.create("http://127.0.0.1:" + port + "/api/v1" + path)
		).header("Accept", "application/json")
			.header("User-Agent", "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36");
		if (csrf) {
			JsonNode token = json.readTree(request(client, "GET", "/auth/csrf", null, false).body());
			builder.header(token.get("headerName").asText(), token.get("token").asText());
		}
		if (body != null) builder.header("Content-Type", "application/json");
		return client.send(
			builder
				.method(
					method,
					body == null
						? HttpRequest.BodyPublishers.noBody()
						: HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))
				)
				.build(),
			HttpResponse.BodyHandlers.ofString()
		);
	}

	private JsonNode ok(HttpResponse<String> response, int status) {
		assertThat(response.statusCode())
			.withFailMessage("Expected %s but got %s: %s", status, response.statusCode(), response.body())
			.isEqualTo(status);
		return response.body().isBlank() ? null : json.readTree(response.body());
	}

	@Test
	void managesLocalAccountsGroupsPermissionsSessionsAndExternalProviderDrafts() throws Exception {
		var admin = client();
		ok(request(admin, "GET", "/security/users", null, false), 401);
		ok(
			request(
				admin,
				"POST",
				"/auth/login/local",
				Map.of("username", "qa-admin", "credential", ADMIN_PASSWORD),
				false
			),
			403
		);
		ok(
			request(
				admin,
				"POST",
				"/auth/login/local",
				Map.of("username", "qa-admin", "credential", "incorrect-password"),
				true
			),
			401
		);
		ok(
			request(
				admin,
				"POST",
				"/auth/login/local",
				Map.of("username", "qa-admin", "credential", ADMIN_PASSWORD),
				true
			),
			200
		);
		var me = ok(request(admin, "GET", "/me", null, false), 200);
		String adminSubject = me.get("subject").asText();
		assertThat(me.get("permissions").toString()).contains("identity:write", "session:revoke");

		ok(
			request(
				admin,
				"POST",
				"/security/permissions",
				Map.of("key", "report:read", "description", "Read reports"),
				true
			),
			200
		);
		ok(
			request(
				admin,
				"POST",
				"/security/roles",
				Map.of(
					"key",
					"QA_READER",
					"displayName",
					"QA reader",
					"description",
					"Test",
					"enabled",
					true,
					"permissions",
					List.of("report:read")
				),
				true
			),
			201
		);
		var user = ok(
			request(
				admin,
				"POST",
				"/security/users",
				Map.of(
					"username",
					"qa-reader",
					"displayName",
					"QA reader",
					"email",
					"qa@example.test",
					"enabled",
					true,
					"roles",
					List.of(),
					"groups",
					List.of(),
					"password",
					USER_PASSWORD
				),
				true
			),
			201
		);
		String subject = user.get("subject").asText();
		assertThat(user.toString()).doesNotContain(USER_PASSWORD, "password_hash");
		ok(
			request(
				admin,
				"POST",
				"/security/groups",
				Map.of(
					"key",
					"qa-team",
					"displayName",
					"QA team",
					"description",
					"Test",
					"enabled",
					true,
					"roles",
					List.of("QA_READER"),
					"members",
					List.of(subject)
				),
				true
			),
			201
		);
		var reader = client();
		ok(
			request(
				reader,
				"POST",
				"/auth/login/local",
				Map.of("username", "qa-reader", "credential", USER_PASSWORD),
				true
			),
			200
		);
		assertThat(
			ok(request(reader, "GET", "/me", null, false), 200)
				.get("permissions")
				.toString()
		).contains("report:read");
		ok(request(reader, "GET", "/security/users", null, false), 403);
		ok(request(admin, "PUT", "/security/roles/QA_READER",
			Map.of("key", "QA_READER", "displayName", "QA reader", "description", "Test",
				"enabled", true, "permissions", List.of("identity:write")), true), 200);
		ok(request(reader, "POST", "/security/users/" + adminSubject + "/password",
			Map.of("password", "Must-not-replace-admin-password"), true), 403);
		var sessions = ok(request(admin, "GET", "/security/sessions?subject=" + subject, null, false), 200);
		assertThat(sessions.size()).isEqualTo(1);
		assertThat(sessions.get(0).get("reference").asText()).matches("[a-f0-9]{64}");
		assertThat(sessions.get(0).get("browser").asText()).isEqualTo("Chrome");
		assertThat(sessions.get(0).get("providerId").asText()).isEqualTo("local");
		var secondReader = client();
		var thirdReader = client();
		for (var other : List.of(secondReader, thirdReader)) {
			ok(request(other, "POST", "/auth/login/local", Map.of("username", "qa-reader", "credential", USER_PASSWORD), true), 200);
		}
		var overview = ok(request(admin, "GET", "/security/sessions/overview?subject=" + subject, null, false), 200);
		assertThat(overview.get("subject").asText()).isEqualTo(subject);
		assertThat(overview.get("checkedAt").asText()).isNotBlank();
		assertThat(overview.get("items").size()).isEqualTo(3);
		var references = new java.util.ArrayList<String>();
		for (var item : overview.get("items")) {
			if (!item.get("reference").asText().equals(sessions.get(0).get("reference").asText())) references.add(item.get("reference").asText());
		}
		var command = Map.of("subject", subject, "references", references, "reason", "SUSPICIOUS_ACTIVITY");
		ok(request(reader, "GET", "/security/sessions/overview?subject=" + subject, null, false), 403);
		ok(request(reader, "POST", "/security/sessions/revoke", command, true), 403);
		ok(request(admin, "POST", "/security/sessions/revoke", command, false), 403);
		var bulk = ok(request(admin, "POST", "/security/sessions/revoke", command, true), 200);
		assertThat(bulk.get("revoked").asInt()).isEqualTo(2);
		assertThat(bulk.get("currentRevoked").asBoolean()).isFalse();
		ok(request(secondReader, "GET", "/me", null, false), 401);
		ok(request(thirdReader, "GET", "/me", null, false), 401);
		ok(request(reader, "GET", "/me", null, false), 200);
		assertThat(ok(request(admin, "POST", "/security/sessions/revoke", command, true), 200).get("alreadyEnded").asInt()).isEqualTo(2);
		assertThat(auditJdbc.sql("select count(*) from public.audit_event where event_type='session.revoked' and source_context like '%SUSPICIOUS_ACTIVITY%'").query(Long.class).single()).isEqualTo(2);
		var extraAdmin = client();
		ok(request(extraAdmin, "POST", "/auth/login/local", Map.of("username", "qa-admin", "credential", ADMIN_PASSWORD), true), 200);
		var selfOverview = ok(request(extraAdmin, "GET", "/security/sessions/overview?subject=" + adminSubject, null, false), 200);
		String selfReference = null;
		for (var item : selfOverview.get("items")) if (item.get("current").asBoolean()) selfReference = item.get("reference").asText();
		assertThat(selfReference).isNotNull();
		assertThat(ok(request(extraAdmin, "POST", "/security/sessions/revoke", Map.of("subject", adminSubject, "references", List.of(selfReference), "reason", "USER_REQUEST"), true), 200).get("currentRevoked").asBoolean()).isTrue();
		ok(request(extraAdmin, "GET", "/me", null, false), 401);
		ok(request(admin, "GET", "/me", null, false), 200);
		ok(
			request(
				admin,
				"PUT",
				"/security/roles/QA_READER",
				Map.of(
					"key",
					"QA_READER",
					"displayName",
					"QA reader",
					"description",
					"Test",
					"enabled",
					true,
					"permissions",
					List.of()
				),
				true
			),
			200
		);
		assertThat(
			ok(request(reader, "GET", "/me", null, false), 200)
				.get("permissions")
				.isEmpty()
		).isTrue();
		ok(
			request(
				admin,
				"DELETE",
				"/security/sessions/" + sessions.get(0).get("reference").asText() + "?subject=" + subject,
				null,
				true
			),
			204
		);
		ok(request(reader, "GET", "/me", null, false), 401);
		ok(
			request(
				reader,
				"POST",
				"/auth/login/local",
				Map.of("username", "qa-reader", "credential", USER_PASSWORD),
				true
			),
			200
		);
		ok(
			request(
				admin,
				"PUT",
				"/security/users/" + subject,
				Map.of(
					"username",
					"qa-reader",
					"displayName",
					"QA reader",
					"email",
					"qa@example.test",
					"enabled",
					false,
					"roles",
					List.of(),
					"groups",
					List.of("qa-team")
				),
				true
			),
			200
		);
		ok(request(reader, "GET", "/me", null, false), 401);
		ok(
			request(
				reader,
				"POST",
				"/auth/login/local",
				Map.of("username", "qa-reader", "credential", USER_PASSWORD),
				true
			),
			401
		);
		ok(
			request(
				admin,
				"PUT",
				"/security/users/" + adminSubject,
				Map.of(
					"username",
					"qa-admin",
					"displayName",
					"Administrador",
					"enabled",
					true,
					"roles",
					List.of(),
					"groups",
					List.of()
				),
				true
			),
			400
		);
		assertThat(
			ok(request(admin, "GET", "/me", null, false), 200)
				.get("roles")
				.toString()
		).contains("OBS_ADMIN");

		var configuration = Map.of(
			"url",
			"ldaps://directory.example.test:636",
			"base-dn",
			"dc=example,dc=test",
			"bind-credential-reference",
			"secret://identity/ldap/password"
		);
		var provider = ok(
			request(
				admin,
				"POST",
				"/providers",
				Map.of(
					"id",
					"qa-ldap",
					"displayName",
					"QA LDAP",
					"type",
					"LDAP",
					"priority",
					10,
					"configuration",
					configuration,
					"attributeMappings",
					Map.of("subject", "uid", "username", "uid", "groups", "memberOf")
				),
				true
			),
			201
		);
		assertThat(provider.get("configuration").get("bind-credential-reference").asText()).isEqualTo(
			"[REDACTED]"
		);
		ok(
			request(
				admin,
				"PUT",
				"/providers/qa-ldap",
				Map.of(
					"id",
					"qa-ldap",
					"displayName",
					"QA LDAP updated",
					"type",
					"LDAP",
					"priority",
					10,
					"configuration",
					Map.of(
						"url",
						"ldaps://directory.example.test:636",
						"base-dn",
						"dc=example,dc=test",
						"bind-credential-reference",
						"[REDACTED]"
					),
					"attributeMappings",
					Map.of("subject", "uid", "username", "uid", "groups", "memberOf")
				),
				true
			),
			200
		);
		var events = ok(request(admin, "GET", "/security/audit?limit=100", null, false), 200);
		assertThat(events.get("items").toString()).contains(
			"identity.created",
			"group.created",
			"role.updated",
			"session.revoked"
		);
		assertThat(events.toString()).doesNotContain(
			ADMIN_PASSWORD,
			USER_PASSWORD,
			"secret://identity/ldap/password"
		);
		verifyAuditQueriesAndExports(admin);
		ok(
			request(
				admin,
				"POST",
				"/security/users/" + subject + "/password",
				Map.of("password", "New-test-password-456"),
				true
			),
			204
		);
		ok(
			request(
				admin,
				"POST",
				"/me/password",
				Map.of("currentPassword", ADMIN_PASSWORD, "newPassword", "Changed-test-password-456"),
				true
			),
			200
		);
		ok(request(admin, "GET", "/me", null, false), 401);
		ok(
			request(
				admin,
				"POST",
				"/auth/login/local",
				Map.of("username", "qa-admin", "credential", "Changed-test-password-456"),
				true
			),
			200
		);
		ok(request(admin, "POST", "/auth/logout", null, true), 204);
		ok(request(admin, "GET", "/me", null, false), 401);
	}

	private void verifyAuditQueriesAndExports(HttpClient admin) throws Exception {
		var now=java.time.Instant.now();
		for(int n=0;n<30;n++) {
			auditJdbc.sql("insert into public.audit_event(id,occurred_at,event_type,actor_subject,target,provider_id,outcome,trace_id,source_context) values(:id,:at,'qa.audit','qa-actor',:target,'local',:outcome,:trace,'qa-context')")
				.param("id",UUID.randomUUID()).param("at",now.minusSeconds(3600-n*60).atOffset(java.time.ZoneOffset.UTC))
				.param("target",n==0?"=SUM(1+1)":"qa-resource-"+n).param("outcome",List.of("SUCCESS","FAILURE","DENIED").get(n%3)).param("trace","qa-trace-"+n).update();
		}
		var page=ok(request(admin,"GET","/security/audit?eventType=qa.audit&sort=occurredAt&direction=asc&limit=7",null,false),200);
		assertThat(page.get("total").asInt()).isEqualTo(30);
		assertThat(page.get("totals").get("failure").asInt()).isEqualTo(10);
		assertThat(page.get("items").size()).isEqualTo(7);
		assertThat(page.get("items").get(0).get("target").asText()).isEqualTo("=SUM(1+1)");
		String cutoff=java.net.URLEncoder.encode(page.get("filters").get("snapshotAt").asText(),java.nio.charset.StandardCharsets.UTF_8);
		var next=ok(request(admin,"GET","/security/audit?eventType=qa.audit&sort=occurredAt&direction=asc&limit=7&offset=7&snapshotAt="+cutoff,null,false),200);
		assertThat(next.get("items").get(0).get("target").asText()).isEqualTo("qa-resource-7");
		assertThat(ok(request(admin,"GET","/security/audit?eventType=qa.audit&outcome=DENIED&providerId=local&actor=qa-actor&target=resource&traceId=qa-trace-2",null,false),200).get("total").asInt()).isEqualTo(1);
		ok(request(admin,"GET","/security/audit?sort=unknown",null,false),400);
		ok(request(admin,"GET","/security/audit?query=%27%20or%201%3D1--",null,false),200);
		ok(request(admin,"POST","/security/audit/export?eventType=qa.audit",Map.of("format","json","purpose","Investigação autorizada de QA"),false),403);
		for(String format:List.of("json","csv","xlsx","pdf")) {
			JsonNode token=json.readTree(request(admin,"GET","/auth/csrf",null,false).body());
			var httpRequest=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1/security/audit/export?eventType=qa.audit&sort=occurredAt&direction=asc&limit=7&offset=7&snapshotAt="+cutoff))
				.header("Content-Type","application/json").header(token.get("headerName").asText(),token.get("token").asText())
				.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of("format",format,"purpose","Investigação autorizada de QA")))).build();
			var file=admin.send(httpRequest,HttpResponse.BodyHandlers.ofByteArray());
			assertThat(file.statusCode()).withFailMessage("Export %s failed: %s",format,new String(file.body(),java.nio.charset.StandardCharsets.UTF_8)).isEqualTo(200);
			assertThat(file.headers().firstValue("X-Audit-Record-Count").orElse("")).isEqualTo("30");
			assertThat(file.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
			if(format.equals("json")) {
				var evidence=json.readTree(file.body());assertThat(evidence.get("events").size()).isEqualTo(30);
				String hash=java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(evidence.get("events"))));
				assertThat(evidence.get("metadata").get("datasetSha256").asText()).isEqualTo(hash);
				assertThat(evidence.get("events").get(0).get("target").asText()).isEqualTo("=SUM(1+1)");
			} else if(format.equals("xlsx"))try(var book=new org.apache.poi.xssf.usermodel.XSSFWorkbook(new java.io.ByteArrayInputStream(file.body()))){
				assertThat(book.getSheet("Eventos").getLastRowNum()).isEqualTo(30);assertThat(book.getSheet("Evidência")).isNotNull();
			} else if(format.equals("pdf"))try(var pdf=org.apache.pdfbox.Loader.loadPDF(file.body())){
				assertThat(new org.apache.pdfbox.text.PDFTextStripper().getText(pdf)).contains("qa-resource-29");
			} else assertThat(new String(file.body(),java.nio.charset.StandardCharsets.UTF_8)).contains("'=SUM(1+1)","export_metadata_json");
		}
		assertThat(auditJdbc.sql("select count(*) from public.audit_export_receipt").query(Long.class).single()).isEqualTo(4);
		assertThat(auditJdbc.sql("select count(*) from public.audit_event where event_type='audit.exported'").query(Long.class).single()).isEqualTo(4);
		ok(request(admin,"POST","/security/audit/export",Map.of("format","exe","purpose","Investigação autorizada"),true),400);
		ok(request(admin,"POST","/security/audit/export",Map.of("format","json","purpose","x"),true),400);
		auditJdbc.sql("insert into public.audit_event(id,occurred_at,event_type,actor_subject,target,outcome) select gen_random_uuid(),current_timestamp,'qa.volume','qa','volume','SUCCESS' from generate_series(1,10001)").update();
		ok(request(admin,"POST","/security/audit/export?eventType=qa.volume",Map.of("format","csv","purpose","Validação do limite de volume"),true),400);
		ok(request(admin,"POST","/security/audit/export?eventType=qa.volume",Map.of("format","pdf","purpose","Validação do limite de volume"),true),400);
		assertThat(auditJdbc.sql("select count(*) from public.audit_export_receipt").query(Long.class).single()).isEqualTo(4);
		ok(request(admin,"POST","/security/roles",Map.of("key","QA_AUDITOR","displayName","Auditor de consulta","description","QA","enabled",true,"permissions",List.of("audit:read")),true),201);
		ok(request(admin,"POST","/security/users",Map.of("username","qa-auditor","displayName","Auditor","enabled",true,"roles",List.of("QA_AUDITOR"),"groups",List.of(),"password",USER_PASSWORD),true),201);
		var auditor=client();ok(request(auditor,"POST","/auth/login/local",Map.of("username","qa-auditor","credential",USER_PASSWORD),true),200);
		ok(request(auditor,"GET","/security/audit?eventType=qa.audit",null,false),200);
		ok(request(auditor,"POST","/security/audit/export?eventType=qa.audit",Map.of("format","json","purpose","Tentativa de exportação sem permissão"),true),403);
		ok(request(admin,"PUT","/security/roles/QA_AUDITOR",Map.of("key","QA_AUDITOR","displayName","Auditor de exportação","description","QA","enabled",true,"permissions",List.of("audit:read","audit:export")),true),200);
		String adminSubject=ok(request(admin,"GET","/me",null,false),200).get("subject").asText();
		auditJdbc.sql("insert into public.audit_event(id,occurred_at,event_type,actor_subject,target,outcome) values(:id,current_timestamp,'qa.named',:actor,'qa-personal-data','SUCCESS')")
			.param("id",UUID.randomUUID()).param("actor",adminSubject).update();
		var minimized=ok(request(auditor,"POST","/security/audit/export?eventType=qa.named",Map.of("format","json","purpose","Verificação da minimização de dados"),true),200);
		assertThat(minimized.get("events").get(0).get("actorUsername").isNull()).isTrue();
		assertThat(minimized.get("metadata").get("actorNamesIncluded").asBoolean()).isFalse();
		ok(request(auditor,"POST","/security/audit/export?eventType=qa.named",Map.of("format","json","purpose","Verificação da restrição de dados","includeActorNames",true),true),403);
		var enriched=ok(request(admin,"POST","/security/audit/export?eventType=qa.named",Map.of("format","json","purpose","Verificação da consulta autorizada","includeActorNames",true),true),200);
		assertThat(enriched.get("events").get(0).get("actorUsername").asText()).isEqualTo("qa-admin");
		var plan=auditJdbc.sql("explain (analyze,buffers) select a.id,a.occurred_at,a.event_type,p.username from public.audit_event a left join public.platform_identity p on p.subject=a.actor_subject where a.event_type='qa.volume' and a.occurred_at>=current_timestamp-interval '30 days' order by a.occurred_at desc,a.id desc limit 100").query(String.class).list();
		java.nio.file.Files.write(java.nio.file.Path.of("target/audit-query-plan.txt"),plan);
	}
}
