FROM docker.io/library/eclipse-temurin:25-jre-alpine

RUN addgroup -S platform && adduser -S platform -G platform -u 10001
WORKDIR /app
COPY target/app.jar /app/app.jar

EXPOSE 8080
USER 10001:10001
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
