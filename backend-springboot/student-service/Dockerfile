# Multi-stage Dockerfile for SafeBus Student Service
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn clean package -pl student-service -am -DskipTests

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /workspace/student-service/target/safebus-student-service-*.jar app.jar

ENV PORT=8082
EXPOSE 8082

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
