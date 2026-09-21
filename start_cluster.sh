#!/bin/bash
set -e

echo "=========================================================="
echo "  SafeBus Shield Enterprise Cloud Backend Cluster"
echo "  Initializing 8 Microservices + Python AI CV Node..."
echo "=========================================================="

# High-efficiency, low-memory JVM parameters for cloud microservices
COMMON_JVM_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss256k -XX:CompressedClassSpaceSize=16m -XX:ReservedCodeCacheSize=24m -XX:+ExitOnOutOfMemoryError"

# Cloud infrastructure environment variables
export SPRING_DATASOURCE_URL=${SPRING_DATASOURCE_URL:-"jdbc:mysql://mysql.railway.internal:3306/railway?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true"}
export SPRING_DATASOURCE_USERNAME=${SPRING_DATASOURCE_USERNAME:-"root"}
export SPRING_DATASOURCE_PASSWORD=${SPRING_DATASOURCE_PASSWORD:-"MAlRwizXxvhodpYLOHSuWfhlIXDJlgAJ"}
export SPRING_RABBITMQ_HOST=${SPRING_RABBITMQ_HOST:-"rabbitmq.railway.internal"}
export SPRING_RABBITMQ_PORT=${SPRING_RABBITMQ_PORT:-5672}
export SPRING_RABBITMQ_USERNAME=${SPRING_RABBITMQ_USERNAME:-"guest"}
export SPRING_RABBITMQ_PASSWORD=${SPRING_RABBITMQ_PASSWORD:-"guest"}
export EUREKA_SERVER_URL=${EUREKA_SERVER_URL:-"http://localhost:8761/eureka/"}
export CONFIG_SERVER_URL=${CONFIG_SERVER_URL:-"http://localhost:8888"}

# 1. Start Eureka Discovery Server (Port 8761)
echo "[1/9] Starting Eureka Server on port 8761..."
java -Xms16m -Xmx48m -XX:MaxMetaspaceSize=48m $COMMON_JVM_OPTS -jar eureka-server.jar > /tmp/eureka.log 2>&1 &
EUREKA_PID=$!

# Wait for Eureka
for i in $(seq 1 30); do
  if curl -s http://localhost:8761 > /dev/null 2>&1; then
    echo "  -> Eureka Server is ready."
    break
  fi
  sleep 1
done

# 2. Start Config Server (Port 8888)
echo "[2/9] Starting Config Server on port 8888..."
java -Xms16m -Xmx48m -XX:MaxMetaspaceSize=48m $COMMON_JVM_OPTS -jar config-server.jar > /tmp/config.log 2>&1 &
CONFIG_PID=$!

# Wait for Config Server
for i in $(seq 1 30); do
  if curl -s http://localhost:8888/actuator/health > /dev/null 2>&1; then
    echo "  -> Config Server is ready."
    break
  fi
  sleep 1
done

# 3. Start Python Edge AI CV Driver Monitor (Port 5001)
echo "[3/9] Starting Python AI CV Driver Monitor on port 5001..."
cd /app/backend
python3 cv_driver_monitor.py > /tmp/cv.log 2>&1 &
CV_PID=$!
cd /app

# 4. Start Core Domain Microservices with Staggered Initialization
echo "[4/9] Starting Auth Service on port 8081..."
java -Xms16m -Xmx64m -XX:MaxMetaspaceSize=56m $COMMON_JVM_OPTS -jar auth-service.jar > /tmp/auth.log 2>&1 &
sleep 2

echo "[5/9] Starting Student Service on port 8082..."
java -Xms16m -Xmx80m -XX:MaxMetaspaceSize=64m $COMMON_JVM_OPTS -jar student-service.jar > /tmp/student.log 2>&1 &
sleep 2

echo "[6/9] Starting Transport Service on port 8083..."
java -Xms16m -Xmx64m -XX:MaxMetaspaceSize=56m $COMMON_JVM_OPTS -jar transport-service.jar > /tmp/transport.log 2>&1 &
sleep 2

echo "[7/9] Starting Attendance Service on port 8084..."
java -Xms16m -Xmx64m -XX:MaxMetaspaceSize=56m $COMMON_JVM_OPTS -jar attendance-service.jar > /tmp/attendance.log 2>&1 &
sleep 2

echo "[8/9] Starting Notification Service on port 8086..."
java -Xms16m -Xmx64m -XX:MaxMetaspaceSize=56m $COMMON_JVM_OPTS -jar notification-service.jar > /tmp/notification.log 2>&1 &

echo "Waiting for services to register with Eureka..."
sleep 6

# 5. Start API Gateway on main exposed PORT in foreground
GATEWAY_PORT=${PORT:-8080}
echo "[9/9] Starting Spring Cloud API Gateway on port ${GATEWAY_PORT} (Public Entrypoint)..."
exec java -Xms16m -Xmx80m -XX:MaxMetaspaceSize=64m $COMMON_JVM_OPTS -Dserver.port=${GATEWAY_PORT} -jar api-gateway.jar
