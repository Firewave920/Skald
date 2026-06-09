from rembg import remove
from PIL import Image
import io

input_path = "src-tauri/icons/icon_source.png"
output_path = "src-tauri/icons/icon_source_transparent.png"

with open(input_path, "rb") as f:
    input_data = f.read()

output_data = remove(input_data)

with open(output_path, "wb") as f:
    f.write(output_data)

print(f"Saved transparent icon to {output_path}")
