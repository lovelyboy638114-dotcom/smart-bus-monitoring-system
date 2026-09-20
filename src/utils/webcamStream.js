/**
 * SafeBus Shield - Shared Webcam MediaStream Manager
 * ==================================================
 * Allows multiple camera components (Driver Dashboard + Admin multi-bus feeds)
 * to attach to the same physical hardware camera stream simultaneously without
 * hardware device locks, React StrictMode track-drop issues, or permission churn.
 */

let globalWebcamStream = null;
let streamPromise = null;
let cleanupTimer = null;

export const isStreamLive = (s) => {
  return s && s.active && s.getVideoTracks().length > 0 && s.getVideoTracks().some(t => t.readyState === 'live');
};

export const acquireSharedWebcam = async () => {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }

  if (isStreamLive(globalWebcamStream)) {
    return globalWebcamStream;
  }

  if (!navigator?.mediaDevices?.getUserMedia) {
    const err = new Error('Camera API not supported or browser context insecure');
    err.name = 'NotSupportedError';
    return Promise.reject(err);
  }

  if (!streamPromise) {
    streamPromise = navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640 }, 
        height: { ideal: 480 }, 
        frameRate: { ideal: 15 } 
      },
      audio: false
    }).then(s => {
      globalWebcamStream = s;
      streamPromise = null;
      return s;
    }).catch(err => {
      streamPromise = null;
      throw err;
    });
  }

  return streamPromise;
};

export const releaseSharedWebcam = () => {
  if (cleanupTimer) clearTimeout(cleanupTimer);
  cleanupTimer = setTimeout(() => {
    // Keep alive during navigation/remounts; only stop tracks after 3 seconds of complete unmount
    if (globalWebcamStream) {
      globalWebcamStream.getTracks().forEach(t => t.stop());
      globalWebcamStream = null;
    }
  }, 3000);
};
