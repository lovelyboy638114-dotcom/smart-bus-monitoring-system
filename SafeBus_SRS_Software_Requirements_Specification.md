# Software Requirements Specification (SRS)
## SafeBus Shield — Smart School Bus Safety, Driver Telematics & Student Transit Management System
**Document Version**: 2.5.0  
**Standard**: IEEE 830 / ISO/IEC/IEEE 29148 Compliant  
**Date**: September 20, 2026  
**Status**: APPROVED & IMPLEMENTED  

---

## Table of Contents
1. [Introduction](#1-introduction)
   - 1.1 Purpose
   - 1.2 Document Scope & Product Overview
   - 1.3 Intended Audience
   - 1.4 Definitions, Acronyms, and Abbreviations
   - 1.5 References
2. [Overall Description](#2-overall-description)
   - 2.1 Product Perspective & Context
   - 2.2 System Context & Block Diagram
   - 2.3 User Classes & Personas
   - 2.4 Operating Environment
   - 2.5 Design & Implementation Constraints
   - 2.6 Assumptions & Dependencies
3. [System Architecture & Technology Stack](#3-system-architecture--technology-stack)
   - 3.1 Architecture Overview (Microservices & Hybrid AI Engine)
   - 3.2 Spring Boot Microservices Tier
   - 3.3 Computer Vision & AI Telematics Engine (Python / MediaPipe)
   - 3.4 Modern Frontend Single Page Application (React / Vite)
   - 3.5 Messaging, Asynchronous Queuing & Real-Time WebSockets
   - 3.6 Communication & Push Notification Infrastructure (WhatsApp Gateway)
   - 3.7 Database Tier & Persistence Architecture
4. [Functional Requirements & Detailed Module Specifications](#4-functional-requirements--detailed-module-specifications)
   - 4.1 Module 1: Authentication, Role-Based Access Control (RBAC) & Credential Generation
   - 4.2 Module 2: Student Information System & Dynamic Digital ID Card Generation
   - 4.3 Module 3: Real-Time GPS Tracking, Proximity Engine & 2KM Geofence WhatsApp Notification System
   - 4.4 Module 4: Driver Computer Vision Monitoring (Drowsiness, Distraction, Cabin Buzzer & Strict 2-Alert Cap)
   - 4.5 Module 5: QR Code Boarding, Transit Attendance & Role-Based Attendance Routing
   - 4.6 Module 6: Emergency SOS Alert System & Priority Audio Dispatch
   - 4.7 Module 7: Phone GPS Controller & Virtual Route Simulator
   - 4.8 Module 8: Fleet Telematics, Speed/Braking Anomaly Detection & Reporting
5. [External Interface Requirements](#5-external-interface-requirements)
   - 5.1 User Interfaces (UI Specifications)
   - 5.2 Hardware & Physical Device Interfaces
   - 5.3 Software & REST API Gateway Interface Specifications
   - 5.4 Real-Time WebSocket Messaging Protocol Specifications
6. [Non-Functional Requirements (NFRs)](#6-non-functional-requirements-nfrs)
   - 6.1 Performance & Latency Requirements
   - 6.2 Reliability & Fault Tolerance
   - 6.3 Security, Privacy & Child Safety Compliance
   - 6.4 Audio & Hardware Alert Integrity
   - 6.5 Maintainability, Portability & Modularity
7. [Database Data Dictionary & Entity-Relationship Specifications](#7-database-data-dictionary--entity-relationship-specifications)
   - 7.1 Entity Relationship Diagram (ERD)
   - 7.2 Database Schemas & Table DDL Descriptions
8. [Comprehensive Verification & Traceability Matrix](#8-comprehensive-verification--traceability-matrix)
   - 8.1 Verification of Chat Inquiries & Problem Resolutions
   - 8.2 End-to-End Test Suite Execution Matrix
9. [System Deployment, Port Allocations & Execution Guide](#9-system-deployment-port-allocations--execution-guide)
   - 9.1 Network Port Allocation Table
   - 9.2 Service Startup & Execution Instructions

---

# 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) establishes the complete functional, technical, operational, and architectural blueprint for the **SafeBus Shield** (Smart School Bus Safety, Driver Telematics & Student Transit Management System). It defines the end-to-end specifications for all software components, including Spring Boot microservices, the MediaPipe/OpenCV AI Computer Vision Engine, the React SPA user interface, RabbitMQ event dispatchers, CallMeBot WhatsApp automated push channels, and real-time WebSocket communication infrastructure.

### 1.2 Document Scope & Product Overview
SafeBus Shield is an enterprise-grade transit telematics and child security platform designed to safeguard students throughout their daily school bus commute. Core capabilities include:
- **Real-Time GPS Vehicle Tracking**: Live high-frequency coordinate tracking with bearing calculation, speed telemetry, and route path visualization on interactive OpenStreetMap interfaces.
- **2KM Proximity Engine & Automated WhatsApp Messaging**: Millisecond-level Haversine distance calculations providing 1-click and background automated WhatsApp arrival alerts directly to parents' smartphones when the bus is within 2 kilometers of their child's designated pickup/drop stop.
- **Edge AI Driver Safety Monitoring**: High-precision computer vision pipeline using Google MediaPipe FaceLandmarker and OpenCV to detect driver drowsiness (eye closure $\ge 3.0$ seconds) and distraction (head turned away $\ge 5.0$ seconds), paired with an immediate 3.0-second high-decibel cabin buzzer alarm.
- **Strict Role-Based Notification Architecture**: Centralized telemetry routing ensuring that driver alerts reach **Admin Only** (with a strict maximum cap of 2 notifications per incident), student attendance reaches **matching Parents Only**, and aggregate vehicle operational statistics reach **Admin Only**.
- **Cryptographic Student ID Card System**: Automated generation of secure digital ID cards with front/back SVG/PNG renderings, dynamic QR codes with checksum verification, and printable PDF downloads.
- **Emergency SOS Response Workflow**: Sub-second alert dispatch with high-priority audible siren alerts, incident acknowledgment, and audit resolution logging.

### 1.3 Intended Audience
- **System Architects & Senior Developers**: Blueprint for microservice implementation, event schemas, and CV pipeline integration.
- **Quality Assurance & Verification Engineers**: Baseline for unit tests, end-to-end integration tests, and acceptance validation.
- **School Administrators & Transport Fleet Managers**: Operational specification of fleet safety dashboards and notifications.
- **Academic Evaluators & Compliance Auditors**: Formal engineering specification adhering to IEEE 830 standards.

### 1.4 Definitions, Acronyms, and Abbreviations
| Term / Acronym | Definition |
| :--- | :--- |
| **EAR** | Eye Aspect Ratio. Geometric metric calculated from facial landmarks to determine eye openness. |
| **MAR** | Mouth Aspect Ratio. Geometric metric calculated from lip landmarks to identify yawning or fatigue. |
| **CV** | Computer Vision. Algorithms used to extract operational telemetry from digital video frames. |
| **Haversine** | Great-circle distance equation used to calculate vehicle-to-stop geographic distance on Earth. |
| **JWT** | JSON Web Token. Cryptographic token standard used for stateless authentication and RBAC. |
| **RBAC** | Role-Based Access Control. Enforcement mechanism segregating Admin, Driver, Parent, and Student roles. |
| **AMQP** | Advanced Message Queuing Protocol. Underlying protocol for RabbitMQ asynchronous event broker. |
| **STOMP** | Simple Text Oriented Messaging Protocol. Real-time publish/subscribe protocol over WebSockets. |
| **CallMeBot** | HTTP REST gateway service enabling automated delivery of encrypted WhatsApp text notifications. |
| **ETA** | Estimated Time of Arrival. Dynamic arrival prediction derived from real-time speed and remaining distance. |

---

# 2. Overall Description

### 2.1 Product Perspective & Context
SafeBus Shield operates as an interconnected IoT, Computer Vision, and Microservices ecosystem. The system bridges physical school bus vehicles (GPS antennas, driver-facing cameras, and physical cabin buzzers) with cloud/on-premise backend microservices and responsive web clients for school authorities, drivers, and parents.

```
       +-----------------------------------------------------------+
       |               Vehicle Hardware / Driver Cab               |
       |  - Cabin USB/RTSP Camera (Driver Face & Eye Landmarks)   |
       |  - GPS Receiver / Phone GPS Telematics Controller         |
       |  - High-Decibel Hardware Speaker / Buzzer Module          |
       +-----------------------------+-----------------------------+
                                     |
               HTTP/Webcam Base64    |     GPS Coordinates (REST)
                                     v
       +-----------------------------------------------------------+
       |             Edge AI Computer Vision Engine                |
       |            (Python 3.13 / MediaPipe / OpenCV)             |
       |  - Calculates EAR (Eye Closure >= 3s -> DROWSY)          |
       |  - Calculates Yaw/Pitch (Lookaway >= 5s -> DISTRACTED)    |
       |  - Triggers 3.0s Cabin Buzzer via Windows Multimedia API  |
       |  - Rate-limits incident alerts (Max 2 per incident)       |
       +-----------------------------+-----------------------------+
                                     |
               HTTP POST /api/v1/driver/incidents
                                     v
       +-----------------------------------------------------------+
       |            Spring Cloud Microservices Gateway             |
       |                     (Port 8080)                           |
       +------+---------------+---------------+--------------+-----+
              |               |               |              |
              v               v               v              v
       +-------------+ +-------------+ +-------------+ +-------------+
       | Auth & User | | Student Svc | | Transport   | | Attendance  |
       | (Port 8081) | | (Port 8082) | | (Port 8083) | | (Port 8084) |
       +------+------+ +------+------+ +------+------+ +------+------+
              |               |               |              |
              +---------------+-------+-------+--------------+
                                      |
                                      v RabbitMQ AMQP Broker (Port 5672)
                             +-----------------+
                             | driver-incident |
                             | bus-telemetry   |
                             | bus-approaching |
                             | attendance-mark |
                             +--------+--------+
                                      |
                                      v
       +-----------------------------------------------------------+
       |               Notification Service (Port 8086)            |
       |  - WhatsApp Dispatcher (CallMeBot + Direct wa.me URLs)    |
       |  - Spring WebSocket Alert Handler (STOMP / Native WS)     |
       |  - Role-based security gating (Admin vs Parent vs Driver) |
       +-----------------------------+-----------------------------+
                                     |
                                     v
       +-----------------------------------------------------------+
       |                  Frontend Web Applications                |
       |                 (React 19 / Vite / Tailwind)              |
       |  - Admin Safety Warning & System Logs Dashboard           |
       |  - Parent Real-Time Tracking & WhatsApp Arrival Portal    |
       |  - Driver Real-Time AI Cabin HUD & QR Boarding Scanner    |
       |  - Student Digital ID Card & QR Portal                    |
       +-----------------------------------------------------------+
```

### 2.2 User Classes & Personas
1. **Central Administrator (`ADMIN`)**:
   - Manages school bus routes, drivers, and student rosters.
   - Monitors live tracking coordinates, fleet speed anomalies, and SOS emergencies.
   - Receives aggregated bus attendance summaries (`Bus TN38AB1234 attendance: 18/20`).
   - Receives driver safety incident notifications (drowsiness, distraction) when the cabin buzzer sounds, capped strictly at 2 notifications per incident.
2. **Bus Driver (`DRIVER`)**:
   - Accesses live route navigation, scheduled pickup stops, and assigned student rosters.
   - Uses mobile/tablet camera to scan student ID QR codes for instantaneous boarding verification.
   - Receives visual HUD and audio alerts when in-cabin drowsiness or distraction is detected.
   - Dispatches instant emergency SOS alerts to central administration.
3. **Parent / Guardian (`PARENT`)**:
   - Monitors their specific child's bus location, route progress, and dynamic ETA in real time.
   - Receives 2KM approaching alerts on the Parent Dashboard and automated WhatsApp text messages.
   - Receives instantaneous boarding notifications exclusively for their own registered child.
   - Strictly isolated from driver drowsiness alerts, fleet incident reports, and other students' attendance data.
4. **Student (`STUDENT`)**:
   - Views assigned bus number, route details, pickup stop, and driver contact.
   - Generates, views, and downloads cryptographic digital student ID cards (Front, Back, and PDF).

### 2.3 Operating Environment
- **Host Operating System**: Windows 10/11 64-bit, Ubuntu Linux 22.04 LTS, or macOS Sonoma.
- **Backend Runtime**: Java OpenJDK 17 LTS, Maven 3.9+, Python 3.13 (64-bit).
- **Frontend Runtime**: Node.js 20+, Vite 8+, Modern Evergreen Browsers (Chrome 120+, Edge, Firefox, Safari).
- **Messaging Broker**: RabbitMQ 3.12+ with AMQP 0-9-1.
- **Database**: MySQL 8.0+ / MariaDB 10.11+ / H2 In-Memory Database.
- **Hardware Integration**: USB 2.0/3.0 HD Webcams, RTSP H.264 IP Transit Cameras, Audio Output Device (Laptop internal speakers or vehicle cabin PA buzzer).

---

# 3. System Architecture & Technology Stack

### 3.1 Architecture Overview
SafeBus Shield employs a **Decoupled Event-Driven Microservices Architecture** paired with a Python Edge AI Computer Vision service. Microservices communicate synchronously via RESTful JSON APIs through the Spring Cloud API Gateway, and asynchronously through a central RabbitMQ AMQP message broker.

```
+---------------------------------------------------------------------------------------+
|                                    TECHNOLOGY STACK                                   |
+----------------------+----------------------------------------------------------------+
| Backend Framework    | Spring Boot 3.2.x, Spring Cloud Gateway, Spring Data JPA       |
| Programming Language | Java 17 LTS, Python 3.13, TypeScript 5.x, JavaScript (ES2023)  |
| AI & Computer Vision | Google MediaPipe FaceLandmarker Tasks, OpenCV 4.10, NumPy      |
| Frontend Framework   | React 19, Vite 8, Tailwind CSS 3.4, Lucide React Icons         |
| Real-Time Comms      | Native WebSockets, Spring WebSocket Messaging, HTML5 Audio API |
| Event Broker         | RabbitMQ AMQP 0-9-1 Broker                                     |
| Database & ORM       | MySQL 8.0, Hibernate ORM, Flyway / JPA Schema Automation       |
| Mapping & Geolocation| Leaflet.js, OpenStreetMap Tiles, Custom Bearing Interpolator   |
| External Gateways    | WhatsApp CallMeBot REST API, Direct wa.me Universal URL Engine |
| Document Engine      | iText 7 / Apache PDFBox, Canvas HTML5 SVG Renderer             |
+----------------------+----------------------------------------------------------------+
```

### 3.2 Spring Boot Microservices Tier
The enterprise backend is divided into specialized, decoupled microservices:
1. **`eureka-server` (Port 8761)**: Netflix Eureka Service Registry providing dynamic service discovery, heartbeat tracking, and client-side load balancing.
2. **`api-gateway` (Port 8080)**: Spring Cloud Gateway acting as the single front door for all HTTP traffic. Enforces JWT token validation, CORS policies, route re-writing, and central rate limiting.
3. **`auth-service` (Port 8081)**: Manages authentication, BCrypt password hashing, JWT creation/validation, and user accounts across `ADMIN`, `DRIVER`, `PARENT`, and `STUDENT` roles.
4. **`student-service` (Port 8082)**: Manages student rosters, guardian contact information, bus assignments, and automated digital ID card rendering (front card, back card, QR generation, PDF export).
5. **`transport-service` (Port 8083)**: Manages fleet vehicles, transit routes, scheduled stops, real-time GPS telemetry ingestion, driver incident recording, and 2KM geofence proximity calculations.
6. **`attendance-service` (Port 8084)**: Ingests QR check-in scans from drivers, logs boardings/drop-offs with millisecond timestamps, and publishes attendance events to RabbitMQ.
7. **`notification-service` (Port 8086)**: Listens to RabbitMQ queues, routes alerts based on user role, triggers CallMeBot WhatsApp messages, and broadcasts real-time updates over WebSockets.

### 3.3 Computer Vision & AI Telematics Engine (`backend/cv_driver_monitor.py`)
- **MediaPipe Tasks FaceLandmarker (478 Landmarks)**: Employs deep-learning neural mesh models to detect 478 3D facial landmarks from camera frames in real time ($15 \text{ to } 30 \text{ FPS}$).
- **Eye Aspect Ratio (EAR) Algorithm**:
  $$\text{EAR} = \frac{||p_2 - p_6|| + ||p_3 - p_5||}{2 \cdot ||p_1 - p_4||}$$
  Tracks both eyes continuously. If $\text{EAR} < 0.23$ continuously for $\ge 3.0 \text{ seconds}$, status transitions from `NORMAL` to `DROWSINESS_DETECTED`.
- **Head Pose & Gaze Orientation (Yaw & Pitch)**:
  Tracks normalized horizontal yaw offset and vertical pitch ratio against nose, forehead, and chin landmarks. If the driver looks away (left, right, or down) continuously for $\ge 5.0 \text{ seconds}$, status transitions to `DISTRACTION_DETECTED`.
- **Audio Buzzer State Machine (`src/utils/buzzer.js`)**:
  Plays an urgent 3.0-second alert tone through host physical speakers (via Python `winsound` Windows multimedia API) and browser Web Audio API dual-tone siren ($900\text{ Hz} + 1200\text{ Hz}$).

---

# 4. Functional Requirements & Detailed Module Specifications

### 4.1 Module 1: Authentication & Role-Based Access Control (RBAC)
- **FR-1.1**: The system shall support four distinct user roles: `ADMIN`, `DRIVER`, `PARENT`, and `STUDENT`.
- **FR-1.2**: All authentication shall be executed via JSON Web Tokens (JWT) containing subject email, assigned role, user ID, and associated student/parent linkage.
- **FR-1.3**: Passwords shall be hashed using BCrypt with a minimum work factor of 10.
- **FR-1.4**: Standardized demo credentials shall be provisioned for operational testing:
  - **Admin**: `admin@happyjourney.ai` / `Admin@123`
  - **Driver (Bus 1)**: `rameshkumar.driver@happyjourney.ai` / `Ramesh@123`
  - **Student (Ragunath S)**: `ragunaths_std002.student@happyjourney.ai` / `Ragunath@STD002`
  - **Parent (Ragunath's Guardian)**: `senthil.parent@happyjourney.ai` / `Parent@STD002`

### 4.2 Module 2: Student Information & Dynamic Digital ID Card Generation
- **FR-2.1**: School administrators shall have the ability to register students with full profile details: Name, Roll Number, Class/Grade, Blood Group, Address, Pickup Stop, Assigned Bus, and Guardian Contact Information.
- **FR-2.2**: The system shall dynamically generate digital ID cards adhering to ISO/IEC 7810 ID-1 standards:
  - **Front Face**: Student photo avatar, student name, class, blood group, student ID number, and institutional branding.
  - **Back Face**: Emergency contact number, residential address, route code, assigned bus plate, and a high-resolution QR code.
- **FR-2.3**: The QR code shall encode a cryptographically verifiable JSON payload containing `studentId`, `name`, `busId`, `pickupStop`, and verification hash.
- **FR-2.4**: The system shall provide an authenticated endpoint `/api/v1/students/{id}/id-card/download` allowing direct download of printable high-resolution PDF ID cards.

### 4.3 Module 3: 2KM Geofence Proximity Engine & WhatsApp Notification System
- **FR-3.1**: As the bus travels along its route, the system shall compute the geodesic distance to each scheduled pickup stop using the **Haversine formula**:
  $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
  $$d = 2 \cdot R \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right) \quad (\text{where } R = 6371 \text{ km})$$
- **FR-3.2**: When the distance $d \le 2.0 \text{ km}$ and $d > 0.1 \text{ km}$ for the child's pickup stop, the proximity engine shall trigger a `BUS_APPROACHING` event.
- **FR-3.3**: The notification service shall sanitize the parent phone number and format international E.164 country code (`+91` for India, e.g. `917010846064`).
- **FR-3.4**: The notification service shall initiate background delivery via the **CallMeBot WhatsApp Gateway** (`https://api.callmebot.com/whatsapp.php?phone=...&text=...&apikey=...`).
- **FR-3.5**: The frontend Parent Dashboard and Phone GPS Controller shall dynamically generate a **1-Click WhatsApp Trigger Button** (`https://api.whatsapp.com/send?phone=...&text=...`) enabling immediate zero-failure alert dispatch.

### 4.4 Module 4: Driver Computer Vision Monitoring & Strict Notification Cap
- **FR-4.1**: The system shall process driver camera frames continuously in real time.
- **FR-4.2**: Continuous eye closure $\ge 3.0 \text{ seconds}$ shall trigger a confirmed `DROWSINESS_DETECTED` state and activate the physical 3.0-second cabin buzzer.
- **FR-4.3**: Continuous head turned away $\ge 5.0 \text{ seconds}$ shall trigger a confirmed `DISTRACTION_DETECTED` state and activate the cabin buzzer.
- **FR-4.4**: Normal driver behavior (`status: "NORMAL"`, `"ATTENTIVE"`) or blinks $<3.0 \text{ seconds}$ shall **NEVER** generate notification alerts.
- **FR-4.5 (Strict Notification Cap)**: For any single drowsiness incident, the system shall emit **at most 2 notifications** to the Central Admin:
  - **Notification 1 (Initial Buzzer Trigger)**: Dispatched immediately when cabin buzzer sounds (`🚨 Driver drowsiness alert — buzzer activated (Bus [id]).`).
  - **Notification 2 (Follow-up Reminder)**: Dispatched only if drowsiness persists for $\ge 5\text{--}8 \text{ seconds}$ (`⚠ Driver drowsiness reminder: Bus [id] drowsiness persisting.`).
  - **Suppression**: Any subsequent triggers during the same continuous incident (triggers 3 through 9+) shall be **strictly dropped**.
- **FR-4.6**: Driver incidents shall be routed **strictly and exclusively to Central Admin**. Parents and students shall receive 0 driver safety alerts.
- **FR-4.7 (Multi-Camera Isolation)**: In multi-camera views (e.g., `DriverAnalysis.jsx`), only the single actively selected bus camera (`activeWebcamBusId`) shall stream the physical laptop webcam to the CV engine. Inactive cameras shall display standby telemetry, preventing a single user from falsely triggering alerts across multiple buses.

### 4.5 Module 5: Student QR Boarding & Attendance Routing
- **FR-5.1**: Drivers shall scan student ID cards using the in-app camera scanner on `DriverBoarding.jsx`.
- **FR-5.2**: Upon successful QR scan, the system shall record student boarding status with millisecond timestamp and publish `ATTENDANCE_MARKED` event to RabbitMQ.
- **FR-5.3**: **Parent Notification Routing**: The matching parent shall receive an instantaneous push alert (`🔔 Student Attendance: [Student Name] has successfully boarded Bus [BusId].`). Non-matching parents shall receive 0 alerts.
- **FR-5.4**: **Admin Notification Routing**: The Central Admin shall **NOT** receive individual student boarding notifications. Instead, the system shall maintain and update a single aggregated summary notification per bus (`Bus [BusId] attendance: [Present]/[Total] students present`).

### 4.6 Module 6: Emergency SOS Alert System
- **FR-6.1**: Drivers shall have access to an instant Emergency SOS button on the Driver Dashboard.
- **FR-6.2**: Triggering SOS shall dispatch an asynchronous priority event through Spring Cloud Gateway to `sos-service` and RabbitMQ.
- **FR-6.3**: Connected Admin dashboards shall immediately sound a high-priority audible siren and display an interactive Emergency Warning banner.
- **FR-6.4**: Admin shall acknowledge the alert with timestamp recording, and subsequently resolve the alert with mandatory incident resolution remarks.

---

# 5. External Interface Requirements

### 5.1 User Interfaces
1. **Admin Portal (`/admin`)**:
   - `AdminDashboardTab`: Fleet overview, operational KPI metrics, active bus cards.
   - `AdminLiveTrackingTab`: Leaflet map with real-time bus marker positions, route lines, stop markers.
   - `DriverAnalysis`: Driver safety score cards, live AI camera HUD, verified driver registry.
   - `AdminNotificationsTab`: Safety Warning & System Logs audit feed with clear-all capability.
2. **Driver Portal (`/driver`)**:
   - `DriverDashboard`: Real-time CV camera stream, EAR/MAR HUD gauges, speed and stop countdown.
   - `DriverBoarding`: Real-time QR code barcode scanner with audio confirmation tone.
3. **Parent Portal (`/parent`)**:
   - `ParentDashboard`: Child transit status banner, real-time map, 2KM approaching alert with direct WhatsApp trigger, child-only attendance timeline.
4. **Phone GPS Controller (`/phone-gps`)**:
   - Virtual transit controller allowing manual GPS coordinates injection, route path traversal, and 2KM WhatsApp testing.

### 5.2 Hardware & Physical Device Interfaces
- **Webcam / Video Ingestion**: Standard W3C `MediaDevices.getUserMedia()` capturing $640 \times 480$ video frames at $15 \text{ to } 30\text{ FPS}$.
- **RTSP IP Camera Streams**: Supported via OpenCV `cv2.VideoCapture("rtsp://...")` in standalone Python mode.
- **Audio Output**: Dual delivery via HTML5 Web Audio API dual-tone synthesized oscillator and Windows Multimedia API (`winsound.PlaySound`) through physical laptop/cabin speakers.

### 5.3 Software & REST API Gateway Interface Specifications
All REST endpoints are routed through the Spring Cloud Gateway (`http://localhost:8080`):

| Method | Endpoint Path | Service | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | `auth-service` | Authenticates user; returns JWT token and role profile. |
| `GET` | `/api/v1/students` | `student-service` | Retrieves registered student rosters and transit metadata. |
| `GET` | `/api/v1/students/{id}/id-card/download` | `student-service` | Downloads high-resolution printable PDF student ID card. |
| `GET` | `/api/v1/buses` | `transport-service` | Retrieves fleet vehicles, drivers, route IDs, and active status. |
| `POST`| `/api/v1/buses/telemetry` | `transport-service` | Ingests GPS coordinates, speed, and heading telemetry. |
| `GET` | `/api/v1/buses/{id}/proximity` | `transport-service` | Returns Haversine distance, ETA, and 2KM geofence status. |
| `POST`| `/api/v1/driver/incidents` | `transport-service` | Queues confirmed driver safety violations for processing. |
| `POST`| `/api/v1/driver/behavior` | `transport-service` | Updates live driver behavior cache (EAR, MAR, safety score). |
| `POST`| `/api/v1/attendance/scan` | `attendance-service` | Processes student QR code boarding check-in. |
| `POST`| `/api/v1/sos` | `sos-service` | Dispatches priority emergency SOS alarm. |
| `POST`| `/api/v1/sos/{id}/acknowledge` | `sos-service` | Acknowledges active SOS alarm with admin username. |
| `POST`| `/api/v1/sos/{id}/resolve` | `sos-service` | Resolves active SOS alarm with audit remarks. |
| `POST`| `http://localhost:5001/process_frame` | Python AI Engine | Analyzes webcam frame for face mesh, EAR, and head pose. |
| `POST`| `http://localhost:5001/trigger_buzzer` | Python AI Engine | Activates physical 3.0s laptop speaker buzzer. |

### 5.4 Real-Time WebSocket Messaging Protocol
WebSockets operate over endpoint `ws://localhost:8086/ws/alerts`:

| Message Type | Direction | Payload Structure | Target Recipient |
| :--- | :--- | :--- | :--- |
| `BUS_LOCATION` | Server $\rightarrow$ Client | `{ busId, latitude, longitude, speed, heading }` | All connected clients |
| `BUS_APPROACHING` | Server $\rightarrow$ Client | `{ busId, studentId, distanceKm, etaMinutes, whatsappUrl }` | Parent (assigned stop) & Admin |
| `DRIVER_INCIDENT` | Server $\rightarrow$ Client | `{ busId, driverId, incidentType, confidence }` | **Central Admin Only** |
| `DRIVER_TELEMETRY`| Server $\rightarrow$ Client | `{ busId, status, ear, mar, safetyScore }` | Admin & Driver |
| `ATTENDANCE` | Server $\rightarrow$ Client | `{ studentId, busId, scanTime, attendanceType }` | **Matching Parent Only** |
| `SOS` | Server $\rightarrow$ Client | `{ sosId, busId, emergencyType, timestamp }` | Admin & Driver |

---

# 6. Non-Functional Requirements (NFRs)

### 6.1 Performance & Latency Requirements
- **NFR-1.1 (CV Latency)**: The Python Computer Vision engine shall process individual frames with an end-to-end latency of $<65 \text{ ms}$ on standard multi-core CPUs.
- **NFR-1.2 (Proximity Evaluation)**: Geofence proximity and Haversine distance calculations shall execute in $<10 \text{ ms}$ upon receipt of each GPS telemetry packet.
- **NFR-1.3 (WebSocket Dispatch)**: Real-time alerts published to RabbitMQ shall reach connected frontend browser sessions within $<150 \text{ ms}$.

### 6.2 Reliability & Fault Tolerance
- **NFR-2.1 (Notification Rate Limiting)**: The system shall enforce strict rate limiting on driver drowsiness alerts, guaranteeing that **no more than 2 notifications** are dispatched per continuous incident.
- **NFR-2.2 (Offline Camera Fallback)**: If the Python CV service is offline, the React frontend shall seamlessly display fallback face mesh simulations and gracefully retry connections without crashing.
- **NFR-2.3 (Buzzer State Lock)**: The physical cabin buzzer shall enforce a strict 3.0-second non-looping timer with re-trigger locks to prevent audio buffer overruns.

### 6.3 Security & Privacy Compliance
- **NFR-3.1 (Role Boundary Isolation)**: Parents shall never receive or view data pertaining to other students, driver fatigue metrics, or fleet-wide disciplinary telemetry.
- **NFR-3.2 (Credential Security)**: All passwords in database storage shall be salted and hashed using BCrypt.
- **NFR-3.3 (Token Expiration)**: JWT tokens shall expire after 24 hours of inactivity.

---

# 7. Database Data Dictionary & Entity-Relationship Specifications

### 7.1 Key Database Entities & Data Dictionary

#### Table: `accounts`
Stores system users across all roles.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PK, AUTO_INCREMENT` | Unique account identifier. |
| `username` | `VARCHAR(100)` | `UNIQUE, NOT NULL` | Login username / email address. |
| `password` | `VARCHAR(255)` | `NOT NULL` | BCrypt-hashed password. |
| `role` | `VARCHAR(20)` | `NOT NULL` | User role: `ADMIN`, `DRIVER`, `PARENT`, `STUDENT`. |
| `full_name` | `VARCHAR(150)` | `NOT NULL` | Display name of the user. |
| `phone` | `VARCHAR(20)` | `NULL` | Contact phone number for SMS/WhatsApp. |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP`| Account creation timestamp. |

#### Table: `students`
Stores enrolled students and transit metadata.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(50)` | `PK` | Student ID (e.g., `STD002`). |
| `name` | `VARCHAR(150)` | `NOT NULL` | Student full name. |
| `class_name` | `VARCHAR(50)` | `NOT NULL` | Class or grade level. |
| `blood_group` | `VARCHAR(10)` | `NULL` | Blood group for emergency medical cards. |
| `parent_id` | `BIGINT` | `FK -> accounts(id)` | Linked parent user account. |
| `parent_phone` | `VARCHAR(20)` | `NOT NULL` | Guardian phone number for WhatsApp alerts. |
| `assigned_bus` | `VARCHAR(50)` | `NOT NULL` | Assigned bus plate (e.g., `TN38AB1234`). |
| `pickup_stop` | `VARCHAR(150)` | `NOT NULL` | Designated pickup/drop stop name. |
| `boarded` | `BOOLEAN` | `DEFAULT FALSE` | Current transit boarding status. |
| `reached_school`| `BOOLEAN` | `DEFAULT FALSE` | School arrival confirmation status. |

#### Table: `buses`
Stores school bus fleet inventory.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(50)` | `PK` | Vehicle plate number (e.g., `TN38AB1234`). |
| `name` | `VARCHAR(100)` | `NOT NULL` | Fleet display name (e.g., `Bus 1`). |
| `driver_name` | `VARCHAR(150)` | `NOT NULL` | Assigned driver name. |
| `driver_phone` | `VARCHAR(20)` | `NOT NULL` | Driver mobile number. |
| `route_id` | `VARCHAR(50)` | `NOT NULL` | Assigned transit route identifier. |
| `capacity` | `INT` | `DEFAULT 40` | Total passenger seating capacity. |
| `current_lat` | `DOUBLE` | `NULL` | Most recent latitude coordinate. |
| `current_lng` | `DOUBLE` | `NULL` | Most recent longitude coordinate. |
| `speed` | `DOUBLE` | `DEFAULT 0.0` | Current vehicle speed in km/h. |
| `status` | `VARCHAR(50)` | `DEFAULT 'Idle'` | Operating status (`Idle`, `Running`, `Completed`). |

#### Table: `driver_incidents`
Stores confirmed driver behavior violations for safety audits.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | `PK, AUTO_INCREMENT` | Incident log identifier. |
| `driver_id` | `VARCHAR(100)` | `NOT NULL` | Driver account identifier. |
| `bus_id` | `VARCHAR(50)` | `NOT NULL` | Vehicle identifier. |
| `incident_type`| `VARCHAR(50)` | `NOT NULL` | `DROWSY`, `LOOKING_AWAY`, `PHONE_USAGE`. |
| `confidence` | `DOUBLE` | `NOT NULL` | AI detection confidence score ($0.0 \text{ to } 1.0$). |
| `image_base64` | `LONGTEXT` | `NULL` | Snapshot frame captured during violation. |
| `timestamp` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP`| Violation occurrence timestamp. |
| `resolved` | `BOOLEAN` | `DEFAULT FALSE` | Administrative resolution state. |

---

# 8. Comprehensive Verification & Traceability Matrix

### 8.1 Verification of Chat Inquiries & Problem Resolutions
| Request / Inquiry | Root Cause Identified | Engineering Fix Applied | Verification Status |
| :--- | :--- | :--- | :--- |
| **1. Student, Parent, Driver Credentials** | User requested login credentials for newly added students. | Standardized deterministic credential patterns generated and documented in `task.md` and database seeders. | **VERIFIED** |
| **2. Student Ragunath S showing Sathish R** | Hardcoded profile fallback was referencing default user in `StudentIDCardPage.jsx`. | Implemented dynamic lookup matching logged-in username with student database entity; resolved student ID card download endpoint. | **VERIFIED** |
| **3. GPS 2KM Geofence Live Tracking** | Needed live tracking, 2KM approaching notification, and phone GPS controller. | Implemented `PhoneGpsController.tsx` with Haversine distance engine and dynamic waypoint traversal. | **VERIFIED** |
| **4. Phone QR Connection Refused** | Localhost URLs were inaccessible from external smartphones on same Wi-Fi. | Bound Vite to `--host` (`0.0.0.0`) and added network IP detection API in `vite.config.js`. | **VERIFIED** |
| **5. WhatsApp Alert Not Received on Phone** | `WhatsAppNotificationService.java` used mock endpoint; Meta WhatsApp network rejects unsolicited messages without gateway. | Added CallMeBot HTTP automated gateway, phone number country-code sanitizer (`+91`), and direct 1-click `wa.me` trigger buttons. | **VERIFIED** |
| **6. Normal Detections Sending Notifications** | `NORMAL` and `ATTENTIVE` states were received as incidents and displayed as alerts. | Added strict server-side and client-side filters rejecting `NORMAL`, `ATTENTIVE`, and `UNKNOWN` states from ever creating alerts. | **VERIFIED** |
| **7. Buzzer Rings Only -> Admin Only** | Notifications were leaking to parents and drivers regardless of role. | Gated driver incident alerts strictly to Central Admin and only when cabin buzzer plays (`buzzerPlayed === true`). | **VERIFIED** |
| **8. 9 Notifications for 1 Drowsiness Incident** | Multi-camera view in `DriverAnalysis.jsx` sampled 1 webcam across 3 buses; missing incident session cap in Python and AppContext. | 1. Added active camera isolation (`activeWebcamBusId`).<br>2. Capped alerts to strictly max 2 per continuous incident in Python and React.<br>3. Pruned legacy bloated logs. | **VERIFIED** |

### 8.2 End-to-End Test Suite Execution Matrix
- **`backend/test_drowsiness_alert_cap.py`**:
  - Test 1 (Initial Confirmation): Dispatched alert 1 (`PASS`).
  - Test 2 (Burst Suppression $<8$s): Suppressed duplicate alerts (`PASS`).
  - Test 3 (Sustained $\ge 8$s): Dispatched reminder alert 2 (`PASS`).
  - Test 4 (10 Rapid Continuous Triggers): Strictly capped at 2 (`PASS`).
  - Test 5 (Recovery to Normal): Pruned session after 15s (`PASS`).
  - Test 6 (Subsequent Incident): Cleanly started new incident with alert 1 (`PASS`).
- **`test_frontend_alert_cap.js`**:
  - Validated deterministic ID assignment (`driver-alert-TN38AB1234-drowsiness-1`, `...-2`).
  - Capped notification array length at exactly 2 alerts (`PASS`).
  - Dropped all `NORMAL` and `ATTENTIVE` updates (`PASS`).
- **Production Build**:
  - `npm run build` executed in 1.38 seconds with zero compile or type errors (`PASS`).

---

# 9. System Deployment, Port Allocations & Execution Guide

### 9.1 Network Port Allocation Table
| Service Name | Port | Protocol | Purpose |
| :--- | :--- | :--- | :--- |
| **Spring Cloud API Gateway** | `8080` | HTTP | Single public API entry point and reverse proxy. |
| **Auth Service** | `8081` | HTTP | User login, registration, and JWT token issuance. |
| **Student Service** | `8082` | HTTP | Student rosters, ID card generation, PDF exports. |
| **Transport Service** | `8083` | HTTP | Bus tracking, route schedules, driver incidents. |
| **Attendance Service** | `8084` | HTTP | QR boarding scans and student attendance logging. |
| **Notification Service** | `8086` | HTTP / WS | RabbitMQ event consumer, WhatsApp push, WebSockets. |
| **Netflix Eureka Server** | `8761` | HTTP | Microservice discovery and registration dashboard. |
| **RabbitMQ Message Broker** | `5672` | AMQP | Asynchronous event queuing and messaging. |
| **RabbitMQ Admin Console** | `15672`| HTTP | Web management console for queues and exchanges. |
| **Python Edge AI CV Monitor**| `5001` | HTTP | MediaPipe eye/face tracking and cabin buzzer. |
| **Vite React Frontend** | `5173` | HTTP | Responsive Single Page Web Application. |

### 9.2 Service Startup & Execution Instructions

#### 1. Start RabbitMQ Broker
Ensure RabbitMQ is running locally or via Docker:
```bash
docker run -d --name safebus-rabbit -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

#### 2. Start Spring Boot Microservices
Execute the automated PowerShell startup script from `backend-springboot`:
```powershell
powershell -ExecutionPolicy Bypass -File .\run_all_backends.ps1
```
Or start services individually using Maven:
```powershell
.\mvnw.cmd spring-boot:run -pl eureka-server
.\mvnw.cmd spring-boot:run -pl api-gateway
.\mvnw.cmd spring-boot:run -pl auth-service
.\mvnw.cmd spring-boot:run -pl student-service
.\mvnw.cmd spring-boot:run -pl transport-service
.\mvnw.cmd spring-boot:run -pl attendance-service
.\mvnw.cmd spring-boot:run -pl notification-service
```

#### 3. Start Python AI Computer Vision Engine
From the project root directory:
```powershell
py -3.13 -u backend/cv_driver_monitor.py --service
```

#### 4. Start React Frontend
From the project root directory:
```powershell
npm run dev -- --host
```
Open your browser at `http://localhost:5173`.
