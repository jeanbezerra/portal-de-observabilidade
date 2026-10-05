FROM docker.io/library/eclipse-temurin:21-jre-alpine

RUN addgroup -S workflow && adduser -S workflow -G workflow -u 10001
WORKDIR /app
COPY target/app.jar /app/app.jar

EXPOSE 8082
USER 10001:10001
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
