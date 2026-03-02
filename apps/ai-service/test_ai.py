import asyncio
import os
import time
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

load_dotenv("/home/zallu/Desktop/knowledge-hub-os/.env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY

# ── Models to test (free-tier friendly) ──────────────────────────────────────
MODELS_TO_TEST = [
    "models/gemini-2.5-flash",
    "models/gemini-2.0-flash",
    "models/gemini-flash-latest",
]

PROMPT = PromptTemplate.from_template(
    "You are a career coach. Generate a 1-sentence career tip for a {role}."
)

async def test_model(model_name: str):
    print(f"\n{'─'*55}")
    print(f"🧪  {model_name}")
    try:
        # max_retries=0 → fail immediately on quota/404, no hanging
        llm = ChatGoogleGenerativeAI(
            model=model_name, 
            temperature=0.7, 
            max_retries=0,
            google_api_key=GEMINI_API_KEY,
            transport="rest"
        )
        chain = PROMPT | llm
        start = time.time()
        res = await chain.ainvoke({"role": "Senior DevOps Engineer"})
        elapsed = time.time() - start
        print(f"✅ SUCCESS  ({elapsed:.2f}s)")
        print(f"   ↳ {res.content[:150]}")
        return True
    except Exception as e:
        short_err = str(e).split("\n")[0][:120]
        print(f"❌ FAILED   {short_err}")
        return False

async def main():
    print("=" * 55)
    print("   GEMINI MODEL AVAILABILITY TEST")
    print(f"   API Key loaded: {bool(GEMINI_API_KEY)}")
    print("=" * 55)

    working, failed = [], []

    for model in MODELS_TO_TEST:
        ok = await test_model(model)
        (working if ok else failed).append(model)

    print(f"\n{'='*55}")
    print(f"✅ WORKING MODELS ({len(working)}):")
    for m in working:
        print(f"   ➜  {m}")
    if failed:
        print(f"\n❌ FAILED / QUOTA EXCEEDED ({len(failed)}):")
        for m in failed:
            print(f"   ✗  {m}")
    if working:
        print(f"\n🏆 BEST MODEL FOR YOUR PROJECT:  {working[0]}")
    print("=" * 55)

if __name__ == "__main__":
    asyncio.run(main())
