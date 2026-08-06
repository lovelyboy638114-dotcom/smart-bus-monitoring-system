# Swagger OpenAPI Documentation Specs definition

SWAGGER_SPEC = {
    "swagger": "2.0",
    "info": {
        "title": "SafeBus Shield - Smart School Bus Telematics API",
        "description": "REST APIs for Authentication, Fleet tracking, Student monitoring, Attendance verification, and Emergency SOS response.",
        "version": "1.0.0"
    },
    "basePath": "/api",
    "schemes": ["http"],
    "paths": {
        "/login": {
            "post": {
                "tags": ["Authentication"],
                "summary": "Authenticate user credentials",
                "parameters": [
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "username": {"type": "string", "example": "driver@happyjourney.ai"},
                                "password": {"type": "string", "example": "driver123"},
                                "role": {"type": "string", "example": "driver"}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Authentication successful"},
                    "401": {"description": "Invalid credentials"}
                }
            }
        },
        "/register": {
            "post": {
                "tags": ["Authentication"],
                "summary": "Register a new client portal account",
                "responses": {
                    "200": {"description": "Account created successfully"},
                    "400": {"description": "Username already exists"}
                }
            }
        },
        "/buses": {
            "get": {
                "tags": ["Buses"],
                "summary": "Fetch list of active school buses",
                "responses": {
                    "200": {"description": "Array of bus details"}
                }
            }
        },
        "/buses/location": {
            "get": {
                "tags": ["Buses"],
                "summary": "Fetch live coordinate markers of running fleet",
                "responses": {
                    "200": {"description": "Array of coordinates mapping"}
                }
            }
        },
        "/students": {
            "get": {
                "tags": ["Students"],
                "summary": "Fetch student profiles database",
                "responses": {
                    "200": {"description": "Array of student details"}
                }
            }
        },
        "/v1/sos": {
            "post": {
                "tags": ["SOS Emergency"],
                "summary": "Dispatch a critical Emergency SOS alert",
                "parameters": [
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "busId": {"type": "string", "example": "TN38AB1234"},
                                "latitude": {"type": "number", "example": 10.8801},
                                "longitude": {"type": "number", "example": 77.0224},
                                "speed": {"type": "integer", "example": 45},
                                "route": {"type": "string", "example": "Route A"},
                                "emergency_type": {"type": "string", "example": "Medical"}
                            }
                        }
                    }
                ],
                "responses": {
                    "201": {"description": "SOS Created successfully"},
                    "409": {"description": "SOS already active or rate limit hit"}
                }
            }
        },
        "/v1/sos/active": {
            "get": {
                "tags": ["SOS Emergency"],
                "summary": "Fetch current active/unresolved SOS alerts",
                "responses": {
                    "200": {"description": "List of active emergency alerts"}
                }
            }
        },
        "/v1/sos/history": {
            "get": {
                "tags": ["SOS Emergency"],
                "summary": "Fetch historical log list of resolved alerts",
                "responses": {
                    "200": {"description": "List of past resolved incidents"}
                }
            }
        },
        "/v1/sos/statistics": {
            "get": {
                "tags": ["SOS Emergency"],
                "summary": "Calculate operational control stats ratios",
                "responses": {
                    "200": {"description": "Incident analytics averages object"}
                }
            }
        },
        "/v1/sos/{id}/acknowledge": {
            "post": {
                "tags": ["SOS Emergency"],
                "summary": "Admin acknowledges active emergency warning",
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "required": True,
                        "type": "string"
                    }
                ],
                "responses": {
                    "200": {"description": "Alert acknowledged successfully"}
                }
            }
        },
        "/v1/sos/{id}/resolve": {
            "post": {
                "tags": ["SOS Emergency"],
                "summary": "Admin resolves the incident",
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "required": True,
                        "type": "string"
                    },
                    {
                        "name": "body",
                        "in": "body",
                        "required": True,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "remarks": {"type": "string", "example": "Alternative bus dispatched. Students safe."}
                            }
                        }
                    }
                ],
                "responses": {
                    "200": {"description": "Alert resolved successfully"}
                }
            }
        }
    }
}
