# AI Model Development Guide

## CCIS-CodeHub Dual-Model AI Architecture

This guide provides a complete roadmap for developing and fine-tuning the two custom AI models used in CCIS-CodeHub:

| Model | Type | Purpose |
|-------|------|---------|
| **Proctoring Model** | Computer Vision (CNN) | Detect cheating behaviors via webcam |
| **Mentor Model** | Large Language Model (LLM) | Provide Socratic coding assistance |

---

# Part 1: Webcam Proctoring Model (Computer Vision)

## 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     STUDENT'S BROWSER                           │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │   Webcam    │───▶│  TensorFlow.js   │───▶│  Violation    │  │
│  │   Stream    │    │  Custom Model    │    │  Detector     │  │
│  └─────────────┘    └──────────────────┘    └───────┬───────┘  │
│                                                      │          │
│                              WebSocket ◀─────────────┘          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     CCIS-CODEHUB BACKEND                         │
│  ┌─────────────────┐    ┌─────────────────┐                      │
│  │  Quiz Session   │───▶│  Violation Log  │                      │
│  │  WebSocket      │    │  & Flagging     │                      │
│  └─────────────────┘    └─────────────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

**Key Point:** Video NEVER leaves the student's device. Only violation events are sent to the server.

---

## 1.2 Detection Targets

Your custom model will be trained to detect:

| Target | Description | Labels |
|--------|-------------|--------|
| **Face Presence** | Is a face visible? | `face_present`, `no_face` |
| **Gaze Direction** | Where are the eyes looking? | `center`, `left`, `right`, `up`, `down` |
| **Head Pose** | Is the head turned away? | `forward`, `turned_left`, `turned_right` |
| **Device Detection** | Are unauthorized devices visible? | `phone`, `tablet`, `none` |

---

## 1.3 Dataset Requirements

### Option A: Public Datasets (Recommended to Start)

