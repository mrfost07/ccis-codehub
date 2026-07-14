# 🦥 Kaggle + Unsloth Pre-Tokenized Guide - CCIS Mentor 3.5

> **Target:** 900K samples in ~10 hours on Kaggle T4  
> **Key:** Pre-tokenize dataset BEFORE training = 10-20x faster

---

## ⚠️ CRITICAL: Run Order

1. Run **Cell 1** → **RESTART RUNTIME**
2. Run **Cells 2-11** in order

---

## Cell 1: Install Unsloth

```python
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
```

**→ RESTART RUNTIME**

---

## Cell 2: Imports

```python
import os
os.environ["CUDA_VISIBLE_DEVICES"] = "0"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from unsloth import FastLanguageModel
import torch

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

print(f"✅ GPU: {torch.cuda.get_device_name(0)}")
```

---

## Cell 3: Login

```python
from huggingface_hub import login
login(token="hf_YOUR_TOKEN_HERE")  # ⚠️ Replace!
```

---

## Cell 4: Load Model

```python
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=None,
    load_in_4bit=True,
)
print("✅ Model loaded")
```

---

## Cell 5: Apply LoRA

```python
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
```

---

## Cell 6: Load & PRE-TOKENIZE Dataset (KEY!)

```python
from datasets import load_dataset

print("📂 Loading dataset...")
dataset = load_dataset("json", data_files=DATASET_PATH, split="train")
print(f"   Loaded {len(dataset):,} samples")

# Format in batches
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

print("   Formatting (~5 min)...")
dataset = dataset.map(format_prompts, batched=True, batch_size=5000, num_proc=4, remove_columns=dataset.column_names)

# PRE-TOKENIZE for speed!
print("   Tokenizing (~10 min)...")
def tokenize_fn(examples):
    return tokenizer(examples["text"], truncation=True, max_length=MAX_SEQ_LENGTH, padding=False)

dataset = dataset.map(tokenize_fn, batched=True, batch_size=1000, num_proc=4, remove_columns=["text"])

dataset = dataset.train_test_split(test_size=0.002, seed=42)
train_dataset, eval_dataset = dataset["train"], dataset["test"]
print(f"✅ Train: {len(train_dataset):,}")
```

---

## Cell 7: Configure Trainer

```python
from transformers import TrainingArguments, Trainer, DataCollatorForSeq2Seq

total_steps = (len(train_dataset) * NUM_EPOCHS) // (BATCH_SIZE * GRAD_ACCUM)
print(f"   Steps: {total_steps:,} | Est: {total_steps / 1.75 / 3600:.1f}h")

data_collator = DataCollatorForSeq2Seq(tokenizer=tokenizer, padding=True, return_tensors="pt")

trainer = Trainer(
    model=model,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    data_collator=data_collator,
    args=TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=NUM_EPOCHS,
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRAD_ACCUM,
        learning_rate=LEARNING_RATE,
        lr_scheduler_type="cosine",
        warmup_steps=int(total_steps * 0.03),
        optim="adamw_8bit",
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=50,
        save_steps=2000,
        dataloader_num_workers=4,
        dataloader_pin_memory=True,
        seed=42,
        report_to="none",
        remove_unused_columns=False,
    ),
)
print("✅ Ready")
```

---

## Cell 8: Train

```python
import gc
gc.collect()
torch.cuda.empty_cache()

print(f"🚀 Training {len(train_dataset):,} × {NUM_EPOCHS} epochs (pre-tokenized!)")
result = trainer.train()
print(f"✅ Done! Loss: {result.training_loss:.4f}")
```

---

## Cell 9: Save & Push

```python
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
model.push_to_hub(HUB_MODEL_ID, tokenizer=tokenizer)
print(f"✅ Pushed to {HUB_MODEL_ID}")
```

---

## Cell 10: GGUF

```python
import glob
from huggingface_hub import HfApi

model.save_pretrained_gguf("/kaggle/working/ccis-mentor3.5-gguf", tokenizer, quantization_method="q8_0")
gguf = glob.glob("/kaggle/working/ccis-mentor3.5-gguf/*.gguf")[0]
HfApi().upload_file(path_or_fileobj=gguf, path_in_repo="ccis-mentor3.5-q8_0.gguf", repo_id=HUB_MODEL_ID)
print("✅ GGUF uploaded")
```

---

## Cell 11: Test

```python
FastLanguageModel.for_inference(model)
inputs = tokenizer("### Instruction:\nWhat is CCIS-CodeHub?\n\n### Response:\n", return_tensors="pt").to("cuda")
print(tokenizer.decode(model.generate(**inputs, max_new_tokens=256, temperature=0.7)[0], skip_special_tokens=True))
print("🎉 DONE!")
```

---

## Expected Performance

| Phase | Time |
|-------|------|
| Formatting | ~5 min |
| Tokenizing | ~10 min |
| **Training** | **~9-10 hours** |
| GGUF | ~15 min |

**Speed:** 1.5-2.0 it/s (vs 0.08 without pre-tokenization)
