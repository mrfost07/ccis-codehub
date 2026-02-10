# CCIS Proctoring AI - Self-Learning in Colab

## CELL 1: Setup Everything
```python
import tensorflow as tf
from tensorflow import keras
import numpy as np
import cv2
import os
import base64
from google.colab import drive, files
from google.colab.output import eval_js
from google.colab.patches import cv2_imshow
from IPython.display import display, HTML, Image, Javascript, clear_output
from PIL import Image as PILImage
import io
import time

# Mount Drive
drive.mount('/content/drive')

# Load model
model = keras.models.load_model(
    '/content/drive/MyDrive/CCIS_Proctoring_AI/trained_models/best_model_advanced_v4.h5',
    compile=False
)

CLASS_LABELS = ['looking_center', 'looking_down', 'looking_left', 
                'looking_right', 'looking_up', 'no_face', 'phone_detected']

# Create correction folders
for label in CLASS_LABELS:
    os.makedirs(f'/content/corrections/{label}', exist_ok=True)
    
print("✅ Model loaded and ready!")
```

---

## CELL 2: Webcam Capture Function (Colab's Method)
```python
from IPython.display import display, Javascript
from google.colab.output import eval_js
from base64 import b64decode

def take_photo(quality=0.8):
    """Capture a single photo from webcam"""
    js = Javascript('''
        async function takePhoto(quality) {
            const div = document.createElement('div');
            const capture = document.createElement('button');
            capture.textContent = '📸 Capture';
            div.appendChild(capture);

            const video = document.createElement('video');
            video.style.display = 'block';
            const stream = await navigator.mediaDevices.getUserMedia({video: true});

            document.body.appendChild(div);
            div.appendChild(video);
            video.srcObject = stream;
            await video.play();

            // Resize the output to fit the video element.
            google.colab.output.setIframeHeight(document.documentElement.scrollHeight, true);

            // Wait for Capture to be clicked.
            await new Promise((resolve) => capture.onclick = resolve);

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            stream.getVideoTracks()[0].stop();
            div.remove();
            return canvas.toDataURL('image/jpeg', quality);
        }
        ''')
    display(js)
    data = eval_js('takePhoto({})'.format(quality))
    binary = b64decode(data.split(',')[1])
    return binary

print("✅ Webcam function ready!")
print("Run Cell 3 to start capturing and correcting!")
```

---

## CELL 3: Capture, Predict & Correct Loop
```python
corrections_count = {label: 0 for label in CLASS_LABELS}
frame_count = 0
session_corrections = []

print("=" * 60)
print("🎥 SELF-LEARNING MODE")
print("=" * 60)
print("\n📋 Instructions:")
print("   1. Click 'Capture' button to take photo")
print("   2. See prediction → Enter correct number if WRONG")
print("   3. Repeat until you have 10-20+ corrections")
print("   4. Run Cell 4 to retrain!")
print("\n   0=center, 1=down, 2=left, 3=right, 4=up, 5=no_face, 6=phone")
print("   Enter 's' to skip, 'q' to quit")
print("=" * 60)

while True:
    try:
        # Capture photo
        img_binary = take_photo()
        
        # Convert to array
        pil_img = PILImage.open(io.BytesIO(img_binary))
        img_resized = pil_img.resize((224, 224))
        img_array = np.array(img_resized) / 255.0
        img_batch = np.expand_dims(img_array, axis=0)
        
        # Predict
        pred = model.predict(img_batch, verbose=0)[0]
        pred_idx = np.argmax(pred)
        pred_label = CLASS_LABELS[pred_idx]
        confidence = pred[pred_idx] * 100
        
        print(f"\n🤖 Prediction: {pred_label} ({confidence:.1f}%)")
        print(f"📊 Corrections so far: {sum(corrections_count.values())}")
        
        # Get user input
        user_input = input("\nCorrect label (0-6), 's' to skip, 'q' to quit: ").strip().lower()
        
        if user_input == 'q':
            break
        elif user_input == 's' or user_input == '':
            print("⏭️ Skipped")
            continue
        elif user_input.isdigit() and int(user_input) < 7:
            correct_label = CLASS_LABELS[int(user_input)]
            # Save correction
            path = f'/content/corrections/{correct_label}/frame_{frame_count}.jpg'
            pil_img.save(path)
            corrections_count[correct_label] += 1
            frame_count += 1
            print(f"💾 Saved to {correct_label}/ (total: {corrections_count[correct_label]})")
        else:
            print("❓ Invalid input, skipping...")
            
        clear_output(wait=True)
        
    except Exception as e:
        print(f"Error: {e}")
        break

print("\n" + "=" * 60)
print("✅ Session ended!")
print(f"📊 Total corrections: {sum(corrections_count.values())}")
for label, count in corrections_count.items():
    if count > 0:
        print(f"   {label}: {count}")
print("\n👉 If you have 10+ corrections, run Cell 4 to retrain!")
```

---

## CELL 4: Retrain with Corrections
```python
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.optimizers import Adam
import shutil, zipfile

total_corrections = sum([len(os.listdir(f'/content/corrections/{l}')) for l in CLASS_LABELS])
print(f"📊 Total corrections: {total_corrections}")

if total_corrections < 5:
    print("⚠️ Need at least 5 corrections. Go back to Cell 3!")
else:
    # Extract original dataset
    print("📥 Extracting original training data...")
    with zipfile.ZipFile('/content/drive/MyDrive/CCIS_Proctoring_AI/datasets/gaze_dataset.zip', 'r') as z:
        z.extractall('/content/')
    
    # Add corrections to training data
    print("➕ Adding corrections to training data...")
    for label in CLASS_LABELS:
        src_folder = f'/content/corrections/{label}'
        dst_folder = f'/content/gaze_dataset/{label}'
        os.makedirs(dst_folder, exist_ok=True)
        for img in os.listdir(src_folder):
            shutil.copy(f'{src_folder}/{img}', f'{dst_folder}/correction_{img}')
    
    # Quick fine-tune
    print("🔄 Starting fine-tuning...")
    datagen = ImageDataGenerator(rescale=1./255, validation_split=0.2)
    
    train_gen = datagen.flow_from_directory(
        '/content/gaze_dataset/', target_size=(224, 224), batch_size=32, subset='training'
    )
    val_gen = datagen.flow_from_directory(
        '/content/gaze_dataset/', target_size=(224, 224), batch_size=32, subset='validation'
    )
    
    # Unfreeze last layers
    for layer in model.layers[-20:]:
        layer.trainable = True
    
    model.compile(optimizer=Adam(1e-5), loss='categorical_crossentropy', metrics=['accuracy'])
    model.fit(train_gen, validation_data=val_gen, epochs=3)
    
    # Save
    model.save('/content/drive/MyDrive/CCIS_Proctoring_AI/trained_models/best_model_v4_selflearned.h5')
    print("✅ Saved as v4_selflearned.h5!")
```
