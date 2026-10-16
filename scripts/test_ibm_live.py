import asyncio
import os
import sys
from pathlib import Path

# Add backend to path so we can import app modules
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

# Force reload settings from backend/.env
os.environ["PARIKSHIT_ENV"] = "development"

from app.core.config import settings
from app.agents.llm_gateway import LLMGateway

async def main():
    print("=" * 60)
    print("  PARIKSHIT — IBM watsonx.ai Real-Time Connection Test")
    print("=" * 60)

    print(f"[*] Provider            : {settings.LLM_PROVIDER}")
    print(f"[*] Watsonx URL         : {settings.WATSONX_URL}")
    print(f"[*] Default Model       : {settings.WATSONX_DEFAULT_MODEL}")
    
    if not settings.WATSONX_API_KEY:
        print("\n[!] ERROR: WATSONX_API_KEY is not set in backend/.env")
        print("    Please open backend/.env and paste your IBM Cloud IAM API Key.")
        sys.exit(1)

    if not settings.WATSONX_PROJECT_ID:
        print("\n[!] ERROR: WATSONX_PROJECT_ID is not set in backend/.env")
        print("    Please open backend/.env and paste your Watsonx Project ID.")
        sys.exit(1)

    print(f"[*] API Key Present     : {'*' * 8}{settings.WATSONX_API_KEY[-4:] if len(settings.WATSONX_API_KEY) > 4 else '****'}")
    print(f"[*] Project ID          : {settings.WATSONX_PROJECT_ID}")
    print("\n[1/2] Authenticating with IBM Cloud IAM OAuth2...")

    try:
        token = await LLMGateway._get_iam_token()
        print(f"      -> SUCCESS! IAM Token acquired (valid for ~60 mins).")
    except Exception as e:
        print(f"\n[!] IAM AUTHENTICATION FAILED: {e}")
        sys.exit(1)

    print("\n[2/2] Sending prompt to IBM watsonx.ai (Model: ibm/granite-3-8b-instruct)...")
    prompt_messages = [
        {"role": "system", "content": "You are Parikshit, an expert AI software engineering teammate."},
        {"role": "user", "content": "Explain what Parikshit is in two concise sentences."}
    ]

    try:
        res = await LLMGateway.generate_chat(prompt_messages, role="mentor")
        print(f"      -> SUCCESS! Response received in mode '{res.get('mode')}'!")
        print("-" * 60)
        print(res.get("content", "").strip())
        print("-" * 60)
        print(f"[*] Telemetry: Input Tokens={res.get('input_tokens')}, Output Tokens={res.get('output_tokens')}")
        print("\n[✓] IBM watsonx.ai is fully operational and ready for live real-time demo!")
    except Exception as e:
        print(f"\n[!] MODEL GENERATION FAILED: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
