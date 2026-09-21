#!/bin/bash
set -e

echo "=========================================================="
echo "  SafeBus Shield Enterprise Cloud Backend Cluster"
echo "  Starting Microservice Architecture (Auth, Student, Fleet, Gateway, CV)"
echo "=========================================================="

# Limit glibc memory arena fragmentation
export MALLOC_ARENA_MAX=2

# Save public container port for API Gateway entrypoint
GATEWAY_PORT=${PORT:-8080}
unset PORT

# High-efficiency, low-overhead JVM parameters (balanced for 1024MB container)
COMMON_JVM_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:CICompilerCount=1 -Xss256k -XX:ReservedCodeCacheSize=10m -XX:MinHeapFreeRatio=5 -XX:MaxHeapFreeRatio=15 -XX:+UseCompressedOops -XX:+UseCompressedClassPointers -Deureka.client.enabled=false -Dspringdoc.api-docs.enabled=false -Dspringdoc.swagger-ui.enabled=false -Dspring.jpa.hibernate.ddl-auto=none -Dserver.tomcat.threads.max=4 -Dserver.tomcat.threads.min-spare=2 -Dreactor.netty.ioWorkerCount=2 -Djava.net.preferIPv4Stack=true"

# Cloud infrastructure environment variables
export SPRING_DATASOURCE_URL=${SPRING_DATASOURCE_URL:-"jdbc:mysql://mysql.railway.internal:3306/railway?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true"}
export SPRING_DATASOURCE_USERNAME=${SPRING_DATASOURCE_USERNAME:-"root"}
export SPRING_DATASOURCE_PASSWORD=${SPRING_DATASOURCE_PASSWORD:-"MAlRwizXxvhodpYLOHSuWfhlIXDJlgAJ"}
export SPRING_RABBITMQ_HOST=${SPRING_RABBITMQ_HOST:-"rabbitmq.railway.internal"}
export SPRING_RABBITMQ_PORT=${SPRING_RABBITMQ_PORT:-5672}
export SPRING_RABBITMQ_USERNAME=${SPRING_RABBITMQ_USERNAME:-"guest"}
export SPRING_RABBITMQ_PASSWORD=${SPRING_RABBITMQ_PASSWORD:-"guest"}
export EUREKA_SERVER_URL=${EUREKA_SERVER_URL:-"http://127.0.0.1:8761/eureka/"}

