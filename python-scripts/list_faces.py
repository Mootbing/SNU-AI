import boto3
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from parent directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

def list_faces(collection_id='faces_collection', region=os.getenv('REACT_APP_AWS_REGION')):
    # Get credentials from .env
    aws_access_key = os.getenv('REACT_APP_AWS_ACCESS_KEY_ID')
    aws_secret_key = os.getenv('REACT_APP_AWS_SECRET_ACCESS_KEY')
    
    if not aws_access_key or not aws_secret_key:
        raise ValueError("AWS credentials not found in .env file")
    
    rekognition = boto3.client(
        'rekognition',
        region_name=region,
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key
    )
    
    try:
        # Get list of faces in collection
        response = rekognition.list_faces(CollectionId=collection_id)
        faces = response['Faces']
        
        if not faces:
            print(f"No faces found in collection '{collection_id}'")
            return
        
        print(f"\nFound {len(faces)} faces in collection '{collection_id}':")
        print("-" * 50)
        
        for face in faces:
            print(f"Name: {face.get('ExternalImageId', 'Unknown')}")
            print(f"Face ID: {face['FaceId']}")
            print(f"Confidence: {face['Confidence']:.2f}%")
            print("-" * 50)
            
    except Exception as e:
        print(f"Error listing faces: {str(e)}")

if __name__ == "__main__":
    list_faces() 