| Dataset | Use Case | Link |
|---------|----------|------|
| **MPIIGaze** | Gaze estimation | [mpii-gaze](https://www.mpi-inf.mpg.de/departments/computer-vision-and-machine-learning/research/gaze-based-human-computer-interaction/appearance-based-gaze-estimation-in-the-wild) |
| **GazeCapture** | Gaze direction | [gazecapture.csail.mit.edu](https://gazecapture.csail.mit.edu/) |
| **COCO Dataset** | Object detection (phones) | [cocodataset.org](https://cocodataset.org/) |
| **Wider Face** | Face detection | [wider-face](http://shuoyang1213.me/WIDERFACE/) |

### Option B: Custom Dataset (For Your Thesis)

Collect your own data by recording students (with consent) during mock exams:

```python
# Example: Capture frames for dataset
import cv2

cap = cv2.VideoCapture(0)
frame_count = 0
label = "looking_left"  # Change per session

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    cv2.imshow('Capture', frame)
    key = cv2.waitKey(1)
    
    if key == ord('s'):  # Press 's' to save
        cv2.imwrite(f'dataset/{label}/frame_{frame_count}.jpg', frame)
        frame_count += 1
        print(f"Saved frame {frame_count}")
    
    if key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
```

**Folder Structure:**
```
dataset/
├── looking_center/
│   ├── frame_001.jpg
│   └── ...
├── looking_left/
├── looking_right/
├── looking_up/
├── looking_down/
├── no_face/
├── phone_detected/
└── no_device/
```

---

## 1.4 Model Training (Python)

### Step 1: Install Dependencies

```bash
pip install tensorflow keras opencv-python matplotlib scikit-learn
```

### Step 2: Create the Model

```python
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.preprocessing.image import ImageDataGenerator

# Data Augmentation
datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=15,
    width_shift_range=0.1,
    height_shift_range=0.1,
    horizontal_flip=True,
    validation_split=0.2
)

BATCH_SIZE = 32
IMG_SIZE = (224, 224)

train_generator = datagen.flow_from_directory(
    'dataset/',
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='training'
)

val_generator = datagen.flow_from_directory(
    'dataset/',
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation'
)

# Build Model (Fine-tune MobileNetV2)
base_model = tf.keras.applications.MobileNetV2(
    input_shape=(224, 224, 3),
    include_top=False,
    weights='imagenet'
)
base_model.trainable = False  # Freeze base layers

model = models.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.Dropout(0.3),
    layers.Dense(128, activation='relu'),
    layers.Dense(train_generator.num_classes, activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# Train
history = model.fit(
    train_generator,
    epochs=20,
    validation_data=val_generator
)

# Save
model.save('proctoring_model.h5')
print("Model saved!")
```

### Step 3: Convert to TensorFlow.js

```bash
pip install tensorflowjs

# Convert the model
tensorflowjs_converter --input_format=keras \
    proctoring_model.h5 \
    ./tfjs_model/
```

This creates:
```
tfjs_model/
├── model.json
└── group1-shard1of1.bin
```

---

## 1.5 Browser Integration (TensorFlow.js)

### Load and Use the Model

```typescript
// frontend/src/services/proctoringService.ts

import * as tf from '@tensorflow/tfjs';

class ProctoringService {
  private model: tf.LayersModel | null = null;
  private labels = ['center', 'down', 'left', 'no_face', 'phone', 'right', 'up'];

  async loadModel(): Promise<void> {
    this.model = await tf.loadLayersModel('/models/proctoring/model.json');
    console.log('Proctoring model loaded');
  }

  async detectViolation(videoElement: HTMLVideoElement): Promise<{
    label: string;
    confidence: number;
    isViolation: boolean;
  }> {
    if (!this.model) throw new Error('Model not loaded');

    // Capture frame from video
    const tensor = tf.browser.fromPixels(videoElement)
      .resizeNearestNeighbor([224, 224])
      .toFloat()
      .div(255.0)
      .expandDims(0);

    // Predict
    const predictions = this.model.predict(tensor) as tf.Tensor;
    const data = await predictions.data();
    
    // Get highest confidence label
    const maxIndex = data.indexOf(Math.max(...Array.from(data)));
    const label = this.labels[maxIndex];
    const confidence = data[maxIndex];

    // Clean up tensors
    tensor.dispose();
    predictions.dispose();

    // Determine if violation
    const violations = ['left', 'right', 'up', 'down', 'no_face', 'phone'];
    const isViolation = violations.includes(label) && confidence > 0.7;

    return { label, confidence, isViolation };
  }
}

export const proctoringService = new ProctoringService();
```

### Real-Time Detection Loop

```typescript
// In your LiveQuiz component

const startProctoring = async (video: HTMLVideoElement) => {
  await proctoringService.loadModel();

  const detectLoop = async () => {
    const result = await proctoringService.detectViolation(video);
    
    if (result.isViolation) {
      // Send to backend via WebSocket
      socket.send(JSON.stringify({
        type: 'violation',
        label: result.label,
        confidence: result.confidence,
        timestamp: Date.now()
      }));
    }

    // Run detection every 500ms
    setTimeout(detectLoop, 500);
  };

  detectLoop();
};
```

---

# Part 2: AI Mentor Model (LLM Fine-Tuning)

## 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI MENTOR ARCHITECTURE                       │
│                                                                  │
│  ┌──────────────┐    ┌───────────────────┐    ┌──────────────┐  │
│  │   Student    │───▶│   Query Router    │───▶│   Response   │  │
│  │   Question   │    │                   │    │   Generator  │  │
│  └──────────────┘    └─────────┬─────────┘    └──────────────┘  │
│                                │                                 │
│                    ┌───────────┴───────────┐                     │
│                    ▼                       ▼                     │
│          ┌─────────────────┐     ┌─────────────────┐            │
│          │  Gemini/GPT API │     │  Custom Fine-   │            │
│          │  (General Code) │     │  Tuned Model    │            │
│          └─────────────────┘     │  (Curriculum)   │            │
│                                  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2.2 Fine-Tuning Dataset Format

Create a JSONL file with Socratic Q&A pairs:

```jsonl
{"messages": [{"role": "user", "content": "Write a function to reverse a string in Python"}, {"role": "assistant", "content": "Good question! Before I give you the code, let me guide you through the logic.\n\n1. What data type is a string in Python? (Hint: it's a sequence)\n2. How do we access elements in a sequence from the end?\n3. What does slicing with a negative step do?\n\nTry thinking about these questions first. If you're stuck, I can explain each step!"}]}
{"messages": [{"role": "user", "content": "What is recursion?"}, {"role": "assistant", "content": "Great question! Recursion is when a function calls itself to solve a problem.\n\nThink of it like this: Imagine you're standing in a line and want to know your position. You could ask the person in front of you: 'What's your position?' They ask the person in front of them, and so on, until someone at the front says 'I'm first!'\n\nCan you think of a simple problem that could be solved this way? Hint: What about calculating 5! (factorial)?"}]}
{"messages": [{"role": "user", "content": "Give me the answer to my homework"}, {"role": "assistant", "content": "I'm here to help you learn, not to do your homework for you! 📚\n\nHowever, I can definitely help you understand the concepts. Can you share the specific problem you're working on? I'll guide you through the thinking process step by step so you can solve it yourself and truly understand it."}]}
```

---

## 2.3 Fine-Tuning Options

### Option A: OpenAI Fine-Tuning

```bash
# Install OpenAI CLI
pip install openai

# Upload training file
openai api files.create -f training_data.jsonl -p fine-tune

# Create fine-tuning job
openai api fine_tuning.jobs.create -t file-abc123 -m gpt-3.5-turbo
```

### Option B: Local Fine-Tuning (Recommended for Thesis)

Use **Hugging Face + LoRA** for efficient fine-tuning:

```bash
pip install transformers datasets peft accelerate bitsandbytes
```

```python
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from peft import LoraConfig, get_peft_model
from datasets import load_dataset

# Load base model (e.g., Mistral-7B or LLaMA-3)
model_name = "mistralai/Mistral-7B-Instruct-v0.2"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    load_in_4bit=True,  # Quantization for lower memory
    device_map="auto"
)

# LoRA Configuration
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

model = get_peft_model(model, lora_config)

# Load your dataset
dataset = load_dataset("json", data_files="training_data.jsonl")

# Training
training_args = TrainingArguments(
    output_dir="./ccis_mentor_model",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    save_steps=100,
    logging_steps=10,
)

from transformers import Trainer

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"],
)

trainer.train()
model.save_pretrained("./ccis_mentor_model")
```

---

## 2.4 Integrating with CCIS-CodeHub Backend

Update `backend/apps/ai_mentor/services/`:

```python
# ai_mentor/services/mentor_service.py

from transformers import AutoModelForCausalLM, AutoTokenizer
import google.generativeai as genai

class MentorService:
    def __init__(self):
        # Load custom fine-tuned model
        self.custom_model = AutoModelForCausalLM.from_pretrained("./ccis_mentor_model")
        self.tokenizer = AutoTokenizer.from_pretrained("./ccis_mentor_model")
        
        # Configure Gemini API for fallback
        genai.configure(api_key="YOUR_GEMINI_API_KEY")
        self.gemini_model = genai.GenerativeModel('gemini-pro')

    def route_query(self, query: str) -> str:
        """Route to appropriate model based on query type"""
        curriculum_keywords = ['homework', 'assignment', 'quiz', 'exam', 'module']
        
        if any(kw in query.lower() for kw in curriculum_keywords):
            return self._use_custom_model(query)
        else:
            return self._use_gemini(query)

    def _use_custom_model(self, query: str) -> str:
        inputs = self.tokenizer(query, return_tensors="pt")
        outputs = self.custom_model.generate(**inputs, max_length=500)
        return self.tokenizer.decode(outputs[0], skip_special_tokens=True)

    def _use_gemini(self, query: str) -> str:
        response = self.gemini_model.generate_content(query)
        return response.text
```

---

# Part 3: Evaluation Metrics

## Proctoring Model

| Metric | Target | Description |
|--------|--------|-------------|
| **Accuracy** | > 90% | Overall correct classifications |
| **Precision** | > 85% | Minimize false positives |
| **Recall** | > 95% | Catch all actual violations |
| **Latency** | < 100ms | Real-time detection |

## Mentor Model

| Metric | Target | Description |
|--------|--------|-------------|
| **Socratic Score** | > 80% | % of responses that ask guiding questions |
| **Answer Avoidance** | > 90% | % of homework requests redirected |
| **User Satisfaction** | > 4.0/5 | Post-chat rating from students |

---

# Part 4: File Structure

```
CCIS-CodeHub/
├── ai_models/
│   ├── proctoring/
│   │   ├── dataset/
│   │   ├── training/
│   │   │   └── train_proctoring.py
│   │   └── tfjs_model/
│   │       ├── model.json
│   │       └── group1-shard1of1.bin
│   └── mentor/
│       ├── training_data.jsonl
│       ├── train_mentor.py
│       └── ccis_mentor_model/
├── frontend/
│   └── src/
│       └── services/
│           └── proctoringService.ts
└── backend/
    └── apps/
        └── ai_mentor/
            └── services/
                └── mentor_service.py
```

---

# Summary

| Component | Technology | Status |
|-----------|------------|--------|
| Proctoring Model | MobileNetV2 + TensorFlow.js | To Be Developed |
| Mentor Model | Mistral/LLaMA + LoRA Fine-Tuning | To Be Developed |
| Integration | WebSockets + REST API | Existing |

**Next Steps:**
1. Collect/download datasets
2. Train proctoring model
3. Create mentor training data
4. Fine-tune mentor model
5. Integrate both into CCIS-CodeHub
