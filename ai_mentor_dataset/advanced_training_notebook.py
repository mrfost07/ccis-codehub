# =============================================================================
# 🚀 CCIS-MENTOR3.5 ULTRA-OPTIMIZED TRAINING (PRE-TOKENIZED)
# =============================================================================
# Target: 900K samples in ~10 hours on Kaggle T4
# Key: Pre-tokenize dataset BEFORE training for 10-20x speedup
# Author: Mark Renier B. Fostanes
# =============================================================================

# =============================================================================
# CELL 1: INSTALL UNSLOTH
# =============================================================================
"""
%%capture
import os, importlib.util
!pip install --upgrade -qqq uv
if importlib.util.find_spec("torch") is None or "COLAB_" in "".join(os.environ.keys()):    
    try: import numpy, PIL; _numpy = f"numpy=={numpy.__version__}"; _pil = f"pillow=={PIL.__version__}"
    except: _numpy = "numpy"; _pil = "pillow"
    !uv pip install -qqq \
        "torch>=2.8.0" "triton>=3.4.0" {_numpy} {_pil} torchvision bitsandbytes "transformers==4.56.2" \
        "unsloth_zoo[base] @ git+https://github.com/unslothai/unsloth-zoo" \
        "unsloth[base] @ git+https://github.com/unslothai/unsloth" \
        git+https://github.com/triton-lang/triton.git@0add68262ab0a2e33b84524346cb27cbb2787356#subdirectory=python/triton_kernels
elif importlib.util.find_spec("unsloth") is None:
    !uv pip install -qqq unsloth
!uv pip install --upgrade --no-deps transformers==4.56.2 tokenizers trl==0.22.2 unsloth unsloth_zoo
"""

# =============================================================================
# CELL 2: IMPORTS (RUN AFTER RESTART)
# =============================================================================
import os
os.environ["CUDA_VISIBLE_DEVICES"] = "0"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from unsloth import FastLanguageModel
import torch

# === CONFIGURATION ===
MODEL_NAME = "mrfost/ccis-mentor3"
DATASET_PATH = "/kaggle/input/ai-mentor-dataset-1gb/ccis_mentor3_complete_1gb.jsonl"
OUTPUT_DIR = "/kaggle/working/ccis-mentor3.5-finetuned"
HUB_MODEL_ID = "mrfost/ccis-mentor3.5"

MAX_SEQ_LENGTH = 2048
LORA_R = 128
LORA_ALPHA = 256
LEARNING_RATE = 5e-4
NUM_EPOCHS = 2
BATCH_SIZE = 4
GRAD_ACCUM = 8

print("✅ Config loaded")
print(f"   GPU: {torch.cuda.get_device_name(0)}")

# =============================================================================
# CELL 3: LOGIN
# =============================================================================
from huggingface_hub import login
login(token="hf_YOUR_TOKEN_HERE")  # ⚠️ REPLACE!
print("✅ Logged in")

# =============================================================================
# CELL 4: LOAD MODEL
# =============================================================================
print("📦 Loading model...")

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=None,
    load_in_4bit=True,
)

print("✅ Model loaded")

# =============================================================================
# CELL 5: APPLY LORA
# =============================================================================
print("⚡ Applying LoRA...")

model = FastLanguageModel.get_peft_model(
    model,
    r=LORA_R,
    lora_alpha=LORA_ALPHA,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_dropout=0.05,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=42,
)

print("✅ LoRA applied")

# =============================================================================
# CELL 6: LOAD AND PRE-TOKENIZE DATASET (KEY FOR SPEED!)
# =============================================================================
from datasets import load_dataset

print("📂 Loading dataset...")
dataset = load_dataset("json", data_files=DATASET_PATH, split="train")
print(f"   Loaded {len(dataset):,} samples")

# Format function - processes in batches for speed
def format_prompts(examples):
    texts = []
    for i in range(len(examples["instruction"])):
        instruction = examples["instruction"][i] or ""
        input_text = examples["input"][i] if examples.get("input") and examples["input"][i] else ""
        output_text = examples["output"][i] or ""
        
        if input_text:
            text = f"### Instruction:\n{instruction}\n\n### Input:\n{input_text}\n\n### Response:\n{output_text}"
        else:
            text = f"### Instruction:\n{instruction}\n\n### Response:\n{output_text}"
        texts.append(text)
    
    return {"text": texts}

print("   Formatting (this takes ~5 min for 1GB)...")
dataset = dataset.map(
    format_prompts, 
    batched=True, 
    batch_size=5000,
    num_proc=4,
    remove_columns=dataset.column_names,
    desc="Formatting"
)

# Pre-tokenize for MAXIMUM speed
print("   Pre-tokenizing (this takes ~10 min)...")
def tokenize_function(examples):
    return tokenizer(
        examples["text"],
        truncation=True,
        max_length=MAX_SEQ_LENGTH,
        padding=False,
    )

