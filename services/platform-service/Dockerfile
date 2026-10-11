FROM docker.io/library/eclipse-temurin:25-jdk-alpine AS build
WORKDIR /build
RUN apk add --no-cache curl
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw
COPY src src
ARG SKIP_TESTS=false
RUN ./mvnw --batch-mode -Dmaven.test.skip=${SKIP_TESTS} verify

FROM docker.io/library/eclipse-temurin:25-jre-alpine
RUN addgroup -S app && adduser -S app -G app -u 10001
WORKDIR /app
COPY --from=build /build/target/app.jar /app/app.jar
EXPOSE 8080
USER 10001:10001
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
