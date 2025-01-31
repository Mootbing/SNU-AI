import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { initializeCollection, addFaceToCollection, searchFace } from '../api/rekognitionApi';
import './FaceRecognition.css';

const FaceRecognition = () => {
  const webcamRef = useRef(null);
  const videoRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [stream, setStream] = useState(null);
  const [recognizedPerson, setRecognizedPerson] = useState(null);
  const [isAddingFace, setIsAddingFace] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isMobileSafari] = useState(/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream);

  useEffect(() => {
    const initialize = async () => {
      const success = await initializeCollection();
      setIsInitialized(success);
    };
    initialize();
  }, []);

  const requestCameraAccess = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log("Camera access granted!");
      
      // Store the stream for later use
      setStream(mediaStream);

      // Get list of available cameras after permission is granted
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedDevice(videoDevices[0].deviceId);
      }

      setIsCameraEnabled(true);
      setError(null);

      // Stop the initial stream since Webcam component will handle the video
      mediaStream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error("Camera access denied:", error);
      setError('Camera access was denied. Please enable camera access in your browser settings.');
      setIsCameraEnabled(false);
    }
  };

  // Clean up function to stop all tracks when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const captureImage = () => {
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
  };

  const handleAddFace = async (e) => {
    e.preventDefault();
    try {
      const imageData = await captureImage();
      if (!imageData) {
        setError('Failed to capture image. Please try again.');
        return;
      }
      await addFaceToCollection(imageData, newPersonName);
      setIsAddingFace(false);
      setNewPersonName('');
      setError(null);
    } catch (err) {
      setError('Failed to add face. Please try again.');
    }
  };

  const startRecognition = async () => {
    try {
      const imageData = await captureImage();
      if (!imageData) return;
      
      const match = await searchFace(imageData);
      if (match) {
        setRecognizedPerson({
          name: match.Face.ExternalImageId,
          confidence: match.Similarity
        });
      } else {
        setRecognizedPerson(null);
      }
    } catch (err) {
      console.error('Error searching face:', err);
    }
  };

  useEffect(() => {
    if (isInitialized && !isAddingFace && isCameraEnabled) {
      const interval = setInterval(startRecognition, 1000);
      return () => clearInterval(interval);
    }
  }, [isInitialized, isAddingFace, isCameraEnabled]);

  if (!isInitialized) {
    return <div className="initialization-message">Initializing face recognition system...</div>;
  }

  if (!isCameraEnabled) {
    return (
      <div className="camera-access-container">
        <h2>Camera Access Required</h2>
        <p>This app needs access to your camera to recognize faces.</p>
        <button onClick={requestCameraAccess} className="camera-access-button">
          Enable Camera
        </button>
        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  return (
    <div className="face-recognition-container">
      {devices.length > 1 && !isMobileSafari && (
        <div className="camera-selector">
          <select 
            value={selectedDevice} 
            onChange={(e) => setSelectedDevice(e.target.value)}
          >
            {devices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                Camera {index + 1} {device.label ? `(${device.label})` : ''}
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
            width: isMobileSafari ? { ideal: 640 } : 640,
            height: isMobileSafari ? { ideal: 480 } : 480,
            facingMode: 'user',
            deviceId: !isMobileSafari ? selectedDevice : undefined,
            aspectRatio: 1.333333333,
            playsInline: true
          }}
          playsInline={true}
          forceScreenshotSourceSize={true}
        />
        
        {recognizedPerson && (
          <div className="recognition-overlay">
            <p>{recognizedPerson.name}</p>
            <p>{recognizedPerson.confidence.toFixed(2)}% match</p>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="controls">
        {!isAddingFace ? (
          <button onClick={() => setIsAddingFace(true)}>
            Add New Face
          </button>
        ) : (
          <form onSubmit={handleAddFace} className="add-face-form">
            <input
              type="text"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="Enter person's name"
              required
            />
            <button type="submit">Save Face</button>
            <button type="button" onClick={() => setIsAddingFace(false)}>
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default FaceRecognition; 