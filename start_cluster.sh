#!/bin/bash
set -e

echo "=========================================================="
echo "  SafeBus Shield Enterprise Cloud Backend Cluster"
echo "  Initializing 6 Microservices + Python Edge AI CV Node..."
echo "=========================================================="

# Limit glibc memory arena fragmentation
export MALLOC_ARENA_MAX=2
export MALLOC_TRIM_THRESHOLD_=65536

# Save public container port for API Gateway entrypoint
GATEWAY_PORT=${PORT:-8080}
unset PORT

# High-efficiency, memory-compact JVM options (balanced for 1024MB container)
COMMON_JVM_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:CICompilerCount=1 -Xss256k -XX:ReservedCodeCacheSize=8m -XX:MinHeapFreeRatio=5 -XX:MaxHeapFreeRatio=15 -XX:+UseCompressedOops -XX:+UseCompressedClassPointers -Deureka.client.enabled=false -Dspringdoc.api-docs.enabled=false -Dspringdoc.swagger-ui.enabled=false -Dspring.jpa.hibernate.ddl-auto=none -Dserver.tomcat.threads.max=3 -Dserver.tomcat.threads.min-spare=1 -Dreactor.netty.ioWorkerCount=2 -Djava.net.preferIPv4Stack=true"

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
touch /tmp/cv.log /tmp/auth.log /tmp/student.log /tmp/transport.log /tmp/attendance.log /tmp/notification.log /tmp/gateway.log
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
echo "[1/7] Initializing Cloud Configuration provider on port 8888..."
cd /app/config
python3 -m http.server 8888 > /dev/null 2>&1 &
cd /app
sleep 1

# 2. Python Edge AI CV Driver Monitor (Port 5001 - Lazy Loaded, uses only ~15MB idle)
echo "[2/7] Starting Python AI CV Driver Monitor on port 5001..."
cd /app/backend
CV_PORT=5001 python3 cv_driver_monitor.py > /tmp/cv.log 2>&1 &
CV_PID=$!
cd /app
sleep 1

CONFIG_FLAGS="--spring.cloud.config.enabled=false --spring.config.import=file:/app/config/application.yml"

# 3. Auth Service (Port 8081)
echo "[3/7] Starting Auth Service on port 8081..."
java -Xms16m -Xmx72m $COMMON_JVM_OPTS -Dserver.port=8081 -jar auth-service.jar $CONFIG_FLAGS,file:/app/config/auth-service.yml > /tmp/auth.log 2>&1 &
AUTH_PID=$!
wait_for_port 8081 "Auth Service" $AUTH_PID 45

# 4. Student Service (Port 8082)
echo "[4/7] Starting Student Service on port 8082..."
java -Xms16m -Xmx72m $COMMON_JVM_OPTS -Dserver.port=8082 -jar student-service.jar $CONFIG_FLAGS,file:/app/config/student-service.yml > /tmp/student.log 2>&1 &
STUDENT_PID=$!
wait_for_port 8082 "Student Service" $STUDENT_PID 45

# 5. Transport Service (Port 8083)
echo "[5/7] Starting Transport Service on port 8083..."
java -Xms16m -Xmx64m $COMMON_JVM_OPTS -Dserver.port=8083 -jar transport-service.jar $CONFIG_FLAGS,file:/app/config/transport-service.yml > /tmp/transport.log 2>&1 &
TRANSPORT_PID=$!
wait_for_port 8083 "Transport Service" $TRANSPORT_PID 45

# 6. Attendance Service (Port 8084)
echo "[6/7] Starting Attendance Service on port 8084..."
java -Xms16m -Xmx64m $COMMON_JVM_OPTS -Dserver.port=8084 -jar attendance-service.jar $CONFIG_FLAGS,file:/app/config/attendance-service.yml > /tmp/attendance.log 2>&1 &
ATTENDANCE_PID=$!
wait_for_port 8084 "Attendance Service" $ATTENDANCE_PID 45

# 7. Notification Service (Port 8086)
echo "[Bonus] Starting Notification Service on port 8086..."
java -Xms16m -Xmx48m $COMMON_JVM_OPTS -Dserver.port=8086 -jar notification-service.jar $CONFIG_FLAGS,file:/app/config/notification-service.yml > /tmp/notification.log 2>&1 &
NOTIFICATION_PID=$!
wait_for_port 8086 "Notification Service" $NOTIFICATION_PID 45

# 8. Spring Cloud API Gateway (Port 8080 - Public Entrypoint)
echo "=== Starting Spring Cloud API Gateway on port ${GATEWAY_PORT} (Public Entrypoint) ==="
java -Xms16m -Xmx48m $COMMON_JVM_OPTS -Dserver.port=${GATEWAY_PORT} -jar api-gateway.jar $CONFIG_FLAGS,file:/app/config/api-gateway.yml > /tmp/gateway.log 2>&1 &
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
    java -Xms16m -Xmx72m $COMMON_JVM_OPTS -Dserver.port=8081 -jar auth-service.jar $CONFIG_FLAGS,file:/app/config/auth-service.yml > /tmp/auth.log 2>&1 &
    AUTH_PID=$!
  fi
  if ! kill -0 $STUDENT_PID 2>/dev/null; then
    echo "[Supervisor] Restarting Student Service on port 8082..."
    java -Xms16m -Xmx72m $COMMON_JVM_OPTS -Dserver.port=8082 -jar student-service.jar $CONFIG_FLAGS,file:/app/config/student-service.yml > /tmp/student.log 2>&1 &
    STUDENT_PID=$!
  fi
  if ! kill -0 $TRANSPORT_PID 2>/dev/null; then
    echo "[Supervisor] Restarting Transport Service on port 8083..."
    java -Xms16m -Xmx64m $COMMON_JVM_OPTS -Dserver.port=8083 -jar transport-service.jar $CONFIG_FLAGS,file:/app/config/transport-service.yml > /tmp/transport.log 2>&1 &
    TRANSPORT_PID=$!
  fi
  if ! kill -0 $ATTENDANCE_PID 2>/dev/null; then
    echo "[Supervisor] Restarting Attendance Service on port 8084..."
    java -Xms16m -Xmx64m $COMMON_JVM_OPTS -Dserver.port=8084 -jar attendance-service.jar $CONFIG_FLAGS,file:/app/config/attendance-service.yml > /tmp/attendance.log 2>&1 &
    ATTENDANCE_PID=$!
  fi
  if ! kill -0 $NOTIFICATION_PID 2>/dev/null; then
    echo "[Supervisor] Restarting Notification Service on port 8086..."
    java -Xms16m -Xmx48m $COMMON_JVM_OPTS -Dserver.port=8086 -jar notification-service.jar $CONFIG_FLAGS,file:/app/config/notification-service.yml > /tmp/notification.log 2>&1 &
    NOTIFICATION_PID=$!
  fi
  if ! kill -0 $GATEWAY_PID 2>/dev/null; then
    echo "[Supervisor] Restarting API Gateway on port ${GATEWAY_PORT}..."
    java -Xms16m -Xmx48m $COMMON_JVM_OPTS -Dserver.port=${GATEWAY_PORT} -jar api-gateway.jar $CONFIG_FLAGS,file:/app/config/api-gateway.yml > /tmp/gateway.log 2>&1 &
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
