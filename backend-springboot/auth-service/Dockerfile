# Multi-stage Dockerfile for SafeBus Auth Service
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn clean package -pl auth-service -am -DskipTests

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /workspace/auth-service/target/safebus-auth-service-*.jar app.jar

ENV PORT=8081
EXPOSE 8081

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
