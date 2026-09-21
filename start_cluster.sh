#!/bin/bash
set -e

echo "=========================================================="
echo "  SafeBus Shield Enterprise Cloud Gateway & Identity Node"
echo "  Starting API Gateway, Auth Service, & Student Service"
echo "=========================================================="

export MALLOC_ARENA_MAX=2

# Save public container port for API Gateway entrypoint
GATEWAY_PORT=${PORT:-8080}
unset PORT

# High-efficiency, generous JVM parameters (plenty of room in 1024MB container)
COMMON_JVM_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:CICompilerCount=2 -Xss256k -XX:MinHeapFreeRatio=10 -XX:MaxHeapFreeRatio=30 -XX:+UseCompressedOops -XX:+UseCompressedClassPointers -Deureka.client.enabled=false -Dspringdoc.api-docs.enabled=false -Dspringdoc.swagger-ui.enabled=false -Dspring.jpa.hibernate.ddl-auto=none -Dserver.tomcat.threads.max=4 -Dserver.tomcat.threads.min-spare=2 -Dreactor.netty.ioWorkerCount=2 -Djava.net.preferIPv4Stack=true"

# Cloud infrastructure environment variables
export SPRING_DATASOURCE_URL=${SPRING_DATASOURCE_URL:-"jdbc:mysql://mysql.railway.internal:3306/railway?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true"}
export SPRING_DATASOURCE_USERNAME=${SPRING_DATASOURCE_USERNAME:-"root"}
export SPRING_DATASOURCE_PASSWORD=${SPRING_DATASOURCE_PASSWORD:-"MAlRwizXxvhodpYLOHSuWfhlIXDJlgAJ"}
export SPRING_RABBITMQ_HOST=${SPRING_RABBITMQ_HOST:-"rabbitmq.railway.internal"}
export SPRING_RABBITMQ_PORT=${SPRING_RABBITMQ_PORT:-5672}
export SPRING_RABBITMQ_USERNAME=${SPRING_RABBITMQ_USERNAME:-"guest"}
export SPRING_RABBITMQ_PASSWORD=${SPRING_RABBITMQ_PASSWORD:-"guest"}

touch /tmp/auth.log /tmp/student.log /tmp/gateway.log
tail -q -n 0 -F /tmp/*.log &

wait_for_port() {
  local port=$1
  local name=$2
  local max_sec=${3:-40}
  for i in $(seq 1 $max_sec); do
    if curl -s "http://127.0.0.1:${port}/actuator/health" > /dev/null 2>&1 || curl -s "http://127.0.0.1:${port}" > /dev/null 2>&1 || curl -s "http://127.0.0.1:${port}/health" > /dev/null 2>&1; then
      echo "  -> ${name} is ready on port ${port} (${i}s)."
      return 0
    fi
    sleep 1
  done
  echo "  -> [Notice] ${name} on port ${port} still starting..."
}

echo "[1/3] Starting Configuration provider on port 8888..."
cd /app/config
python3 -m http.server 8888 > /dev/null 2>&1 &
cd /app
sleep 1

CONFIG_FLAGS="--spring.cloud.config.enabled=false --spring.config.import=file:/app/config/application.yml"

echo "[2/3] Starting Auth Service on port 8081..."
java -Xms32m -Xmx128m $COMMON_JVM_OPTS -Dserver.port=8081 -jar auth-service.jar $CONFIG_FLAGS,file:/app/config/auth-service.yml > /tmp/auth.log 2>&1 &
AUTH_PID=$!
wait_for_port 8081 "Auth Service" 40

echo "[3/3] Starting Student Service on port 8082..."
java -Xms32m -Xmx128m $COMMON_JVM_OPTS -Dserver.port=8082 -jar student-service.jar $CONFIG_FLAGS,file:/app/config/student-service.yml > /tmp/student.log 2>&1 &
STUDENT_PID=$!
wait_for_port 8082 "Student Service" 40

echo "=== Starting Spring Cloud API Gateway on port ${GATEWAY_PORT} (Public Entrypoint) ==="
java -Xms32m -Xmx96m $COMMON_JVM_OPTS -Dserver.port=${GATEWAY_PORT} -jar api-gateway.jar $CONFIG_FLAGS,file:/app/config/api-gateway.yml > /tmp/gateway.log 2>&1 &
GATEWAY_PID=$!
wait_for_port ${GATEWAY_PORT} "API Gateway" 40

echo "=========================================================="
echo "  SafeBus Gateway & Identity Cluster is online!"
echo "=========================================================="

while true; do
  sleep 15
  if ! kill -0 $AUTH_PID 2>/dev/null; then
    echo "[Supervisor] Restarting Auth Service on port 8081..."
    java -Xms32m -Xmx128m $COMMON_JVM_OPTS -Dserver.port=8081 -jar auth-service.jar $CONFIG_FLAGS,file:/app/config/auth-service.yml > /tmp/auth.log 2>&1 &
    AUTH_PID=$!
  fi
  if ! kill -0 $STUDENT_PID 2>/dev/null; then
    echo "[Supervisor] Restarting Student Service on port 8082..."
    java -Xms32m -Xmx128m $COMMON_JVM_OPTS -Dserver.port=8082 -jar student-service.jar $CONFIG_FLAGS,file:/app/config/student-service.yml > /tmp/student.log 2>&1 &
    STUDENT_PID=$!
  fi
  if ! kill -0 $GATEWAY_PID 2>/dev/null; then
    echo "[Supervisor] Restarting API Gateway on port ${GATEWAY_PORT}..."
    java -Xms32m -Xmx96m $COMMON_JVM_OPTS -Dserver.port=${GATEWAY_PORT} -jar api-gateway.jar $CONFIG_FLAGS,file:/app/config/api-gateway.yml > /tmp/gateway.log 2>&1 &
    GATEWAY_PID=$!
  fi
done
