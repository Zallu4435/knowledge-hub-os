import asyncio
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

load_dotenv("../../.env")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY

async def main():
    print(f"API KEY loaded: {bool(GEMINI_API_KEY)}")
    llm = ChatGoogleGenerativeAI(
        model="gemini-pro", 
        temperature=0.7
    )
    roadmap_prompt = PromptTemplate.from_template("Say hello to the {role} in one sentence.")
    chain = roadmap_prompt | llm
    
    print("Testing Gemini Connection...")
    try:
        res = await chain.ainvoke({"role": "developer"})
        print("✅ SUCCESS!")
        print(res.content)
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(main())
