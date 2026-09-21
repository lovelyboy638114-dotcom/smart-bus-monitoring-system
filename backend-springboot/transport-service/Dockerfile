# Multi-stage Dockerfile for SafeBus Transport Service
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn clean package -pl transport-service -am -DskipTests

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /workspace/transport-service/target/safebus-transport-service-*.jar app.jar

ENV PORT=8083
EXPOSE 8083

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
