# 🚀 Lightning AI Training Guide - CCIS Mentor 3.5

> **Target:** Train 900K samples in 6-10 hours on A100 GPU

---

## Prerequisites

- [Lightning AI](https://lightning.ai/) account with GPU access (A100 preferred)
- HuggingFace account and token
- Dataset file: `ccis_mentor3_complete_1gb.jsonl` (~1GB)

---

## Cell-by-Cell Guide

### Cell 1: Install Dependencies

```python
# Install optimized packages for A100
!pip install torch==2.2.0 --index-url https://download.pytorch.org/whl/cu121
!pip install transformers==4.44.0 datasets accelerate peft trl bitsandbytes
!pip install flash-attn --no-build-isolation
!pip install huggingface_hub
```

---

### Cell 2: Imports and Configuration

```python
import os
os.environ["CUDA_VISIBLE_DEVICES"] = "0"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import torch
import gc
from transformers import (
    AutoModelForCausalLM, 
    AutoTokenizer, 
    BitsAndBytesConfig,
    TrainingArguments,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer
from datasets import load_dataset
from huggingface_hub import login

# === CONFIGURATION ===
MODEL_NAME = "mrfost/ccis-mentor3"
DATASET_PATH = "/teamspace/studios/this_studio/ccis_mentor3_complete_1gb.jsonl"
OUTPUT_DIR = "./ccis-mentor3.5-finetuned"
HUB_MODEL_ID = "mrfost/ccis-mentor3.5"

# Hyperparameters
MAX_SEQ_LENGTH = 2048
LORA_R = 128
LORA_ALPHA = 256
LEARNING_RATE = 5e-4
NUM_EPOCHS = 2
BATCH_SIZE = 8
GRAD_ACCUM = 4
WARMUP_RATIO = 0.03

print("✅ Configuration loaded")
print(f"   Effective batch size: {BATCH_SIZE * GRAD_ACCUM}")
```

---

### Cell 3: Login to HuggingFace

```python
# ⚠️ REPLACE WITH YOUR ACTUAL TOKEN
login(token="hf_YOUR_TOKEN_HERE")
print("✅ Logged into HuggingFace")
```

---

### Cell 4: Load Model with Optimizations

```python
print("📦 Loading model...")

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    quantization_config=bnb_config,
    device_map={"": 0},
    trust_remote_code=True,
    attn_implementation="flash_attention_2",
    torch_dtype=torch.bfloat16,
)

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

print("✅ Model loaded with Flash Attention 2 + bf16")
```

---

### Cell 5: Apply LoRA

```python
print("⚡ Applying LoRA...")

model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True)

lora_config = LoraConfig(
    r=LORA_R,
    lora_alpha=LORA_ALPHA,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
print("✅ LoRA applied (r=128, α=256)")
```

---

### Cell 6: Load and Format Dataset

```python
print("📂 Loading dataset...")

dataset = load_dataset("json", data_files=DATASET_PATH, split="train")

def format_sample(example):
    instruction = example.get("instruction", "")
    input_text = example.get("input", "")
    output_text = example.get("output", "")
    
    if input_text:
        example["text"] = f"### Instruction:\n{instruction}\n\n### Input:\n{input_text}\n\n### Response:\n{output_text}"
    else:
        example["text"] = f"### Instruction:\n{instruction}\n\n### Response:\n{output_text}"
    return example

dataset = dataset.map(format_sample, num_proc=8)
dataset = dataset.train_test_split(test_size=0.002, seed=42)

train_dataset = dataset["train"]
eval_dataset = dataset["test"]

print(f"✅ Train: {len(train_dataset):,} | Eval: {len(eval_dataset):,}")
```

---

### Cell 7: Configure Training

```python
print("⚙️ Configuring training...")

total_steps = (len(train_dataset) * NUM_EPOCHS) // (BATCH_SIZE * GRAD_ACCUM)
warmup_steps = int(total_steps * WARMUP_RATIO)

print(f"   Total steps: {total_steps:,}")
print(f"   Est. time: {total_steps / 2.5 / 3600:.1f} hours @ 2.5 steps/sec")

training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=NUM_EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    per_device_eval_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=GRAD_ACCUM,
    learning_rate=LEARNING_RATE,
    lr_scheduler_type="cosine",
    warmup_steps=warmup_steps,
    optim="paged_adamw_8bit",
    weight_decay=0.01,
    max_grad_norm=0.5,
    bf16=True,
    fp16=False,
    gradient_checkpointing=True,
    gradient_checkpointing_kwargs={"use_reentrant": False},
    logging_steps=25,
    eval_strategy="steps",
    eval_steps=1000,
    save_strategy="steps",
    save_steps=2000,
    save_total_limit=3,
    load_best_model_at_end=True,
    dataloader_num_workers=4,
    dataloader_pin_memory=True,
    seed=42,
    report_to="none",
)

trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    processing_class=tokenizer,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LENGTH,
    packing=False,
)

print("✅ Trainer ready!")
```

---

### Cell 8: Train!

```python
print("🚀 STARTING TRAINING")
print(f"   Dataset: {len(train_dataset):,} × {NUM_EPOCHS} epochs")
print(f"   LoRA: r={LORA_R}, α={LORA_ALPHA}")
print(f"   LR: {LEARNING_RATE}")

gc.collect()
torch.cuda.empty_cache()

training_result = trainer.train()

print(f"✅ Done! Loss: {training_result.training_loss:.4f}")
```

---

### Cell 9: Save and Push to Hub

```python
print("💾 Saving model...")

model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

model.push_to_hub(HUB_MODEL_ID, tokenizer=tokenizer)
print(f"✅ Pushed to {HUB_MODEL_ID}")
```

---

### Cell 10: Convert to GGUF Q8_0

```python
print("📦 Converting to GGUF...")

from peft import PeftModel
import subprocess

# Merge LoRA
base_model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float16,
    device_map="auto",
)
merged = PeftModel.from_pretrained(base_model, OUTPUT_DIR).merge_and_unload()

MERGED_DIR = "./ccis-mentor3.5-merged"
merged.save_pretrained(MERGED_DIR)
tokenizer.save_pretrained(MERGED_DIR)

# Convert to GGUF
subprocess.run(["git", "clone", "https://github.com/ggerganov/llama.cpp"], check=True)
subprocess.run(["pip", "install", "-r", "llama.cpp/requirements.txt"], check=True)

import os
GGUF_DIR = "./ccis-mentor3.5-gguf"
os.makedirs(GGUF_DIR, exist_ok=True)

subprocess.run([
    "python", "llama.cpp/convert_hf_to_gguf.py",
    MERGED_DIR,
    "--outfile", f"{GGUF_DIR}/ccis-mentor3.5-q8_0.gguf",
    "--outtype", "q8_0"
], check=True)

# Upload GGUF
from huggingface_hub import HfApi
HfApi().upload_file(
    path_or_fileobj=f"{GGUF_DIR}/ccis-mentor3.5-q8_0.gguf",
    path_in_repo="ccis-mentor3.5-q8_0.gguf",
    repo_id=HUB_MODEL_ID,
)
print("✅ GGUF uploaded!")
```

---

### Cell 11: Test Model

```python
print("🧪 Testing...")

model.eval()
prompt = "### Instruction:\nWhat is CCIS-CodeHub?\n\n### Response:\n"

inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
with torch.no_grad():
    out = model.generate(**inputs, max_new_tokens=256, temperature=0.7, do_sample=True)

print(tokenizer.decode(out[0], skip_special_tokens=True).split("### Response:")[-1])
print("\n🎉 COMPLETE!")
```

---

## Expected Results

| Metric | Value |
|--------|-------|
| **Training Time** | 6-10 hours (A100) |
| **Final Loss** | 0.4 - 0.7 |
| **GGUF Size** | ~3.5GB |
| **Quality** | Near-lossless Q8_0 |

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| OOM | Reduce `BATCH_SIZE` to 4 |
| Flash Attention fail | Remove `attn_implementation` param |
| CUDA errors | Restart runtime, run cells in order |
| Slow training | Check GPU type (need A100/A10) |
