"""List available Gemini models"""
import google.generativeai as genai
import os

# Use the API key from .env
api_key = "AIzaSyB1wfcf7vpfaZ-J_4Ea5s_tA6NCaBYWW_k"

print("Configuring Gemini...")
genai.configure(api_key=api_key)

print("\nListing available Gemini models:\n")
print("=" * 80)

for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(f"Model Name: {model.name}")
        print(f"Display Name: {model.display_name}")
        print(f"Description: {model.description[:100]}...")
        print(f"Supported Methods: {', '.join(model.supported_generation_methods)}")
        print("-" * 80)

print("\nDone!")