dataset = dataset.map(
    tokenize_function,
    batched=True,
    batch_size=1000,
    num_proc=4,
    remove_columns=["text"],
    desc="Tokenizing"
)

# Split
dataset = dataset.train_test_split(test_size=0.002, seed=42)
train_dataset = dataset["train"]
eval_dataset = dataset["test"]

print(f"✅ Ready! Train: {len(train_dataset):,} | Eval: {len(eval_dataset):,}")

# =============================================================================
# CELL 7: CONFIGURE TRAINER (NO ON-THE-FLY TOKENIZATION!)
# =============================================================================
from trl import SFTTrainer
from transformers import TrainingArguments, DataCollatorForSeq2Seq

print("⚙️ Configuring trainer...")

total_steps = (len(train_dataset) * NUM_EPOCHS) // (BATCH_SIZE * GRAD_ACCUM)
warmup_steps = int(total_steps * 0.03)

# With pre-tokenized data: ~1.5-2.0 it/s on T4
est_hours = total_steps / 1.75 / 3600

print(f"   Total steps: {total_steps:,}")
print(f"   Est. time: {est_hours:.1f} hours (pre-tokenized)")

# Data collator for pre-tokenized data
data_collator = DataCollatorForSeq2Seq(
    tokenizer=tokenizer,
    padding=True,
    return_tensors="pt",
)

training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=NUM_EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    per_device_eval_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=GRAD_ACCUM,
    learning_rate=LEARNING_RATE,
    lr_scheduler_type="cosine",
    warmup_steps=warmup_steps,
    optim="adamw_8bit",
    weight_decay=0.01,
    max_grad_norm=0.5,
    fp16=not torch.cuda.is_bf16_supported(),
    bf16=torch.cuda.is_bf16_supported(),
    logging_steps=50,
    eval_strategy="steps",
    eval_steps=2000,
    save_strategy="steps",
    save_steps=2000,
    save_total_limit=2,
    load_best_model_at_end=True,
    dataloader_num_workers=4,
    dataloader_pin_memory=True,
    dataloader_prefetch_factor=2,
    seed=42,
    report_to="none",
    remove_unused_columns=False,  # Important for pre-tokenized!
)

# Use base Trainer since data is pre-tokenized
from transformers import Trainer

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    data_collator=data_collator,
)

print("✅ Trainer ready!")

# =============================================================================
# CELL 8: TRAIN!
# =============================================================================
import gc

print("\n" + "=" * 70)
print("🚀 STARTING PRE-TOKENIZED TRAINING")
print("=" * 70)
print(f"   📊 Dataset: {len(train_dataset):,} × {NUM_EPOCHS} epochs")
print(f"   ⚡ LoRA: r={LORA_R}, α={LORA_ALPHA}")
print(f"   📈 Learning Rate: {LEARNING_RATE}")
print(f"   🎯 Est. Time: ~{est_hours:.1f} hours")
print(f"   ⚡ Pre-tokenized = 10-20x faster!")
print("=" * 70)

gc.collect()
torch.cuda.empty_cache()

training_result = trainer.train()

print("\n" + "=" * 70)
print("✅ TRAINING COMPLETE!")
print("=" * 70)
print(f"   Final Loss: {training_result.training_loss:.4f}")
print(f"   Total Steps: {training_result.global_step:,}")

# =============================================================================
# CELL 9: SAVE AND PUSH
# =============================================================================
print("\n💾 Saving model...")

model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"✅ Saved to {OUTPUT_DIR}")

model.push_to_hub(HUB_MODEL_ID, tokenizer=tokenizer)
print(f"✅ Pushed to {HUB_MODEL_ID}")

# =============================================================================
# CELL 10: CONVERT TO GGUF Q8_0
# =============================================================================
print("\n📦 Converting to GGUF Q8_0...")

import glob

model.save_pretrained_gguf(
    "/kaggle/working/ccis-mentor3.5-gguf",
    tokenizer,
    quantization_method="q8_0",
)

gguf_files = glob.glob("/kaggle/working/ccis-mentor3.5-gguf/*.gguf")
if gguf_files:
    from huggingface_hub import HfApi
    HfApi().upload_file(
        path_or_fileobj=gguf_files[0],
        path_in_repo="ccis-mentor3.5-q8_0.gguf",
        repo_id=HUB_MODEL_ID,
    )
    print("✅ GGUF uploaded!")

# =============================================================================
# CELL 11: TEST
# =============================================================================
print("\n🧪 Testing...")

FastLanguageModel.for_inference(model)

inputs = tokenizer("### Instruction:\nWhat is CCIS-CodeHub?\n\n### Response:\n", return_tensors="pt").to("cuda")
outputs = model.generate(**inputs, max_new_tokens=256, temperature=0.7, do_sample=True)
print(tokenizer.decode(outputs[0], skip_special_tokens=True).split("### Response:")[-1])

print("\n🎉 COMPLETE!")
