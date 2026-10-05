FROM docker.io/library/eclipse-temurin:25-jre-alpine

RUN addgroup -S identity && adduser -S identity -G identity -u 10001
WORKDIR /app
COPY target/app.jar /app/app.jar

EXPOSE 8083
USER 10001:10001
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
