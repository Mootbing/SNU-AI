import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { initializeCollection, addFaceToCollection, searchFace } from '../api/rekognitionApi';
import './FaceRecognition.css';

const FaceRecognition = () => {
  const webcamRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [recognizedPerson, setRecognizedPerson] = useState(null);
  const [isAddingFace, setIsAddingFace] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      const success = await initializeCollection();
      setIsInitialized(success);
    };
    initialize();
  }, []);

  const captureImage = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    return fetch(imageSrc)
      .then(res => res.arrayBuffer())
      .then(buffer => new Uint8Array(buffer));
  };

  const handleAddFace = async (e) => {
    e.preventDefault();
    try {
      const imageData = await captureImage();
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
      setError('Failed to recognize face. Please try again.');
    }
  };

  useEffect(() => {
    if (isInitialized && !isAddingFace) {
      const interval = setInterval(startRecognition, 1000);
      return () => clearInterval(interval);
    }
  }, [isInitialized, isAddingFace]);

  if (!isInitialized) {
    return <div>Initializing...</div>;
  }

  return (
    <div className="face-recognition-container">
      <div className="webcam-container">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 640,
            height: 480,
            facingMode: 'user'
          }}
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