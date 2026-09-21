# Multi-stage Dockerfile for SafeBus Attendance Service
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn clean package -pl attendance-service -am -DskipTests

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /workspace/attendance-service/target/safebus-attendance-service-*.jar app.jar

ENV PORT=8084
EXPOSE 8084

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
