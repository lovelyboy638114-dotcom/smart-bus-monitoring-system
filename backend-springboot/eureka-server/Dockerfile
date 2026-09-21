# Multi-stage Dockerfile for SafeBus Eureka Server
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn clean package -pl eureka-server -am -DskipTests

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /workspace/eureka-server/target/safebus-eureka-server-*.jar app.jar

ENV PORT=8761
EXPOSE 8761

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
