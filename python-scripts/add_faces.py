import boto3
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from parent directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

def add_faces_to_collection(collection_id='faces_collection', region=os.getenv('REACT_APP_AWS_REGION')):
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
    
    # First, ensure the collection exists
    try:
        rekognition.create_collection(CollectionId=collection_id)
        print(f"Created new collection: {collection_id}")
    except rekognition.exceptions.ResourceAlreadyExistsException:
        print(f"Collection {collection_id} already exists")
    except Exception as e:
        print(f"Error creating collection: {str(e)}")
        return
    
    # Get the images directory
    images_dir = Path(__file__).parent / 'images'
    
    if not images_dir.exists():
        print(f"Error: {images_dir} directory does not exist")
        return
    
    # Supported image extensions
    valid_extensions = {'.jpg', '.jpeg', '.png'}
    
    # Process each image in the directory
    for image_path in images_dir.iterdir():
        # Skip if not a valid image file
        if image_path.suffix.lower() not in valid_extensions:
            continue
            
        # Get person name from filename (without extension)
        person_name = image_path.stem.replace(' ', '_')
        
        try:
            with open(image_path, 'rb') as image:
                image_bytes = image.read()
                
            # Index the face
            response = rekognition.index_faces(
                CollectionId=collection_id,
                Image={'Bytes': image_bytes},
                ExternalImageId=person_name,
                MaxFaces=1,
                QualityFilter="AUTO",
                DetectionAttributes=['ALL']
            )
            
            if len(response['FaceRecords']) > 0:
                print(f"Successfully added face for {person_name}")
            else:
                print(f"No face detected in image for {person_name}")
                
        except Exception as e:
            print(f"Error processing {person_name}: {str(e)}")

if __name__ == "__main__":
    add_faces_to_collection()