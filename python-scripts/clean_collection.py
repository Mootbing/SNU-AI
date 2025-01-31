import boto3
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from parent directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

def delete_all_faces(collection_id='faces_collection', region=os.getenv('REACT_APP_AWS_REGION')):
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
        face_ids = [face['FaceId'] for face in response['Faces']]
        
        # Delete faces in batches of 1000 (AWS limit)
        while face_ids:
            batch = face_ids[:1000]
            face_ids = face_ids[1000:]
            
            if batch:
                rekognition.delete_faces(
                    CollectionId=collection_id,
                    FaceIds=batch
                )
        
        print(f"Successfully deleted all faces from collection {collection_id}")
        
    except Exception as e:
        print(f"Error cleaning collection: {str(e)}")

if __name__ == "__main__":
    # You can change the region here if needed
    delete_all_faces() 