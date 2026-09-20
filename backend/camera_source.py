"""
SafeBus Shield - Camera Hardware Abstraction Layer
==================================================
This module decouples video frame acquisition from the computer vision detection engine.
It allows the same OpenCV/MediaPipe detection pipeline to seamlessly ingest frames from:
  1. BrowserStreamSource: Ingests frames sent via HTTP POST from browser's navigator.mediaDevices.getUserMedia
  2. WebcamSource: Ingests frames directly from local USB / laptop webcam using cv2.VideoCapture
  3. RTSPBusCameraSource: Ingests frames from physical onboard bus cameras over RTSP/HTTP network streams
  4. MockVideoSource: Ingests pre-recorded video or test patterns for repeatable automated CI/CD testing
"""

import abc
import time
import base64
import numpy as np
import cv2


class BaseCameraSource(abc.ABC):
    """Abstract base class for all camera input sources."""

    @abc.abstractmethod
    def get_frame(self):
        """
        Retrieves the latest available video frame as a BGR numpy array.
        Returns:
            (success: bool, frame: np.ndarray or None)
        """
        pass

    @abc.abstractmethod
    def release(self):
        """Releases underlying camera hardware or network connection."""
        pass

    @abc.abstractmethod
    def is_opened(self) -> bool:
        """Returns True if the camera source is connected and operational."""
        pass

    @abc.abstractmethod
    def get_source_info(self) -> dict:
        """Returns metadata description of the active camera source."""
        pass


class BrowserStreamSource(BaseCameraSource):
    """
    Ingests frames transmitted by the driver portal frontend (e.g. laptop webcam captured via WebRTC/getUserMedia).
    Frames arrive as base64-encoded strings and are decoded into BGR numpy matrices.
    """

    def __init__(self, name="Browser Laptop Webcam"):
        self.name = name
        self._last_frame = None
        self._last_received_time = 0.0
        self._timeout_seconds = 5.0

    def push_frame_base64(self, b64_string: str) -> bool:
        """Decodes an incoming base64 frame from HTTP payload and stores it as the latest frame."""
        try:
            if not b64_string:
                return False
            if "," in b64_string:
                b64_string = b64_string.split(",")[1]
            img_bytes = base64.b64decode(b64_string)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is not None and frame.size > 0:
                self._last_frame = frame
                self._last_received_time = time.time()
                return True
        except Exception as e:
            print(f"[BrowserStreamSource] Frame decode error: {e}")
        return False

    def get_frame(self):
        now = time.time()
        if self._last_frame is not None and (now - self._last_received_time) < self._timeout_seconds:
            return True, self._last_frame.copy()
        return False, None

    def is_opened(self) -> bool:
        return (time.time() - self._last_received_time) < self._timeout_seconds

    def release(self):
        self._last_frame = None

    def get_source_info(self) -> dict:
        return {
            "type": "BROWSER_WEBCAM_STREAM",
            "name": self.name,
            "connected": self.is_opened(),
            "last_frame_age_seconds": round(time.time() - self._last_received_time, 2)
        }


class WebcamSource(BaseCameraSource):
    """
    Direct hardware capture using OpenCV VideoCapture for local USB or integrated laptop webcams.
    """

    def __init__(self, device_index=0, width=640, height=480):
        self.device_index = device_index
        self.width = width
        self.height = height
        self.cap = None
        self._open()

    def _open(self):
        try:
            self.cap = cv2.VideoCapture(self.device_index, cv2.CAP_DSHOW if cv2.CAP_DSHOW else cv2.CAP_ANY)
            if self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        except Exception as e:
            print(f"[WebcamSource] Error opening device {self.device_index}: {e}")
            self.cap = None

    def get_frame(self):
        if self.cap is None or not self.cap.isOpened():
            self._open()
            if self.cap is None or not self.cap.isOpened():
                return False, None
        ret, frame = self.cap.read()
        if ret and frame is not None:
            # Flip horizontally for mirrored view
            frame = cv2.flip(frame, 1)
            return True, frame
        return False, None

    def is_opened(self) -> bool:
        return self.cap is not None and self.cap.isOpened()

    def release(self):
        if self.cap is not None:
            self.cap.release()
            self.cap = None

    def get_source_info(self) -> dict:
        return {
            "type": "LOCAL_WEBCAM",
            "device_index": self.device_index,
            "connected": self.is_opened(),
            "resolution": f"{self.width}x{self.height}"
        }


class RTSPBusCameraSource(BaseCameraSource):
    """
    Vehicle hardware capture for real school bus deployment using RTSP/ONVIF IP cameras.
    """

    def __init__(self, rtsp_url="rtsp://192.168.1.100:554/stream1"):
        self.rtsp_url = rtsp_url
        self.cap = None
        self._last_reconnect = 0.0

    def _connect(self):
        now = time.time()
        if now - self._last_reconnect < 3.0:
            return
        self._last_reconnect = now
        try:
            self.cap = cv2.VideoCapture(self.rtsp_url)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimal buffer for lowest latency
        except Exception as e:
            print(f"[RTSPBusCameraSource] Connection error to {self.rtsp_url}: {e}")
            self.cap = None

    def get_frame(self):
        if self.cap is None or not self.cap.isOpened():
            self._connect()
            if self.cap is None or not self.cap.isOpened():
                return False, None
        ret, frame = self.cap.read()
        if ret and frame is not None:
            return True, frame
        # If frame drop, release to trigger reconnect
        self.release()
        return False, None

    def is_opened(self) -> bool:
        return self.cap is not None and self.cap.isOpened()

    def release(self):
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None

    def get_source_info(self) -> dict:
        return {
            "type": "VEHICLE_RTSP_CAMERA",
            "url": self.rtsp_url,
            "connected": self.is_opened()
        }


class MockVideoSource(BaseCameraSource):
    """
    Simulation / Testing video source playing a video file or test image in a loop.
    """

    def __init__(self, video_path):
        self.video_path = video_path
        self.cap = cv2.VideoCapture(video_path)

    def get_frame(self):
        if self.cap is None or not self.cap.isOpened():
            return False, None
        ret, frame = self.cap.read()
        if not ret:
            # Loop video
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = self.cap.read()
        return bool(ret), frame

    def is_opened(self) -> bool:
        return self.cap is not None and self.cap.isOpened()

    def release(self):
        if self.cap is not None:
            self.cap.release()
            self.cap = None

    def get_source_info(self) -> dict:
        return {
            "type": "MOCK_VIDEO_SOURCE",
            "path": self.video_path,
            "connected": self.is_opened()
        }
