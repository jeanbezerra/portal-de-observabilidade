package com.porto.ciops.coa.obs.workflow;

import java.util.List;
import java.util.Map;

import io.restassured.http.ContentType;
import org.jbpm.usertask.jpa.springboot.SpringBootJPAUserTaskInstances;
import org.junit.jupiter.api.Test;
import org.kie.kogito.Model;
import org.kie.kogito.auth.IdentityProvider;
import org.kie.kogito.auth.IdentityProviders;
import org.kie.kogito.auth.SecurityPolicy;
import org.kie.kogito.process.Process;
import org.kie.kogito.process.ProcessInstance;
import org.kie.kogito.process.WorkItem;
import org.kie.kogito.usertask.UserTaskInstance;
import org.kie.kogito.usertask.UserTasks;
import org.kie.kogito.usertask.impl.lifecycle.DefaultUserTaskLifeCycle;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ApprovalRequestsProcessTest {

    @Autowired
    @Qualifier("approvalRequests")
    Process<? extends Model> approvalRequests;

    @Autowired
    UserTasks userTasks;

    @LocalServerPort
    int port;

    @Test
    void shouldExecuteTheTwoApprovalLevels() {
        assertThat(userTasks.instances()).isInstanceOf(SpringBootJPAUserTaskInstances.class);

        Model model = approvalRequests.createModel();
        model.fromMap(Map.of(
                "requestId", "REL-2026-0001",
                "title", "Liberar mudanca em producao",
                "requester", "jean"));

        ProcessInstance<?> instance = approvalRequests.createInstance(model);
        instance.start();

        assertThat(instance.status()).isEqualTo(ProcessInstance.STATE_ACTIVE);

        IdentityProvider ana = IdentityProviders.of("ana", List.of("approvers"));
        SecurityPolicy firstApprover = SecurityPolicy.of(ana);
        List<WorkItem> firstTasks = instance.workItems(firstApprover);
        assertThat(firstTasks).singleElement();

        UserTaskInstance firstTask = userTasks.instances().findByIdentity(ana).getFirst();
        firstTask.transition(DefaultUserTaskLifeCycle.CLAIM, Map.of(), ana);
        firstTask.setOutput("approved", true);
        firstTask.setOutput("comment", "Risco revisado");
        firstTask.transition(DefaultUserTaskLifeCycle.COMPLETE, Map.of(), ana);

        instance = approvalRequests.instances().findById(instance.id()).orElseThrow();
        String instanceId = instance.id();
        assertThat(((Model) instance.variables()).toMap())
                .containsEntry("firstApprover", "ana");
        assertThat(userTasks.instances().findByIdentity(ana))
                .noneMatch(candidate -> candidate.getProcessInfo().getProcessInstanceId().equals(instanceId));

        IdentityProvider bruno = IdentityProviders.of("bruno", List.of("approvers"));
        SecurityPolicy secondApprover = SecurityPolicy.of(bruno);
        List<WorkItem> secondTasks = instance.workItems(secondApprover);
        assertThat(secondTasks).singleElement();

        UserTaskInstance secondTask = userTasks.instances().findByIdentity(bruno).stream()
                .filter(candidate -> candidate.getProcessInfo().getProcessInstanceId().equals(instanceId))
                .findFirst()
                .orElseThrow();
        assertThat(secondTask.getExcludedUsers()).contains("ana");
        assertThatThrownBy(() -> secondTask.transition(DefaultUserTaskLifeCycle.CLAIM, Map.of(), ana))
                .isInstanceOf(RuntimeException.class);
        secondTask.transition(DefaultUserTaskLifeCycle.CLAIM, Map.of(), bruno);
        secondTask.setOutput("approved", true);
        secondTask.setOutput("comment", "Liberacao autorizada");
        secondTask.transition(DefaultUserTaskLifeCycle.COMPLETE, Map.of(), bruno);

        assertThat(secondTask.getOutputs())
                .containsEntry("approved", true)
                .containsEntry("comment", "Liberacao autorizada");
        assertThat(approvalRequests.instances().findById(instance.id())).isEmpty();
    }

    @Test
    void shouldStopWhenTheFirstApprovalRejectsTheRequest() {
        Model model = approvalRequests.createModel();
        model.fromMap(Map.of(
                "requestId", "REL-2026-REJECTED",
                "title", "Liberacao reprovada",
                "requester", "jean"));

        ProcessInstance<?> instance = approvalRequests.createInstance(model);
        instance.start();

        IdentityProvider ana = IdentityProviders.of("ana", List.of("approvers"));
        UserTaskInstance task = userTasks.instances().findByIdentity(ana).stream()
                .filter(candidate -> candidate.getProcessInfo().getProcessInstanceId().equals(instance.id()))
                .findFirst()
                .orElseThrow();

        task.transition(DefaultUserTaskLifeCycle.CLAIM, Map.of(), ana);
        task.setOutput("approved", false);
        task.setOutput("comment", "Risco inaceitavel");
        task.transition(DefaultUserTaskLifeCycle.COMPLETE, Map.of(), ana);

        assertThat(approvalRequests.instances().findById(instance.id())).isEmpty();
        assertThat(userTasks.instances().findByIdentity(
                IdentityProviders.of("bruno", List.of("approvers"))))
                .noneMatch(candidate -> candidate.getProcessInfo().getProcessInstanceId().equals(instance.id()));
    }

    @Test
    void shouldExposeTheWorkflowAndOpenApiOverHttp() {
        given()
                .port(port)
                .when()
                .get("/api-docs")
                .then()
                .statusCode(200)
                .body("info.title", equalTo("Workflow Service API"));

        String instanceId = given()
                .port(port)
                .contentType(ContentType.JSON)
                .accept(ContentType.JSON)
                .body(Map.of("requestId", "REL-2026-0002",
                        "title", "Aprovar acesso temporario",
                        "requester", "jean"))
                .when()
                .post("/approvalRequests")
                .then()
                .statusCode(201)
                .header("Location", notNullValue())
                .body("requestId", equalTo("REL-2026-0002"))
                .extract().path("id");

        String firstSelector = "find { it.processInfo.processInstanceId == '" + instanceId
                + "' && it.taskName == 'firstLineApproval' }";
        String firstTaskId = given()
                .port(port)
                .queryParam("user", "ana")
                .queryParam("group", "approvers")
                .when()
                .get("/usertasks/instance")
                .then()
                .statusCode(200)
                .body(firstSelector + ".taskName", equalTo("firstLineApproval"))
                .extract().path(firstSelector + ".id");

        assertThat(firstTaskId).isNotBlank();

        given()
                .port(port)
                .queryParam("user", "ana")
                .queryParam("group", "approvers")
                .contentType(ContentType.JSON)
                .body(Map.of("transitionId", "claim", "data", Map.of()))
                .when()
                .post("/usertasks/instance/{taskId}/transition", firstTaskId)
                .then()
                .statusCode(200)
                .body("status.name", equalTo("Reserved"));

        given()
                .port(port)
                .queryParam("user", "ana")
                .queryParam("group", "approvers")
                .contentType(ContentType.JSON)
                .body(Map.of("transitionId", "complete",
                        "data", Map.of("approved", true, "comment", "Risco revisado")))
                .when()
                .post("/usertasks/instance/{taskId}/transition", firstTaskId)
                .then()
                .statusCode(200)
                .body("status.name", equalTo("Completed"));

        given()
                .port(port)
                .when()
                .get("/approvalRequests/{id}", instanceId)
                .then()
                .statusCode(200)
                .body("firstApprover", equalTo("ana"))
                .body("firstLineApproval", equalTo(true));

        String secondSelector = "find { it.processInfo.processInstanceId == '" + instanceId
                + "' && it.taskName == 'secondLineApproval' }";
        String secondTaskId = given()
                .port(port)
                .queryParam("user", "bruno")
                .queryParam("group", "approvers")
                .when()
                .get("/usertasks/instance")
                .then()
                .statusCode(200)
                .body(secondSelector + ".taskName", equalTo("secondLineApproval"))
                .body(secondSelector + ".excludedUsers", hasItem("ana"))
                .extract().path(secondSelector + ".id");

        given()
                .port(port)
                .queryParam("user", "ana")
                .queryParam("group", "approvers")
                .contentType(ContentType.JSON)
                .body(Map.of("transitionId", "claim", "data", Map.of()))
                .when()
                .post("/usertasks/instance/{taskId}/transition", secondTaskId)
                .then()
                .statusCode(403);

        given()
                .port(port)
                .queryParam("user", "bruno")
                .queryParam("group", "approvers")
                .contentType(ContentType.JSON)
                .body(Map.of("transitionId", "claim", "data", Map.of()))
                .when()
                .post("/usertasks/instance/{taskId}/transition", secondTaskId)
                .then()
                .statusCode(200);

        given()
                .port(port)
                .queryParam("user", "bruno")
                .queryParam("group", "approvers")
                .contentType(ContentType.JSON)
                .body(Map.of("transitionId", "complete",
                        "data", Map.of("approved", true, "comment", "Liberacao autorizada")))
                .when()
                .post("/usertasks/instance/{taskId}/transition", secondTaskId)
                .then()
                .statusCode(200)
                .body("status.name", equalTo("Completed"));

        given()
                .port(port)
                .when()
                .get("/approvalRequests/{id}", instanceId)
                .then()
                .statusCode(404);
    }
}
