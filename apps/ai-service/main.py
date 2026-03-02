import os
import uvicorn
import asyncio
import json
import jwt
from pydantic import BaseModel
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from aiokafka import AIOKafkaConsumer
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Import our strict contracts
from libs.event_schemas.user_created_event import UserCreatedEvent 
from libs.event_schemas.task_completed_event import TaskCompletedEvent 

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.prompts import PromptTemplate

# Load from where .env is located
# Search for .env in common locations (Bazel runfiles vs local)
for env_path in ["../../.env", ".env", "./.env", "../../../.env"]:
    if os.path.exists(env_path):
        print(f"✅ Found .env at: {os.path.abspath(env_path)}")
        load_dotenv(env_path)
        break

MONGO_URI = os.getenv("MONGO_URI")
# Try both common names for the Gemini/Google API Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

if not GEMINI_API_KEY:
    print("❌ ERROR: GEMINI_API_KEY not found in environment!")
else:
    print(f"🔑 API Key found (starts with: {GEMINI_API_KEY[:5]}...)")

# Initialize the Embeddings Model
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004", 
    google_api_key=GEMINI_API_KEY,
    transport="rest"
)

# Request model for the new chat endpoint
class ChatRequest(BaseModel):
    message: str

client = AsyncIOMotorClient(MONGO_URI)
db = client.knowledge_hub
insights_collection = db.user_insights

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-development-key")
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        # Decode the token using the exact same secret NestJS used
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload["sub"]  # "sub" is the userId we embedded in NestJS
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

app = FastAPI(title="Knowledge Hub OS - AI Brain")

@app.get("/insights")
async def get_insights(user_id: str = Depends(verify_token)): # 🔒 Route is now protected!
    # Query MongoDB ONLY for documents matching this exact user
    cursor = insights_collection.find({"userId": user_id}).sort("processed_at", -1).limit(20)
    insights = await cursor.to_list(length=20)
    
    # Convert MongoDB ObjectId to string for JSON serialization
    for insight in insights:
        insight["_id"] = str(insight["_id"])
        
    return {"insights": insights}

@app.post("/chat")
async def chat_with_ai(request: ChatRequest, user_id: str = Depends(verify_token)):
    print(f"💬 Chat request from user: {user_id}")
    # 1. Convert the user's chat message into a vector
    try:
        query_vector = await embeddings.aembed_query(request.message)
    except Exception as e:
        print(f"❌ Embedding failed: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")
    
    # 2. Search MongoDB for the top 5 most relevant past insights for THIS specific user
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": 50,
                "limit": 5,
                "filter": {"userId": {"$eq": user_id}}
            }
        },
        {
            "$project": {"ai_summary": 1, "score": {"$meta": "vectorSearchScore"}}
        }
    ]
    
    results = await insights_collection.aggregate(pipeline).to_list(length=5)
    
    # 3. Compile the retrieved memory into a single context string
    context = "\n".join([f"- {doc['ai_summary']}" for doc in results])
    
    if not context:
        context = "No past productivity data found. The user is new."

    # Initialize Gemini inside the request loop to avoid loop mismatch errors
    llm = ChatGoogleGenerativeAI(
        model="models/gemini-2.0-flash", 
        temperature=0.7,
        google_api_key=GEMINI_API_KEY,
        transport="rest"
    )

    # 4. Inject the memory into a new Gemini prompt
    chat_prompt = PromptTemplate.from_template(
        "You are the AI Assistant for Knowledge Hub OS. You have access to the user's past productivity history.\n"
        "HISTORY:\n{context}\n\n"
        "USER QUESTION: {question}\n\n"
        "ANSWER: Give a highly personalized, encouraging answer based ONLY on their history. "
        "If their history doesn't answer it, politely say so, but encourage them to keep completing tasks!"
    )
    
    chat_chain = chat_prompt | llm
    try:
        ai_reply = await chat_chain.ainvoke({"context": context, "question": request.message})
        return {"reply": ai_reply.content}
    except Exception as e:
        print(f"❌ LLM generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

async def consume_kafka():
    # 🧠 Initialize Gemini inside the loop to avoid loop mismatch errors
    llm = ChatGoogleGenerativeAI(
        model="models/gemini-2.0-flash", 
        temperature=0.7,
        google_api_key=GEMINI_API_KEY,
        transport="rest"
    )

    # Prompt 1: The Architect (For new users)
    roadmap_prompt = PromptTemplate.from_template(
        "You are an expert career architect for Knowledge Hub OS. "
        "A new user joined as a: {role}. "
        "Generate a specific, 3-step technical roadmap for their first 30 days in one concise paragraph."
    )
    roadmap_chain = roadmap_prompt | llm

    # Prompt 2: The Coach (For completed tasks)
    coach_prompt = PromptTemplate.from_template(
        "You are an energetic AI productivity coach. "
        "The user just completed the task '{task}' which is part of their overarching goal: '{goal}'. "
        "Give them a short, punchy high-five acknowledging their specific work, and a 1-sentence tip on maintaining momentum."
    )
    coach_chain = coach_prompt | llm

    # Subscribe to BOTH topics!
    consumer = AIOKafkaConsumer(
        'user.events',
        'task.completed',
        bootstrap_servers='localhost:9092',
        group_id="ai-service-group"
    )
    await consumer.start()
    try:
        print("🎧 AI Service listening on topics: 'user.events' & 'task.completed'...")
        async for msg in consumer:
            raw_data = json.loads(msg.value.decode('utf-8'))
            
            insight_data = None
            
            # --- ROUTE 1: NEW USER ---
            if msg.topic == 'user.events':
                try:
                    event = UserCreatedEvent(**raw_data)
                    print(f"🧠 Generating Roadmap for {event.data.role}...")
                    ai_response = await roadmap_chain.ainvoke({"role": event.data.role})
                    
                    insight_data = {
                        "userId": event.data.userId,
                        "type": "career_roadmap",
                        "ai_summary": ai_response.content,
                        "processed_at": event.timestamp
                    }
                except Exception as e:
                    print(f"❌ Error processing UserCreatedEvent: {e}")

            # --- ROUTE 2: TASK COMPLETED ---
            elif msg.topic == 'task.completed':
                try:
                    event = TaskCompletedEvent(**raw_data)
                    print(f"🎯 Generating High-Five for task: {event.data.taskTitle}...")
                    ai_response = await coach_chain.ainvoke({
                        "task": event.data.taskTitle,
                        "goal": event.data.goalTitle
                    })
                    
                    insight_data = {
                        "userId": event.data.userId,
                        "type": "productivity_insight",
                        "goal": event.data.goalTitle,
                        "task": event.data.taskTitle,
                        "ai_summary": ai_response.content,
                        "processed_at": event.timestamp
                    }
                except Exception as e:
                    print(f"❌ Error processing TaskCompletedEvent: {e}")
            
            if insight_data:
                # Generate the vector embedding for the AI's insight!
                vector = await embeddings.aembed_query(insight_data["ai_summary"])
                insight_data["embedding"] = vector  # Attach it to the MongoDB document

                # Save the generated insight to MongoDB
                result = await insights_collection.insert_one(insight_data)
                print(f"🔮 Insight Saved to MongoDB: {result.inserted_id}\n")
            
    finally:
        await consumer.stop()

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(consume_kafka())

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
