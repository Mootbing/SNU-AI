import os
from pathlib import Path

def rename_images():
    # Get the directory containing the images
    image_dir = Path(__file__).parent
    
    # Supported image extensions
    valid_extensions = {'.jpg', '.jpeg', '.png'}
    
    # Process each file in the directory
    for file_path in image_dir.iterdir():
        # Skip if not a valid image file or if it's this script
        if file_path.suffix.lower() not in valid_extensions:
            continue
        
        original_name = file_path.stem  # Get filename without extension
        extension = file_path.suffix    # Get file extension
        
        # Skip renaming if file contains special keywords
        if 'marshall' in original_name.lower() or 'commander' in original_name.lower():
            print(f"Keeping original name for: {original_name}")
            continue
        
        # Split the name and get the last part (lastname)
        name_parts = original_name.split()
        if len(name_parts) > 1:
            # Capitalize the last name
            lastname = name_parts[-1].capitalize()
            new_name = f"Brother_{lastname}{extension}"
            
            # Create the new path
            new_path = file_path.parent / new_name
            
            try:
                # Rename the file
                file_path.rename(new_path)
                print(f"Renamed: {original_name}{extension} -> {new_name}")
            except Exception as e:
                print(f"Error renaming {original_name}: {str(e)}")
        else:
            print(f"Skipping {original_name} - needs at least first and last name")

if __name__ == "__main__":
    rename_images()
