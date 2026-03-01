import os
import uvicorn
import asyncio
import json
from fastapi import FastAPI
from aiokafka import AIOKafkaConsumer
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Import our Bazel-generated schema
from libs.event_schemas.user_created_event import UserCreatedEvent 

# Import LangChain & Gemini
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

# Load workspace credentials from root .env
load_dotenv("../../.env")
MONGO_URI = os.getenv("MONGO_URI")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY

client = AsyncIOMotorClient(MONGO_URI)
db = client.knowledge_hub
insights_collection = db.user_insights

app = FastAPI(title="Knowledge Hub OS - AI Brain")

async def consume_kafka():
    # 🧠 Initialize the Gemini AI Model inside the async loop to prevent gRPC asyncio errors
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash-8b", 
        temperature=0.7
    )
    
    # Define the Prompt Template
    roadmap_prompt = PromptTemplate.from_template(
        "You are an expert career architect for Knowledge Hub OS. "
        "A new user has just joined the platform with the role of: {role}. "
        "Generate a highly specific, 3-step technical roadmap for their first 30 days. "
        "Keep the response to a single, concise, and encouraging paragraph."
    )
    
    # Create the LangChain processing chain
    chain = roadmap_prompt | llm

    consumer = AIOKafkaConsumer(
        'user.events',
        bootstrap_servers='localhost:9092',
        group_id="ai-service-group"
    )
    await consumer.start()
    try:
        print("🎧 AI Service listening on topic: 'user.events'...")
        async for msg in consumer:
            raw_data = json.loads(msg.value.decode('utf-8'))
            print(f"📥 Received event: {raw_data}")
            event = UserCreatedEvent(**raw_data)
            
            print(f"🧠 Generating Gemini AI Insight for {event.data.role}...")
            
            try:
                # 🚀 Call Gemini asynchronously!
                ai_response = await chain.ainvoke({"role": event.data.role})
                
                insight_data = {
                    "userId": event.data.userId,
                    "email": event.data.email,
                    "role": event.data.role,
                    "ai_summary": ai_response.content,  # <--- The real LLM output!
                    "processed_at": event.timestamp
                }

                result = await insights_collection.insert_one(insight_data)
                print(f"🔮 Intelligent Roadmap Saved to MongoDB: {result.inserted_id}")
            except Exception as e:
                print(f"❌ AI Generation Failed: {str(e)}")
            
    finally:
        await consumer.stop()

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(consume_kafka())

@app.get("/insights")
async def get_insights():
    # Fetch the 10 most recent insights from MongoDB, sorted by newest first
    cursor = insights_collection.find().sort("processed_at", -1).limit(10)
    insights = await cursor.to_list(length=10)
    
    # Convert MongoDB ObjectIds to strings so they can be serialized to JSON
    for insight in insights:
        insight["_id"] = str(insight["_id"])
        
    return {"insights": insights}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
