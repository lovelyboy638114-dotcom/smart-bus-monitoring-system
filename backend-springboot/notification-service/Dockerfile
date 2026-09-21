# Multi-stage Dockerfile for SafeBus Notification Service
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn clean package -pl notification-service -am -DskipTests

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /workspace/notification-service/target/safebus-notification-service-*.jar app.jar

ENV PORT=8086
EXPOSE 8086

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
