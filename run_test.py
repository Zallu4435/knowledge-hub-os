import asyncio
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from dotenv import load_dotenv
import os

load_dotenv(".env")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY or ""
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash", 
    temperature=0.7
)
roadmap_prompt = PromptTemplate.from_template("Hello {role}")
chain = roadmap_prompt | llm

async def main():
    print("Testing Gemini Connection...")
    try:
        res = await chain.ainvoke({"role": "developer"})
        print("✅ SUCCESS!")
        print(res.content)
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(main())
