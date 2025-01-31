import AWS from 'aws-sdk';

// Configure AWS
const credentials = new AWS.Credentials({
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
});

AWS.config.update({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: credentials
});

console.log('Environment Variables:', {
  region: process.env.REACT_APP_AWS_REGION,
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
  secretKeyExists: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY ? 'Yes' : 'No'
});

console.log('Credentials:', {
  accessKeyId: credentials.accessKeyId,
  secretKeyExists: credentials.secretAccessKey ? 'Yes' : 'No'
});

// Remove the Cognito configuration since we're using direct credentials
const rekognition = new AWS.Rekognition();
const COLLECTION_ID = 'faces_collection';

export const initializeCollection = async () => {
  try {
    await rekognition.createCollection({ CollectionId: COLLECTION_ID }).promise();
    return true;
  } catch (error) {
    if (error.code === 'ResourceAlreadyExistsException') {
      return true;
    }
    console.error('Error creating collection:', error);
    return false;
  }
};

export const addFaceToCollection = async (imageData, personName) => {
  try {
    const params = {
      CollectionId: COLLECTION_ID,
      Image: {
        Bytes: imageData
      },
      ExternalImageId: personName,
      MaxFaces: 1,
      DetectionAttributes: ['ALL']
    };

    const response = await rekognition.indexFaces(params).promise();
    return response.FaceRecords[0].Face;
  } catch (error) {
    console.error('Error adding face:', error);
    throw error;
  }
};

export const searchFace = async (imageData) => {
  try {
    const params = {
      CollectionId: COLLECTION_ID,
      Image: {
        Bytes: imageData
      },
      MaxFaces: 1,
      FaceMatchThreshold: 85
    };

    const response = await rekognition.searchFacesByImage(params).promise();
    return response.FaceMatches[0];
  } catch (error) {
    if (error.code === 'InvalidParameterException') {
      return null;
    }
    console.error('Error searching face:', error);
    throw error;
  }
}; 