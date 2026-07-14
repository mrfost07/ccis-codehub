# Complete Google Colab Training Guide for AI Proctoring Model
## Optimized for T4 GPU | Production-Ready Training Pipeline

This comprehensive guide provides everything you need to train a high-quality Computer Vision model for detecting cheating behaviors during online exams.

---

## 📋 **Table of Contents**
1. [Prerequisites & Dataset Download](#1-prerequisites--dataset-download)
2. [Google Colab Setup](#2-google-colab-setup)
3. [Dataset Preparation](#3-dataset-preparation)
4. [Model Training](#4-model-training)
5. [Model Evaluation](#5-model-evaluation)
6. [TensorFlow.js Conversion](#6-tensorflowjs-conversion)
7. [Integration Guide](#7-integration-guide)

---

## 1. Prerequisites & Dataset Download

### Step 1.1: Create Kaggle Account
1. Go to [kaggle.com](https://www.kaggle.com/) and create a free account
2. Verify your account via email

### Step 1.2: Download Required Datasets

You need **TWO** datasets:

#### Dataset A: Phone Detection (YOLOv7)
**Name:** Cell-Phone-Object-Detection-Using-Yolov7  
**Author:** AMEER AZAM  
**Link:** https://www.kaggle.com/datasets/ameerazam/cell-phone-object-detection-using-yolov7  
**Size:** ~50 MB  
**Contains:** Annotated cell phone images ready for training

**How to Download:**
1. Go to: https://www.kaggle.com/datasets/ameerazam/cell-phone-object-detection-using-yolov7
2. Click the **Download** button (top-right)
3. Save as `cell-phone-detection-yolov7.zip`

#### Dataset B: Gaze Estimation (Choose ONE option)

**RECOMMENDED: Create Your Own (See Step 1.4)** - This is the BEST option for your thesis!

**Alternative Option 1:** Eye Detection Dataset (Lightweight - Only 19 MB!)
- **Author:** OFFICER KACOON
- **Link:** https://www.kaggle.com/datasets/afaqueaero/eye-detection-dataset
- **Contains:** ~2,000 annotated eye region images
- **Good for:** Eye tracking, cataract detection, and gaze classification
- **Perfect size for Colab training!**

**Alternative Option 2:** NeuroEye Pupil Center Dataset (Very Lightweight ~50 MB)
- **Link:** https://www.kaggle.com/datasets/neuroeye-pupil-center
- **Contains:** 5,400 pupil center images (20x40 pixels)
- **Good for:** Eye tracking and pupil detection

**⚠️ NOTE:** The "Eye Gaze" dataset is 5GB+ which is too large for Colab. Use the lightweight alternatives above OR better yet, create your own custom dataset (Step 1.4).

**How to Download (if using Kaggle):**
1. Go to the dataset link
2. Click **Download**
3. Save as `eye-dataset.zip` (rename for simplicity)

### Step 1.3: Organize Your Downloads

Create a dedicated folder on your Desktop to keep everything organized:

```
Desktop/
└── CCIS_Proctoring_AI/
    ├── datasets/
    │   ├── cell-phone-detection-yolov7.zip
    │   ├── eye-dataset.zip (optional - if using Kaggle dataset)
    │   └── gaze_dataset.zip (RECOMMENDED - your own data)
    └── trained_models/  (we'll use this later)
```

**To create this folder:**
1. Right-click on your Desktop → New → Folder
2. Name it `CCIS_Proctoring_AI`
3. Inside it, create a subfolder called `datasets`
4. Move your downloaded ZIP files into the `datasets` folder

---

### Step 1.4: (OPTIONAL) Collect Your Own Gaze Data

**Run this on your LOCAL computer BEFORE opening Colab:**

1. Create a file called `collect_gaze_data.py`
2. Copy this code:

```python
import cv2
import os
from datetime import datetime

# Create folders
categories = ['looking_center', 'looking_left', 'looking_right', 
              'looking_up', 'looking_down', 'no_face']

for cat in categories:
    os.makedirs(f'gaze_dataset/{cat}', exist_ok=True)

cap = cv2.VideoCapture(0)
current_category = 0
category_names = categories
count = {cat: 0 for cat in categories}

print("📸 Gaze Data Collection Tool")
print("=" * 60)
print("Instructions:")
print("  Press SPACE to capture image")
print("  Press N to switch to next category")
print("  Press Q to quit")
print("\nGoal: Collect 50-100 images per category")
print("=" * 60)

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    # Display current category
    cat = category_names[current_category]
    cv2.putText(frame, f"Category: {cat}", (10, 30), 
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    cv2.putText(frame, f"Count: {count[cat]}/100", (10, 70), 
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    cv2.putText(frame, "SPACE=Capture | N=Next | Q=Quit", (10, 110), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
    
    cv2.imshow('Gaze Collection', frame)
    key = cv2.waitKey(1) & 0xFF
    
    if key == ord(' '):  # Space to capture
        filename = f'gaze_dataset/{cat}/img_{count[cat]:04d}.jpg'
        cv2.imwrite(filename, frame)
        count[cat] += 1
        print(f"✓ Saved {filename}")
    
    elif key == ord('n'):  # Next category
        current_category = (current_category + 1) % len(category_names)
        print(f"\n📂 Switched to: {category_names[current_category]}")
    
    elif key == ord('q'):  # Quit
        break

cap.release()
cv2.destroyAllWindows()

print("\n✅ Collection complete!")
for cat, num in count.items():
    print(f"  {cat}: {num} images")
```

3. Run it: `python collect_gaze_data.py`
4. Follow on-screen instructions
5. Zip the folder: Right-click `gaze_dataset/` → "Compress to ZIP"

**OR skip this if you want to use only phone detection for now!**

---

## 2. Google Colab Setup

### Step 2.1: Open Google Colab
1. Go to [colab.research.google.com](https://colab.research.google.com/)
2. Sign in with your Google account
3. Click **File → New Notebook**

### Step 2.2: Enable T4 GPU (CRITICAL!)
1. Click **Runtime → Change runtime type**
2. Set **Hardware accelerator** to **T4 GPU**
3. Click **Save**
4. Click **Runtime → Run all** (to activate GPU)

### Step 2.3: Verify GPU Access
**Create Cell 1 and run:**
```python
import tensorflow as tf
print(f"TensorFlow Version: {tf.__version__}")
print(f"GPU Available: {tf.config.list_physical_devices('GPU')}")
print(f"GPU Name: {tf.test.gpu_device_name()}")
```

**Expected Output:**
```
TensorFlow Version: 2.x.x
GPU Available: [PhysicalDevice(name='/physical_device:GPU:0', device_type='GPU')]
GPU Name: /device:GPU:0
```

✅ If you see GPU output, you're good to go!

---

## 3. Dataset Preparation

### Step 3.1: Mount Google Drive and Load Datasets
**Create Cell 2:**
```python
from google.colab import drive
import os
import zipfile

# Mount Google Drive
drive.mount('/content/drive')

# Check if datasets are in Drive
drive_dataset_path = '/content/drive/MyDrive/CCIS_Proctoring_AI/datasets/'

if os.path.exists(drive_dataset_path):
    print("✅ Found datasets in Google Drive!")
    print(f"\n📦 Available datasets:")
    for file in os.listdir(drive_dataset_path):
        if file.endswith('.zip'):
            size = os.path.getsize(os.path.join(drive_dataset_path, file)) / (1024*1024)
            print(f"  ✓ {file} ({size:.1f} MB)")
    
    # Copy datasets to Colab workspace for faster processing
    print("\n📋 Copying datasets to Colab workspace...")
    os.makedirs('datasets', exist_ok=True)
    for file in os.listdir(drive_dataset_path):
        if file.endswith('.zip'):
            import shutil
            shutil.copy(os.path.join(drive_dataset_path, file), file)
            print(f"  ✓ Copied {file}")
else:
    print("⚠️ Datasets not found in Drive. You need to upload them first.")
    print(f"Expected path: {drive_dataset_path}")
    print("\nPlease upload your datasets to Google Drive at this location.")
```

**Expected Output:**
```
✅ Found datasets in Google Drive!

📦 Available datasets:
  ✓ gaze_dataset.zip (47.6 MB)
  ✓ eye-dataset.zip (18.1 MB)
  ✓ cell-phone-detection-yolov7.zip (198.3 MB)

📋 Copying datasets to Colab workspace...
  ✓ Copied gaze_dataset.zip
  ✓ Copied eye-dataset.zip
  ✓ Copied cell-phone-detection-yolov7.zip
```

### Step 3.2: Extract Datasets
**Create Cell 3:**
```python
import zipfile
import shutil
from pathlib import Path

# Extract all datasets
print("📦 Extracting datasets...")
for filename in [f for f in os.listdir('.') if f.endswith('.zip')]:
    with zipfile.ZipFile(filename, 'r') as zip_ref:
        extract_path = f'datasets/{filename.replace(".zip", "")}'
        zip_ref.extractall(extract_path)
        print(f"✓ Extracted {filename} to {extract_path}")

# Show extracted structure
print("\n📁 Extracted dataset structure:")
for root, dirs, files in os.walk('datasets'):
    level = root.replace('datasets', '').count(os.sep)
    indent = ' ' * 2 * level
    print(f'{indent}{os.path.basename(root)}/')
    if level < 2:  # Only show first 2 levels
        subindent = ' ' * 2 * (level + 1)
        for file in files[:3]:  # Show first 3 files
            print(f'{subindent}{file}')
        if len(files) > 3:
            print(f'{subindent}... and {len(files)-3} more files')
```

### Step 3.3: Organize Training Data
**Create Cell 4:**
```python
import cv2
import numpy as np
from PIL import Image

# Create organized folder structure for training
categories = ['looking_center', 'looking_left', 'looking_right', 
              'looking_up', 'looking_down', 'phone_detected', 'no_face']

for cat in categories:
    os.makedirs(f'training_data/{cat}', exist_ok=True)

print("📂 Created training folders:")
for cat in categories:
    print(f"   ├── {cat}/")
```

### Step 3.4: Copy Custom Gaze Data (If You Created It)
**Create Cell 5:**
```python
# Copy custom gaze dataset to training folders
gaze_source = 'datasets/gaze_dataset/'

if os.path.exists(gaze_source):
    print("📸 Processing custom gaze dataset...")
    for cat in ['looking_center', 'looking_left', 'looking_right', 
                'looking_up', 'looking_down', 'no_face']:
        source_folder = os.path.join(gaze_source, cat)
        dest_folder = f'training_data/{cat}/'
        
        if os.path.exists(source_folder):
            count = 0
            for img_file in Path(source_folder).glob('*.jpg'):
                shutil.copy(str(img_file), dest_folder)
                count += 1
            print(f"  ✓ {cat}: {count} images")
        else:
            print(f"  ⚠️ {cat}: folder not found, skipping")
else:
    print("⚠️ No custom gaze dataset found. Using only Kaggle datasets.")
```

### Step 3.5: Process Phone Detection Dataset
**Create Cell 6:**
```python
# Find and process phone images
print("\n📱 Processing phone detection dataset...")

# Try to find images in the extracted structure
phone_paths = [
    'datasets/cell-phone-detection-yolov7/',
    'datasets/cell-phone-detection-yolov7/images/',
    'datasets/cell-phone-detection-yolov7/train/',
]

phone_dest = 'training_data/phone_detected/'
count = 0

for base_path in phone_paths:
    if os.path.exists(base_path):
        for img_file in Path(base_path).rglob('*.jpg'):
            try:
                shutil.copy(str(img_file), f"{phone_dest}{img_file.name}")
                count += 1
                if count >= 500:  # Limit to 500 images
                    break
            except Exception as e:
                continue
        if count > 0:
            break

print(f"✓ Processed {count} phone detection images")

# Show image count for all categories
print("\n📊 Current training data distribution:")
for cat in os.listdir('training_data'):
    img_count = len([f for f in os.listdir(f'training_data/{cat}') if f.endswith(('.jpg', '.png'))])
    print(f"  {cat:20s}: {img_count:4d} images")
```

### Step 3.6: Data Augmentation & Preprocessing
**Create Cell 7:**
```python
from tensorflow.keras.preprocessing.image import ImageDataGenerator

# Data augmentation for training (makes model more robust)
train_datagen = ImageDataGenerator(
    rescale=1./255,              # Normalize pixel values
    rotation_range=15,           # Rotate up to 15 degrees
    width_shift_range=0.2,       # Shift horizontally
    height_shift_range=0.2,      # Shift vertically
    shear_range=0.15,            # Shear transformation
    zoom_range=0.15,             # Zoom in/out
    horizontal_flip=True,        # Mirror images
    fill_mode='nearest',         # Fill empty pixels
    validation_split=0.2         # 80% train, 20% validation
)

# Validation data (no augmentation, just rescale)
val_datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2
)

IMG_SIZE = (224, 224)
BATCH_SIZE = 32

# Create data generators
train_generator = train_datagen.flow_from_directory(
    'training_data/',
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='training',
    shuffle=True
)

val_generator = val_datagen.flow_from_directory(
    'training_data/',
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation',
    shuffle=False
)

# Display class mapping
print("📊 Class Labels:")
for label, idx in train_generator.class_indices.items():
    print(f"   {idx}: {label}")

print(f"\n📈 Training samples: {train_generator.samples}")
print(f"📈 Validation samples: {val_generator.samples}")
print(f"📈 Number of classes: {len(train_generator.class_indices)}")
```

---

## 4. Model Training

### Step 4.1: Build Optimized Model
**Create Cell 8:**
```python
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import (
    Dense, GlobalAveragePooling2D, Dropout, 
    BatchNormalization, Activation
)
from tensorflow.keras.models import Model
from tensorflow.keras import regularizers

# Load pre-trained MobileNetV2 (optimized for mobile/web)
base_model = MobileNetV2(
    weights='imagenet',
    include_top=False,
    input_shape=(224, 224, 3)
)

# Freeze base model initially
base_model.trainable = False

# Build custom top layers
x = base_model.output
x = GlobalAveragePooling2D()(x)
x = BatchNormalization()(x)
x = Dropout(0.3)(x)
x = Dense(256, kernel_regularizer=regularizers.l2(0.001))(x)
x = BatchNormalization()(x)
x = Activation('relu')(x)
x = Dropout(0.4)(x)
x = Dense(128, kernel_regularizer=regularizers.l2(0.001))(x)
x = BatchNormalization()(x)
x = Activation('relu')(x)
predictions = Dense(len(train_generator.class_indices), activation='softmax')(x)

# Create final model
model = Model(inputs=base_model.input, outputs=predictions)

print("✅ Model architecture created!")
model.summary()
```

### Step 4.1: Phase 1 - Optimized Transfer Learning
**Create Cell 9:**
```python
import tensorflow as tf
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, LearningRateScheduler
import datetime
import math

print("🚀 OPTIMIZED Phase 1: Advanced Transfer Learning")
print("=" * 60)

# Calculate class weights for balanced training
from sklearn.utils.class_weight import compute_class_weight
import numpy as np

class_weights_array = compute_class_weight(
    class_weight='balanced',
    classes=np.unique(train_generator.classes),
    y=train_generator.classes
)
class_weights = dict(enumerate(class_weights_array))
print(f"📊 Class weights computed: {class_weights}")

# Cosine Annealing Learning Rate Schedule
def cosine_annealing(epoch, initial_lr=0.001, epochs=20):
    """Cosine annealing for smooth LR decay"""
    return initial_lr * 0.5 * (1 + math.cos(math.pi * epoch / epochs))

# TensorBoard log directory
log_dir = "logs/fit/" + datetime.datetime.now().strftime("%Y%m%d-%H%M%S")

# Advanced callbacks
callbacks = [
    # Save best model to Google Drive
    ModelCheckpoint(
        '/content/drive/MyDrive/CCIS_Proctoring_AI/trained_models/best_proctoring_model_v3.h5',
        monitor='val_accuracy',
        save_best_only=True,
        mode='max',
        verbose=1
    ),
    
    # Cosine annealing scheduler
    LearningRateScheduler(
        lambda epoch: cosine_annealing(epoch, initial_lr=0.001, epochs=20), 
        verbose=1
    ),
    
    # Early stopping with extended patience
    EarlyStopping(
        monitor='val_loss',
        patience=8,
        restore_best_weights=True,
        verbose=1
    ),
    
    # TensorBoard logging
    tf.keras.callbacks.TensorBoard(log_dir=log_dir, histogram_freq=1)
]

# Compile with gradient clipping
model.compile(
    optimizer=Adam(learning_rate=0.001, clipnorm=1.0),  # Gradient clipping
    loss='categorical_crossentropy',
    metrics=['accuracy', 'Precision', 'Recall']
)

print("\n📚 Training with:")
print("  • Cosine annealing learning rate")
print("  • Class weight balancing")
print("  • Gradient clipping (clipnorm=1.0)")
print("  • Extended patience (8 epochs)")
print("  • Target: 89-92% validation accuracy")
print("=" * 60)
print("⏱️ Estimated time: 12-15 minutes")
print("=" * 60)

# Train Phase 1
history_phase1 = model.fit(
    train_generator,
    epochs=20,
    validation_data=val_generator,
    callbacks=callbacks,
    class_weight=class_weights,  # Apply class weights
    verbose=1
)

print("\n✅ Phase 1 complete!")
best_acc = max(history_phase1.history['val_accuracy'])
print(f"🎯 Best Validation Accuracy: {best_acc*100:.2f}%")

### Step 4.2: Phase 2 - Optimized Fine-Tuning
**Create Cell 10:**
```python
print("\n🚀 OPTIMIZED Phase 2: Advanced Fine-Tuning")
print("=" * 60)

# Load best Phase 1 model
best_model_path = '/content/drive/MyDrive/CCIS_Proctoring_AI/trained_models/best_proctoring_model_v3.h5'
model = tf.keras.models.load_model(best_model_path)
print(f"✅ Loaded best Phase 1 model")

# Gradual unfreezing: Only last 20 layers (prevents overfitting)
base_model = model.layers[0]
base_model.trainable = True

trainable_layers = 20
for layer in base_model.layers[:-trainable_layers]:
    layer.trainable = False

print(f"📊 Unfroze last {trainable_layers} layers")
print(f"📊 Trainable params: {sum([tf.size(v).numpy() for v in model.trainable_variables]):,}")

# Cosine annealing for Phase 2 with ultra-low LR
def cosine_annealing_phase2(epoch, initial_lr=0.00005, epochs=15):
    """Gentle learning rate for fine-tuning"""
    return initial_lr * 0.5 * (1 + math.cos(math.pi * epoch / epochs))

# Phase 2 callbacks
callbacks_phase2 = [
    ModelCheckpoint(
        '/content/drive/MyDrive/CCIS_Proctoring_AI/trained_models/best_proctoring_model_v3.h5',
        monitor='val_accuracy',
        save_best_only=True,
        mode='max',
        verbose=1
    ),
    
    LearningRateScheduler(
        lambda epoch: cosine_annealing_phase2(epoch, initial_lr=0.00005, epochs=15), 
        verbose=1
    ),
    
    EarlyStopping(
        monitor='val_loss',
        patience=7,
        restore_best_weights=True,
        verbose=1
    )
]

# Recompile with ultra-low LR and strong gradient clipping
model.compile(
    optimizer=Adam(learning_rate=0.00005, clipnorm=0.5),  # Stronger clipping
    loss='categorical_crossentropy',
    metrics=['accuracy', 'Precision', 'Recall']
)

print("\n📚 Training with:")
print("  • Ultra-low learning rate (0.00005)")
print("  • Gradual unfreezing (20 layers only)")
print("  • Strong gradient clipping (0.5)")
print("  • High patience (7 epochs)")
print("  • Target: 90-92% validation accuracy")
print("=" * 60)
print("⏱️ Estimated time: 8-10 minutes")
print("=" * 60)

# Continue training
history_phase2 = model.fit(
    train_generator,
    epochs=15,
    validation_data=val_generator,
    callbacks=callbacks_phase2,
    class_weight=class_weights,
    verbose=1
)

print("\n✅ Phase 2 complete!")
final_acc = max(history_phase2.history['val_accuracy'])
print(f"🎯 Final Validation Accuracy: {final_acc*100:.2f}%")
print("💾 Best model saved as 'best_proctoring_model_v3.h5'")
```

---

## 5. Model Evaluation

### Step 5.1: Performance Metrics
**Create Cell 12:**
```python
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

# Load best model from Google Drive (where it was saved)
model_path = '/content/drive/MyDrive/CCIS_Proctoring_AI/trained_models/best_proctoring_model_v3.h5'
best_model = tf.keras.models.load_model(model_path)

print(f"✅ Loaded best model from: {model_path}")

# Get predictions
val_generator.reset()
predictions = best_model.predict(val_generator, verbose=1)
y_pred = np.argmax(predictions, axis=1)
y_true = val_generator.classes

# Classification Report
class_names = list(train_generator.class_indices.keys())
print("\n📊 Classification Report:")
print("=" * 60)
print(classification_report(y_true, y_pred, target_names=class_names))

# Confusion Matrix
cm = confusion_matrix(y_true, y_pred)
plt.figure(figsize=(10, 8))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
            xticklabels=class_names, yticklabels=class_names)
plt.title('Confusion Matrix - CCIS Proctoring AI')
plt.ylabel('True Label')
plt.xlabel('Predicted Label')
plt.tight_layout()
plt.show()
```

### Step 5.2: Training History Visualization
**Create Cell 13:**
```python
# Combine both training phases
combined_history = {
    'accuracy': history_phase1.history['accuracy'] + history_phase2.history['accuracy'],
    'val_accuracy': history_phase1.history['val_accuracy'] + history_phase2.history['val_accuracy'],
    'loss': history_phase1.history['loss'] + history_phase2.history['loss'],
    'val_loss': history_phase1.history['val_loss'] + history_phase2.history['val_loss']
}

# Plot
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))

# Accuracy
ax1.plot(combined_history['accuracy'], label='Training', linewidth=2)
ax1.plot(combined_history['val_accuracy'], label='Validation', linewidth=2)
ax1.axvline(x=14, color='red', linestyle='--', label='Phase 2 Start', alpha=0.5)
ax1.set_title('Model Accuracy Over Time', fontsize=14, fontweight='bold')
ax1.set_xlabel('Epoch')
ax1.set_ylabel('Accuracy')
ax1.legend()
ax1.grid(True, alpha=0.3)

# Loss
ax2.plot(combined_history['loss'], label='Training', linewidth=2)
ax2.plot(combined_history['val_loss'], label='Validation', linewidth=2)
ax2.axvline(x=14, color='red', linestyle='--', label='Phase 2 Start', alpha=0.5)
ax2.set_title('Model Loss Over Time', fontsize=14, fontweight='bold')
ax2.set_xlabel('Epoch')
ax2.set_ylabel('Loss')
ax2.legend()
ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.show()

# Print final metrics
final_acc = max(combined_history['val_accuracy'])
final_epoch = combined_history['val_accuracy'].index(final_acc) + 1
print(f"\n🎯 Best Validation Accuracy: {final_acc*100:.2f}% (Epoch {final_epoch})")
print(f"📈 Final Training Accuracy: {combined_history['accuracy'][-1]*100:.2f}%")
print(f"📉 Final Validation Loss: {combined_history['val_loss'][-1]:.4f}")
```

---

## 6. TensorFlow.js Conversion

### Step 6.1: Install Converter
**Create Cell 14:**
```python
!pip install tensorflowjs --quiet
print("✅ TensorFlow.js converter installed")
```

### Step 6.2: Convert Model to TensorFlow.js
**Create Cell 15:**
```python
# Use the v3 model saved in Google Drive
model_h5_path = '/content/drive/MyDrive/CCIS_Proctoring_AI/trained_models/best_proctoring_model_v3.h5'
output_dir = 'tfjs_model'

print(f"Converting model from: {model_h5_path}")
print(f"Output directory: {output_dir}")

!tensorflowjs_converter \
    --input_format=keras \
    --quantization_bytes 2 \
    {model_h5_path} \
    {output_dir}

print("\n✅ Conversion complete!")
print("📁 Output files:")
!ls -lh tfjs_model/
```

> **Note:** Warnings about dependencies are normal and can be ignored. The conversion still succeeds!

### Step 6.3: Create Metadata File
**Create Cell 16:**
```python
import json

# Save class labels and model info
metadata = {
    "model_name": "CCIS-CodeHub Proctoring AI",
    "version": "1.0",
    "input_shape": [224, 224, 3],
    "classes": train_generator.class_indices,
    "accuracy": float(final_acc),
    "total_parameters": "2.6M",
    "model_size": "10MB",
    "description": "Real-time cheating behavior detection for online exams"
}

with open('tfjs_model/metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)

print("✅ Metadata saved!")
print(json.dumps(metadata, indent=2))
```

### Step 6.4: Save to Google Drive & Download
**Create Cell 17:**
```python
 
```

---

## 7. Integration Guide

### Step 7.1: Extract Files to Your Project
1. Unzip `ccis_proctoring_model.zip`
2. Copy all files to: `frontend/public/models/proctoring/`

Your structure should look like:
```
frontend/public/models/proctoring/
├── model.json
├── group1-shard1of1.bin
└── metadata.json
```

### Step 7.2: Frontend Service Code
Create `frontend/src/services/proctoringService.ts`:

```typescript
import * as tf from '@tensorflow/tfjs';

interface PredictionResult {
  label: string;
  confidence: number;
  isViolation: boolean;
}

class ProctoringService {
  private model: tf.LayersModel | null = null;
  private metadata: any = null;
  private isLoaded = false;

  async loadModel(): Promise<void> {
    if (this.isLoaded) return;

    try {
      // Load model
      this.model = await tf.loadLayersModel('/models/proctoring/model.json');
      
      // Load metadata
      const response = await fetch('/models/proctoring/metadata.json');
      this.metadata = await response.json();
      
      // Warmup
      const dummy = tf.zeros([1, 224, 224, 3]);
      this.model.predict(dummy);
      dummy.dispose();
      
      this.isLoaded = true;
      console.log('✅ Proctoring AI loaded successfully');
      console.log('Model accuracy:', this.metadata.accuracy);
    } catch (error) {
      console.error('Failed to load proctoring model:', error);
      throw error;
    }
  }

  async detectViolation(videoElement: HTMLVideoElement): Promise<PredictionResult> {
    if (!this.model || !this.metadata) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    // Preprocess frame
    const tensor = tf.tidy(() => {
      const frame = tf.browser.fromPixels(videoElement);
      const resized = tf.image.resizeBilinear(frame, [224, 224]);
      const normalized = resized.div(255.0);
      return normalized.expandDims(0);
    });

    // Predict
    const predictions = this.model.predict(tensor) as tf.Tensor;
    const probabilities = await predictions.data();
    
    // Cleanup
    tensor.dispose();
    predictions.dispose();

    // Get result
    const maxIndex = probabilities.indexOf(Math.max(...Array.from(probabilities)));
    const labels = Object.keys(this.metadata.classes);
    const label = labels[maxIndex];
    const confidence = probabilities[maxIndex];

    // Determine if violation
    const violations = ['looking_left', 'looking_right', 'looking_up', 
                       'looking_down', 'no_face', 'phone_detected'];
    const isViolation = violations.includes(label) && confidence > 0.75;

    return { label, confidence, isViolation };
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      this.isLoaded = false;
    }
  }
}

export const proctoringService = new ProctoringService();
```

---

## 📊 Expected Performance Metrics

**With Balanced Dataset (500 images × 6 classes + 500 phone = 3,500 images):**

| Metric | Target | Typical Result |
|--------|--------|----------------|
| **Validation Accuracy** | > 85% | 87-92% |
| **Precision** | > 85% | 86-90% |
| **Recall** | > 85% | 85-90% |
| **Inference Time** | < 100ms | 50-80ms |
| **Model Size** | < 10 MB | 4-6 MB (quantized) |

**Per-Class Recall (Expected):**
- looking_center: 75-85%
- looking_left: 70-80%
- looking_right: 70-80%
- looking_up: 80-90%
- looking_down: 75-85%
- no_face: 95-100%
- phone_detected: 95-100%

---

## 🎓 Tips for Better Results

1. **Collect More Data**: Add 50-100 images per class for best results
2. **Balance Classes**: Ensure similar number of images per category
3. **Clean Data**: Remove blurry, mislabeled, or low-quality images
4. **Longer Training**: Increase epochs to 30-40 if validation accuracy keeps improving
5. **Test in Real Conditions**: Capture images in lighting similar to actual exam conditions

---

## 🐛 Troubleshooting

### Issue: "Out of Memory" Error
**Solution:** Reduce batch size to 16 or 8:
```python
BATCH_SIZE = 16  # or 8
```

### Issue: Low Accuracy (< 80%)
**Solutions:**
- Check if images are properly labeled
- Increase training epochs
- Collect more diverse training data
- Ensure GPU is enabled

### Issue: Model Download Fails
**Solution:** Use Google Drive:
```python
from google.colab import drive
drive.mount('/content/drive')
!cp -r tfjs_model/ /content/drive/MyDrive/
```

---

## ✅ Checklist

- [ ] Downloaded both datasets from Kaggle
- [ ] Enabled T4 GPU in Colab
- [ ] Ran all code cells in order
- [ ] Achieved > 90% validation accuracy
- [ ] Downloaded TensorFlow.js model files
- [ ] Integrated into frontend project
- [ ] Tested with real webcam

---

**🎉 Congratulations!** You now have a production-ready AI proctoring model!