# Ensure log files exist
touch /tmp/cv.log /tmp/auth.log /tmp/student.log /tmp/transport.log /tmp/gateway.log
tail -q -n 0 -F /tmp/*.log &

# Helper function to wait for a service port to respond and compact memory
wait_for_port() {
  local port=$1
  local name=$2
  local pid=$3
  local max_sec=${4:-45}
  for i in $(seq 1 $max_sec); do
    if curl -s "http://127.0.0.1:${port}/actuator/health" > /dev/null 2>&1 || curl -s "http://127.0.0.1:${port}" > /dev/null 2>&1 || curl -s "http://127.0.0.1:${port}/health" > /dev/null 2>&1; then
      echo "  -> ${name} is ready on port ${port} (${i}s)."
      if [ -n "$pid" ]; then
        jcmd "$pid" GC.run > /dev/null 2>&1 || true
        jcmd "$pid" System.trim_native_memory > /dev/null 2>&1 || true
      fi
      sleep 1
      return 0
    fi
    sleep 1
  done
  echo "  -> [Notice] ${name} on port ${port} still starting..."
}

# 1. Config Provider on port 8888 (Serves /app/config directly, saves 140MB JVM)
echo "[1/5] Initializing Cloud Configuration provider on port 8888..."
cd /app/config
python3 -m http.server 8888 > /dev/null 2>&1 &
cd /app
sleep 1

# 2. Python Edge AI CV Driver Monitor (Port 5001 - Lazy Loaded, uses only ~15MB idle)
echo "[2/5] Starting Python AI CV Driver Monitor on port 5001..."
cd /app/backend
CV_PORT=5001 python3 cv_driver_monitor.py > /tmp/cv.log 2>&1 &
CV_PID=$!
cd /app
sleep 1

CONFIG_FLAGS="--spring.cloud.config.enabled=false --spring.config.import=file:/app/config/application.yml"

# 3. Auth Service (Port 8081)
echo "[3/5] Starting Auth Service on port 8081..."
java -Xms32m -Xmx110m $COMMON_JVM_OPTS -Dserver.port=8081 -jar auth-service.jar $CONFIG_FLAGS,file:/app/config/auth-service.yml > /tmp/auth.log 2>&1 &
AUTH_PID=$!
wait_for_port 8081 "Auth Service" $AUTH_PID 45

# 4. Student Service (Port 8082)
echo "[4/5] Starting Student Service on port 8082..."
java -Xms32m -Xmx110m $COMMON_JVM_OPTS -Dserver.port=8082 -jar student-service.jar $CONFIG_FLAGS,file:/app/config/student-service.yml > /tmp/student.log 2>&1 &
STUDENT_PID=$!
wait_for_port 8082 "Student Service" $STUDENT_PID 45

# 5. Transport, Attendance, & Notification Unified Fleet Service (Port 8083)
echo "[5/5] Starting Transport & Fleet Unified Service on port 8083..."
java -Xms32m -Xmx128m $COMMON_JVM_OPTS -Dserver.port=8083 -jar transport-service.jar $CONFIG_FLAGS,file:/app/config/transport-service.yml > /tmp/transport.log 2>&1 &
TRANSPORT_PID=$!
wait_for_port 8083 "Transport Fleet Service" $TRANSPORT_PID 45

# 6. Spring Cloud API Gateway (Port 8080 - Public Entrypoint)
echo "=== Starting Spring Cloud API Gateway on port ${GATEWAY_PORT} (Public Entrypoint) ==="
java -Xms32m -Xmx80m $COMMON_JVM_OPTS -Dserver.port=${GATEWAY_PORT} -jar api-gateway.jar $CONFIG_FLAGS,file:/app/config/api-gateway.yml > /tmp/gateway.log 2>&1 &
GATEWAY_PID=$!
wait_for_port ${GATEWAY_PORT} "API Gateway" $GATEWAY_PID 45

echo "=========================================================="
echo "  SafeBus Shield Enterprise Cloud Cluster is Online!"
echo "=========================================================="

# Auto-recovery health supervisor loop (checks every 15 seconds)
while true; do
  sleep 15
  if ! kill -0 $AUTH_PID 2>/dev/null; then
    echo "[Supervisor] Restarting Auth Service on port 8081..."
    java -Xms32m -Xmx110m $COMMON_JVM_OPTS -Dserver.port=8081 -jar auth-service.jar $CONFIG_FLAGS,file:/app/config/auth-service.yml > /tmp/auth.log 2>&1 &
    AUTH_PID=$!
  fi
  if ! kill -0 $STUDENT_PID 2>/dev/null; then
    echo "[Supervisor] Restarting Student Service on port 8082..."
    java -Xms32m -Xmx110m $COMMON_JVM_OPTS -Dserver.port=8082 -jar student-service.jar $CONFIG_FLAGS,file:/app/config/student-service.yml > /tmp/student.log 2>&1 &
    STUDENT_PID=$!
  fi
  if ! kill -0 $TRANSPORT_PID 2>/dev/null; then
    echo "[Supervisor] Restarting Transport Fleet Service on port 8083..."
    java -Xms32m -Xmx128m $COMMON_JVM_OPTS -Dserver.port=8083 -jar transport-service.jar $CONFIG_FLAGS,file:/app/config/transport-service.yml > /tmp/transport.log 2>&1 &
    TRANSPORT_PID=$!
  fi
  if ! kill -0 $GATEWAY_PID 2>/dev/null; then
    echo "[Supervisor] Restarting API Gateway on port ${GATEWAY_PORT}..."
    java -Xms32m -Xmx80m $COMMON_JVM_OPTS -Dserver.port=${GATEWAY_PORT} -jar api-gateway.jar $CONFIG_FLAGS,file:/app/config/api-gateway.yml > /tmp/gateway.log 2>&1 &
    GATEWAY_PID=$!
  fi
  if ! kill -0 $CV_PID 2>/dev/null; then
    echo "[Supervisor] Restarting Python CV Monitor on port 5001..."
    cd /app/backend
    CV_PORT=5001 python3 cv_driver_monitor.py > /tmp/cv.log 2>&1 &
    CV_PID=$!
    cd /app
  fi
done
