#!/bin/bash
set -e

echo "=========================================================="
echo "  SafeBus Shield Enterprise Cloud Backend Cluster"
echo "  Initializing 8 Microservices + Python AI CV Node..."
echo "=========================================================="

# Limit glibc memory arena fragmentation (critical for multi-JVM containers)
export MALLOC_ARENA_MAX=2
export MALLOC_TRIM_THRESHOLD_=131072

# Save public container port for API Gateway entrypoint and isolate sub-services
GATEWAY_PORT=${PORT:-8080}
unset PORT

# High-efficiency, low-memory JVM parameters for cloud microservices (tuned for 1024MB container)
COMMON_JVM_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:CICompilerCount=2 -Xss228k -XX:ReservedCodeCacheSize=10m -XX:MinHeapFreeRatio=5 -XX:MaxHeapFreeRatio=15 -Deureka.client.enabled=false -Dspringdoc.api-docs.enabled=false -Dspringdoc.swagger-ui.enabled=false -Dspring.jpa.hibernate.ddl-auto=none -Dserver.tomcat.threads.max=2 -Dserver.tomcat.threads.min-spare=1 -Dreactor.netty.ioWorkerCount=2 -Djava.net.preferIPv4Stack=true"

# Cloud infrastructure environment variables
export SPRING_DATASOURCE_URL=${SPRING_DATASOURCE_URL:-"jdbc:mysql://mysql.railway.internal:3306/railway?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true"}
export SPRING_DATASOURCE_USERNAME=${SPRING_DATASOURCE_USERNAME:-"root"}
export SPRING_DATASOURCE_PASSWORD=${SPRING_DATASOURCE_PASSWORD:-"MAlRwizXxvhodpYLOHSuWfhlIXDJlgAJ"}
export SPRING_RABBITMQ_HOST=${SPRING_RABBITMQ_HOST:-"rabbitmq.railway.internal"}
export SPRING_RABBITMQ_PORT=${SPRING_RABBITMQ_PORT:-5672}
export SPRING_RABBITMQ_USERNAME=${SPRING_RABBITMQ_USERNAME:-"guest"}
export SPRING_RABBITMQ_PASSWORD=${SPRING_RABBITMQ_PASSWORD:-"guest"}
export EUREKA_SERVER_URL=${EUREKA_SERVER_URL:-"http://127.0.0.1:8761/eureka/"}

# Ensure log files exist so tail can attach
touch /tmp/cv.log /tmp/auth.log /tmp/student.log /tmp/transport.log /tmp/attendance.log /tmp/notification.log /tmp/gateway.log

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
      sleep 1
      return 0
    fi
    sleep 1
  done
  echo "  -> [Notice] ${name} on port ${port} still starting..."
}

# 1. Intra-cluster direct routing (Saves 106MB JVM RAM by omitting redundant Eureka Discovery server)
echo "[1/7] Intra-cluster direct routing active (127.0.0.1 loopback)..."

# 2. Start Lightweight Config Provider on port 8888 (Serves /app/config directly, saves 140MB JVM)
echo "[2/7] Initializing Cloud Configuration provider on port 8888..."
cd /app/config
python3 -m http.server 8888 > /dev/null 2>&1 &
cd /app
sleep 1

# 3. Start Python Edge AI CV Driver Monitor (Port 5001)
echo "[3/7] Starting Python AI CV Driver Monitor on port 5001..."
cd /app/backend
CV_PORT=5001 python3 cv_driver_monitor.py > /tmp/cv.log 2>&1 &
cd /app
sleep 2

# Common config import flag for domain microservices
CONFIG_FLAGS="--spring.cloud.config.enabled=false --spring.config.import=file:/app/config/application.yml"

# 4. Start Core Domain Microservices sequentially to prevent CPU/memory spikes
echo "[4/7] Starting Auth Service on port 8081..."
java -Xms16m -Xmx72m -XX:MaxMetaspaceSize=75m $COMMON_JVM_OPTS -Dserver.port=8081 -jar auth-service.jar $CONFIG_FLAGS,file:/app/config/auth-service.yml > /tmp/auth.log 2>&1 &
wait_for_port 8081 "Auth Service" $! 30

echo "[5/7] Starting Student Service on port 8082..."
java -Xms16m -Xmx56m -XX:MaxMetaspaceSize=90m $COMMON_JVM_OPTS -Dserver.port=8082 -jar student-service.jar $CONFIG_FLAGS,file:/app/config/student-service.yml > /tmp/student.log 2>&1 &
wait_for_port 8082 "Student Service" $! 30

echo "[6/7] Starting Transport Service on port 8083..."
java -Xms16m -Xmx44m -XX:MaxMetaspaceSize=70m $COMMON_JVM_OPTS -Dserver.port=8083 -jar transport-service.jar $CONFIG_FLAGS,file:/app/config/transport-service.yml > /tmp/transport.log 2>&1 &
wait_for_port 8083 "Transport Service" $! 30

echo "[7/7] Starting Attendance Service on port 8084..."
java -Xms16m -Xmx44m -XX:MaxMetaspaceSize=70m $COMMON_JVM_OPTS -Dserver.port=8084 -jar attendance-service.jar $CONFIG_FLAGS,file:/app/config/attendance-service.yml > /tmp/attendance.log 2>&1 &
wait_for_port 8084 "Attendance Service" $! 30

echo "[Bonus] Starting Notification Service on port 8086..."
java -Xms16m -Xmx44m -XX:MaxMetaspaceSize=70m $COMMON_JVM_OPTS -Dserver.port=8086 -jar notification-service.jar $CONFIG_FLAGS,file:/app/config/notification-service.yml > /tmp/notification.log 2>&1 &
wait_for_port 8086 "Notification Service" $! 30

# 5. Start API Gateway on main exposed PORT in foreground
echo "=== Starting Spring Cloud API Gateway on port ${GATEWAY_PORT} (Public Entrypoint) ==="
exec java -Xms16m -Xmx40m -XX:MaxMetaspaceSize=65m $COMMON_JVM_OPTS -Dserver.port=${GATEWAY_PORT} -jar api-gateway.jar $CONFIG_FLAGS,file:/app/config/api-gateway.yml
