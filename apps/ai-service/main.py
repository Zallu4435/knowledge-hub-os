import uvicorn
import asyncio
import json
from fastapi import FastAPI
from aiokafka import AIOKafkaConsumer
from libs.event_schemas.user_created_event import UserCreatedEvent 

app = FastAPI(title="Knowledge Hub OS - AI Service")

async def consume_kafka():
    consumer = AIOKafkaConsumer(
        'user.events',
        bootstrap_servers='localhost:9092',
        group_id="ai-service-group",
        auto_offset_reset="latest"
    )
    await consumer.start()
    try:
        print("🎧 AI Service listening on topic: 'user.events'...")
        async for msg in consumer:
            # 1. Parse the raw Kafka bytes to JSON
            raw_data = json.loads(msg.value.decode('utf-8'))
            
            # 2. Validate against the Bazel-generated Contract!
            event = UserCreatedEvent(**raw_data)
            
            # 3. Process the typed event
            print(f"🧠 AI Service Ingested Event: {event.eventId}")
            print(f"   -> Triggering analysis for User: {event.data.userId} (Role: {event.data.role})")
    finally:
        await consumer.stop()

@app.on_event("startup")
async def startup_event():
    # Start the Kafka listener in the background when FastAPI boots
    asyncio.create_task(consume_kafka())

@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
