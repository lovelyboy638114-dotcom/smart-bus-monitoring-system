#!/bin/bash
set -e

echo "=========================================================="
echo "  SafeBus Shield Enterprise Cloud Fleet Services Cluster"
echo "  Starting Transport, Attendance, Notification, & CV Node"
echo "=========================================================="

export MALLOC_ARENA_MAX=2

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

touch /tmp/cv.log /tmp/transport.log /tmp/attendance.log /tmp/notification.log
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

echo "[1/4] Starting Config provider on port 8888..."
cd /app/config
python3 -m http.server 8888 > /dev/null 2>&1 &
cd /app
sleep 1

echo "[2/4] Starting Python AI CV Driver Monitor on port 5001..."
cd /app/backend
CV_PORT=5001 python3 cv_driver_monitor.py > /tmp/cv.log 2>&1 &
CV_PID=$!
cd /app
sleep 1

CONFIG_FLAGS="--spring.cloud.config.enabled=false --spring.config.import=file:/app/config/application.yml"

echo "[3/4] Starting Transport Service on port 8083..."
java -Xms32m -Xmx128m $COMMON_JVM_OPTS -Dserver.port=8083 -jar transport-service.jar $CONFIG_FLAGS,file:/app/config/transport-service.yml > /tmp/transport.log 2>&1 &
TRANSPORT_PID=$!
wait_for_port 8083 "Transport Service" 40

echo "[4/4] Starting Attendance Service on port 8084..."
java -Xms32m -Xmx128m $COMMON_JVM_OPTS -Dserver.port=8084 -jar attendance-service.jar $CONFIG_FLAGS,file:/app/config/attendance-service.yml > /tmp/attendance.log 2>&1 &
ATTENDANCE_PID=$!
wait_for_port 8084 "Attendance Service" 40

echo "[Bonus] Starting Notification Service on port 8086..."
java -Xms32m -Xmx128m $COMMON_JVM_OPTS -Dserver.port=8086 -jar notification-service.jar $CONFIG_FLAGS,file:/app/config/notification-service.yml > /tmp/notification.log 2>&1 &
NOTIFICATION_PID=$!
wait_for_port 8086 "Notification Service" 40

echo "=========================================================="
echo "  SafeBus Fleet Cluster is fully online and supervised!"
echo "=========================================================="

while true; do
  sleep 15
  if ! kill -0 $TRANSPORT_PID 2>/dev/null; then
    echo "[Supervisor] Restarting Transport Service on port 8083..."
    java -Xms32m -Xmx128m $COMMON_JVM_OPTS -Dserver.port=8083 -jar transport-service.jar $CONFIG_FLAGS,file:/app/config/transport-service.yml > /tmp/transport.log 2>&1 &
    TRANSPORT_PID=$!
  fi
  if ! kill -0 $ATTENDANCE_PID 2>/dev/null; then
    echo "[Supervisor] Restarting Attendance Service on port 8084..."
    java -Xms32m -Xmx128m $COMMON_JVM_OPTS -Dserver.port=8084 -jar attendance-service.jar $CONFIG_FLAGS,file:/app/config/attendance-service.yml > /tmp/attendance.log 2>&1 &
    ATTENDANCE_PID=$!
  fi
  if ! kill -0 $NOTIFICATION_PID 2>/dev/null; then
    echo "[Supervisor] Restarting Notification Service on port 8086..."
    java -Xms32m -Xmx128m $COMMON_JVM_OPTS -Dserver.port=8086 -jar notification-service.jar $CONFIG_FLAGS,file:/app/config/notification-service.yml > /tmp/notification.log 2>&1 &
    NOTIFICATION_PID=$!
  fi
  if ! kill -0 $CV_PID 2>/dev/null; then
    echo "[Supervisor] Restarting Python CV Monitor on port 5001..."
    cd /app/backend
    CV_PORT=5001 python3 cv_driver_monitor.py > /tmp/cv.log 2>&1 &
    CV_PID=$!
    cd /app
  fi
done
