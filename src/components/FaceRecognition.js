import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { initializeCollection, searchFace } from '../api/rekognitionApi';
import './FaceRecognition.css';

const FaceRecognition = () => {
  const webcamRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [stream, setStream] = useState(null);
  const [recognizedPerson, setRecognizedPerson] = useState(null);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [detectedFaces, setDetectedFaces] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastProcessedTime = useRef(0);
  const THROTTLE_TIME = 300; // 300ms between recognitions
  const [isBackCamera, setIsBackCamera] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoTTS, setAutoTTS] = useState(true);
  const lastSpokenMessage = useRef('');
  const lastRecognizedName = useRef('');

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update video dimensions to maximize height
  const videoDimensions = {
    width: Math.min(windowDimensions.width * 0.95, 1280),
    height: Math.min(windowDimensions.height * 0.85, 1080) // Increased height percentage
  };

  useEffect(() => {
    const initialize = async () => {
      const success = await initializeCollection();
      setIsInitialized(success);
    };
    initialize();
  }, []);

  const findBackCamera = useCallback((videoDevices) => {
    return videoDevices.findIndex(device => 
      device.label.toLowerCase().includes('back') || 
      device.label.toLowerCase().includes('rear')
    );
  }, []);

  const requestCameraAccess = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log("Camera access granted!");
      
      setStream(mediaStream);

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);

      // Start with back camera if available
      const backCameraIndex = findBackCamera(videoDevices);
      if (backCameraIndex !== -1) {
        setCurrentDeviceIndex(backCameraIndex);
        setIsBackCamera(true);
      }

      setIsCameraEnabled(true);
      setError(null);

      mediaStream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error("Camera access denied:", error);
      setError('Camera access was denied. Please enable camera access in your browser settings.');
      setIsCameraEnabled(false);
    }
  };

  const handleCameraChange = (e) => {
    const newIndex = parseInt(e.target.value);
    setCurrentDeviceIndex(newIndex);
    
    const device = devices[newIndex];
    const isBack = device.label.toLowerCase().includes('back') || 
                   device.label.toLowerCase().includes('rear');
    setIsBackCamera(isBack);
  };

  // Clean up function to stop all tracks when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const captureImage = useCallback(() => {
    if (!webcamRef.current || !isCameraEnabled) {
      return null;
    }
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      return null;
    }
    return fetch(imageSrc)
      .then(res => res.arrayBuffer())
      .then(buffer => new Uint8Array(buffer));
  }, [isCameraEnabled]);

  const startRecognition = useCallback(async () => {
    const now = Date.now();
    if (isProcessing || now - lastProcessedTime.current < THROTTLE_TIME) {
      return;
    }

    try {
      setIsProcessing(true);
      const imageData = await captureImage();
      if (!imageData) return;
      
      const match = await searchFace(imageData);
      lastProcessedTime.current = Date.now();

      if (match) {
        setRecognizedPerson({
          name: match.Face.ExternalImageId,
          confidence: match.Similarity,
          boundingBox: match.Face.BoundingBox
        });
        setDetectedFaces([match.Face]);
      } else {
        setRecognizedPerson(null);
        setDetectedFaces([]);
      }
    } catch (err) {
      console.error('Error searching face:', err);
      setDetectedFaces([]);
    } finally {
      setIsProcessing(false);
    }
  }, [captureImage]);

  useEffect(() => {
    if (isInitialized && isCameraEnabled) {
      const interval = setInterval(startRecognition, THROTTLE_TIME);
      return () => clearInterval(interval);
    }
  }, [isInitialized, isCameraEnabled, startRecognition]);

  const speakMessage = useCallback((message) => {
    if (isSpeaking) return;

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking]);

  const getStatusMessage = () => {
    if (recognizedPerson) {
      const currentHour = new Date().getHours();
      let greeting;
      if (currentHour < 12) {
        greeting = "Good morning";
      } else if (currentHour < 18) {
        greeting = "Good afternoon";
      } else {
        greeting = "Good evening";
      }
      return `${greeting} ${recognizedPerson.name}`;
    }
    return "No one detected";
  };

  // Modified auto-speak effect
  useEffect(() => {
    if (recognizedPerson && autoTTS) {
      // Only speak if the name has changed
      if (lastRecognizedName.current !== recognizedPerson.name) {
        speakMessage(getStatusMessage());
        lastRecognizedName.current = recognizedPerson.name;
      }
    }
  }, [recognizedPerson, speakMessage, autoTTS]);

  if (!isInitialized) {
    return <div className="initialization-message">Initializing face recognition system...</div>;
  }

  if (!isCameraEnabled) {
    return (
      <div className="camera-access-container">
        <h2>ΣΝ Recognizer</h2>
        <p>No more essays for PC131</p>
        <button onClick={requestCameraAccess} className="camera-access-button">
          Enable Camera
        </button>
        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  return (
    <div className="black-bg">
      <div className="face-recognition-container">
        {!isCameraEnabled ? (
          <div className="camera-access-container">
            <h2>Camera Access Required</h2>
            <p>This app needs access to your camera to recognize faces.</p>
            <button onClick={requestCameraAccess} className="camera-access-button">
              Enable Camera
            </button>
            {error && <div className="error-message">{error}</div>}
          </div>
        ) : (
          <>
            {devices.length > 1 && (
              <div className="camera-selector">
                <select 
                  value={currentDeviceIndex}
                  onChange={handleCameraChange}
                  className="camera-select"
                >
                  {devices.map((device, index) => (
                    <option key={device.deviceId} value={index}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="webcam-container">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  width: videoDimensions.width,
                  height: videoDimensions.height,
                  deviceId: devices[currentDeviceIndex]?.deviceId,
                  facingMode: isBackCamera ? 'environment' : 'user'
                }}
                style={{
                  width: videoDimensions.width,
                  height: videoDimensions.height,
                  transform: isBackCamera ? 'scaleX(1)' : 'scaleX(-1)'
                }}
              />
              <div className="status-message-container">
                <div className="status-message-overlay">
                  {getStatusMessage()}
                </div>
                <button 
                  className="speak-button"
                  onClick={() => speakMessage(getStatusMessage())}
                  disabled={isSpeaking}
                >
                  {isSpeaking ? '🔊' : '🔈'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FaceRecognition; 