# Multi-stage Dockerfile for SafeBus Config Server
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn clean package -pl config-server -am -DskipTests

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /workspace/config-server/target/safebus-config-server-*.jar app.jar

ENV PORT=8888
EXPOSE 8888

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
