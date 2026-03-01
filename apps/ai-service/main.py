import os
import uvicorn
import asyncio
import json
from fastapi import FastAPI
from aiokafka import AIOKafkaConsumer
from motor.motor_asyncio import AsyncIOMotorClient # Add this
from libs.event_schemas.user_created_event import UserCreatedEvent 

app = FastAPI(title="Knowledge Hub OS - AI Service")

# Setup MongoDB Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URI)
db = client.knowledge_hub
insights_collection = db.user_insights

async def consume_kafka():
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
            event = UserCreatedEvent(**raw_data)
            
            # 🧠 Simulate AI Insight Generation
            insight_data = {
                "userId": event.data.userId,
                "email": event.data.email,
                "role": event.data.role,
                "ai_summary": f"User {event.data.userId} has joined as {event.data.role}. Initializing career roadmap.",
                "processed_at": event.timestamp
            }

            # 💾 Store Insight in MongoDB
            result = await insights_collection.insert_one(insight_data)
            print(f"🔮 AI Insight Saved to MongoDB: {result.inserted_id}")
            
    finally:
        await consumer.stop()

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(consume_kafka())

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
