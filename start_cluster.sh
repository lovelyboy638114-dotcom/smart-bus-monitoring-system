#!/bin/bash
set -e

echo "=========================================================="
echo "  SafeBus Shield Enterprise Cloud Backend Cluster"
echo "  Initializing 8 Microservices + Python AI CV Node..."
echo "=========================================================="

# Save public container port for API Gateway entrypoint and isolate sub-services
GATEWAY_PORT=${PORT:-8080}
unset PORT

# High-efficiency, low-memory JVM parameters for cloud microservices
COMMON_JVM_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:CICompilerCount=1 -Xss160k -XX:ReservedCodeCacheSize=8m -Djava.net.preferIPv4Stack=true"

# Cloud infrastructure environment variables
export SPRING_DATASOURCE_URL=${SPRING_DATASOURCE_URL:-"jdbc:mysql://mysql.railway.internal:3306/railway?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true"}
export SPRING_DATASOURCE_USERNAME=${SPRING_DATASOURCE_USERNAME:-"root"}
export SPRING_DATASOURCE_PASSWORD=${SPRING_DATASOURCE_PASSWORD:-"MAlRwizXxvhodpYLOHSuWfhlIXDJlgAJ"}
export SPRING_RABBITMQ_HOST=${SPRING_RABBITMQ_HOST:-"rabbitmq.railway.internal"}
export SPRING_RABBITMQ_PORT=${SPRING_RABBITMQ_PORT:-5672}
export SPRING_RABBITMQ_USERNAME=${SPRING_RABBITMQ_USERNAME:-"guest"}
export SPRING_RABBITMQ_PASSWORD=${SPRING_RABBITMQ_PASSWORD:-"guest"}
export EUREKA_SERVER_URL=${EUREKA_SERVER_URL:-"http://127.0.0.1:8761/eureka/"}
export CONFIG_SERVER_URL=${CONFIG_SERVER_URL:-"http://127.0.0.1:8888"}

# Ensure log files exist so tail can attach
touch /tmp/eureka.log /tmp/config.log /tmp/cv.log /tmp/auth.log /tmp/student.log /tmp/transport.log /tmp/attendance.log /tmp/notification.log

# Stream background service logs so Railway captures all process logs
tail -q -n 0 -F /tmp/*.log &

# Helper function to wait for a service port to respond and trim memory
wait_for_port() {
  local port=$1
  local name=$2
  local pid=$3
  local max_sec=${4:-35}
  for i in $(seq 1 $max_sec); do
    if curl -s "http://127.0.0.1:${port}/actuator/health" > /dev/null 2>&1 || curl -s "http://127.0.0.1:${port}" > /dev/null 2>&1; then
      echo "  -> ${name} is ready on port ${port} (${i}s)."
      if [ -n "$pid" ]; then
        jcmd "$pid" GC.run > /dev/null 2>&1 || true
      fi
      return 0
    fi
    sleep 1
  done
  echo "  -> [Notice] ${name} on port ${port} still starting..."
}

# 1. Start Eureka Discovery Server (Port 8761)
echo "[1/9] Starting Eureka Server on port 8761..."
java -Xms4m -Xmx24m $COMMON_JVM_OPTS -Dserver.port=8761 -jar eureka-server.jar > /tmp/eureka.log 2>&1 &
wait_for_port 8761 "Eureka Server" $! 30

# 2. Start Config Server (Port 8888)
echo "[2/9] Starting Config Server on port 8888..."
java -Xms4m -Xmx24m $COMMON_JVM_OPTS -Dserver.port=8888 -jar config-server.jar > /tmp/config.log 2>&1 &
wait_for_port 8888 "Config Server" $! 30

# 3. Start Python Edge AI CV Driver Monitor (Port 5001)
echo "[3/9] Starting Python AI CV Driver Monitor on port 5001..."
cd /app/backend
CV_PORT=5001 python3 cv_driver_monitor.py > /tmp/cv.log 2>&1 &
cd /app
sleep 2

# 4. Start Core Domain Microservices sequentially to prevent CPU/memory spikes
echo "[4/9] Starting Auth Service on port 8081..."
java -Xms4m -Xmx32m $COMMON_JVM_OPTS -Dserver.port=8081 -jar auth-service.jar > /tmp/auth.log 2>&1 &
wait_for_port 8081 "Auth Service" $! 25

echo "[5/9] Starting Student Service on port 8082..."
java -Xms4m -Xmx36m $COMMON_JVM_OPTS -Dserver.port=8082 -jar student-service.jar > /tmp/student.log 2>&1 &
wait_for_port 8082 "Student Service" $! 25

echo "[6/9] Starting Transport Service on port 8083..."
java -Xms4m -Xmx32m $COMMON_JVM_OPTS -Dserver.port=8083 -jar transport-service.jar > /tmp/transport.log 2>&1 &
wait_for_port 8083 "Transport Service" $! 25

echo "[7/9] Starting Attendance Service on port 8084..."
java -Xms4m -Xmx32m $COMMON_JVM_OPTS -Dserver.port=8084 -jar attendance-service.jar > /tmp/attendance.log 2>&1 &
wait_for_port 8084 "Attendance Service" $! 25

echo "[8/9] Starting Notification Service on port 8086..."
java -Xms4m -Xmx32m $COMMON_JVM_OPTS -Dserver.port=8086 -jar notification-service.jar > /tmp/notification.log 2>&1 &
wait_for_port 8086 "Notification Service" $! 25

# 5. Start API Gateway on main exposed PORT in foreground
echo "[9/9] Starting Spring Cloud API Gateway on port ${GATEWAY_PORT} (Public Entrypoint)..."
exec java -Xms4m -Xmx36m $COMMON_JVM_OPTS -Dserver.port=${GATEWAY_PORT} -jar api-gateway.jar
