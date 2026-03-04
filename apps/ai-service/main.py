import os
import uvicorn
import asyncio
import json
import logging
import traceback

import jwt
import structlog
from pydantic import BaseModel
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
    RetryError,
)

# Phase 12 — OpenTelemetry tracing for Python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource

# Phase 12 — Prometheus metrics for FastAPI
from prometheus_fastapi_instrumentator import Instrumentator as PrometheusInstrumentator

# Import our strict contracts
from libs.event_schemas.user_created_event import UserCreatedEvent
from libs.event_schemas.task_completed_event import TaskCompletedEvent

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.prompts import PromptTemplate

# =============================================================================
# Phase 4.3: Structured JSON Logging with structlog
# =============================================================================
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),  # Every log line is a single JSON object
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)
log = structlog.get_logger(service_name="ai-service")

# =============================================================================
# Environment Loading
# =============================================================================
for env_path in ["../../.env", ".env", "./.env", "../../../.env"]:
    if os.path.exists(env_path):
        log.info("env_loaded", path=os.path.abspath(env_path))
        load_dotenv(env_path)
        break

MONGO_URI = os.getenv("MONGO_URI")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
KAFKA_BROKER_URL = os.getenv("KAFKA_BROKER_URL", "localhost:9092")  # Phase 1.1

if not GEMINI_API_KEY:
    log.error("gemini_key_missing", detail="GEMINI_API_KEY not found in environment")
else:
    log.info("gemini_key_found", prefix=GEMINI_API_KEY[:5])

# =============================================================================
# MongoDB
# =============================================================================
client = AsyncIOMotorClient(MONGO_URI)
db = client.knowledge_hub
insights_collection = db.user_insights

# =============================================================================
# FastAPI App & Security
# =============================================================================
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-development-key")
security = HTTPBearer()

# Phase 1.2: Dynamic CORS from environment
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:4000").split(",")
]

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# =============================================================================
# Phase 12 — Bootstrap OpenTelemetry SDK
# Sends trace spans to Jaeger via OTLP/HTTP (env: OTEL_EXPORTER_OTLP_ENDPOINT)
# =============================================================================
_otel_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318")
_service_name = os.getenv("OTEL_SERVICE_NAME", "ai-service")

_otel_resource = Resource(attributes={"service.name": _service_name})
_tracer_provider = TracerProvider(resource=_otel_resource)
_otlp_exporter = OTLPSpanExporter(endpoint=f"{_otel_endpoint}/v1/traces")
_tracer_provider.add_span_processor(BatchSpanProcessor(_otlp_exporter))
trace.set_tracer_provider(_tracer_provider)
tracer = trace.get_tracer(__name__)

app = FastAPI(title="Knowledge Hub OS - AI Brain")

# Phase 1.2: Enforce CORS in FastAPI
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Phase 12 — Wire OTEL auto-instrumentation (must be done after app is created)
FastAPIInstrumentor.instrument_app(app, tracer_provider=_tracer_provider)

# Phase 12 — Mount Prometheus /metrics endpoint
# Instrumentator automatically tracks request count, latency histograms, in-flight, etc.
PrometheusInstrumentator().instrument(app).expose(app, endpoint="/metrics")

# =============================================================================
# LLM Initialization Helper (created per-request to avoid loop mismatch)
# =============================================================================
def make_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model="models/gemini-2.0-flash",
        temperature=0.7,
        google_api_key=GEMINI_API_KEY,
        transport="rest",
    )

# =============================================================================
# Embeddings Model
# =============================================================================
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004",
    google_api_key=GEMINI_API_KEY,
    transport="rest",
)

# =============================================================================
# Request Model
# =============================================================================
class ChatRequest(BaseModel):
    message: str

# =============================================================================
# HTTP Endpoints
# =============================================================================

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-service", "timestamp": __import__("datetime").datetime.utcnow().isoformat()}


# =============================================================================
# HTTP Fallback Event Endpoints
# Used when Kafka is not configured (e.g. Render free tier).
# NestJS services POST events here directly instead of publishing to Kafka.
# When KAFKA_BROKER_URL is set, Kafka consumer handles events instead.
# =============================================================================
class UserEventPayload(BaseModel):
    eventId: str
    timestamp: str
    data: dict

class TaskEventPayload(BaseModel):
    eventId: str
    timestamp: str
    data: dict


@app.post("/events/user-created")
async def http_user_event(payload: UserEventPayload):
    """
    HTTP equivalent of the 'user.events' Kafka topic.
    Called by api-gateway when KAFKA_BROKER_URL is not set.
    """
    log.info("http_user_event_received", event_id=payload.eventId)
    # Run in background so the HTTP response returns immediately
    asyncio.create_task(_process_user_event(payload.dict()))
    return {"status": "accepted", "eventId": payload.eventId}


@app.post("/events/task-completed")
async def http_task_event(payload: TaskEventPayload):
    """
    HTTP equivalent of the 'task.completed' Kafka topic.
    Called by goal-service when KAFKA_BROKER_URL is not set.
    """
    log.info("http_task_event_received", event_id=payload.eventId)
    asyncio.create_task(_process_task_event(payload.dict()))
    return {"status": "accepted", "eventId": payload.eventId}


async def _process_user_event(raw_data: dict):
    """Shared processing logic for user.events (Kafka + HTTP path)."""
    event_id = raw_data.get("eventId")
    try:
        existing = await insights_collection.find_one({"eventId": event_id})
        if existing:
            log.info("duplicate_event_skipped", event_id=event_id)
            return
        from libs.event_schemas.user_created_event import UserCreatedEvent
        event = UserCreatedEvent(**raw_data)
        llm = make_llm()
        roadmap_prompt = PromptTemplate.from_template(
            "You are an expert career architect for Knowledge Hub OS. "
            "A new user joined as a: {role}. "
            "Generate a specific, 3-step technical roadmap for their first 30 days in one concise paragraph."
        )
        ai_response = await invoke_with_retry(roadmap_prompt | llm, {"role": event.data.role})
        vector = await embeddings.aembed_query(ai_response.content)
        await insights_collection.insert_one({
            "eventId": event_id,
            "userId": event.data.userId,
            "type": "career_roadmap",
            "ai_summary": ai_response.content,
            "embedding": vector,
            "processed_at": event.timestamp,
        })
        log.info("user_insight_saved", event_id=event_id)
    except Exception as e:
        log.error("user_event_processing_error", error=str(e), event_id=event_id)


async def _process_task_event(raw_data: dict):
    """Shared processing logic for task.completed (Kafka + HTTP path)."""
    event_id = raw_data.get("eventId")
    try:
        existing = await insights_collection.find_one({"eventId": event_id})
        if existing:
            log.info("duplicate_event_skipped", event_id=event_id)
            return
        from libs.event_schemas.task_completed_event import TaskCompletedEvent
        event = TaskCompletedEvent(**raw_data)
        llm = make_llm()
        coach_prompt = PromptTemplate.from_template(
            "You are an energetic AI productivity coach. "
            "The user just completed the task '{task}' which is part of their overarching goal: '{goal}'. "
            "Give them a short, punchy high-five acknowledging their specific work, and a 1-sentence tip on maintaining momentum."
        )
        ai_response = await invoke_with_retry(coach_prompt | llm, {"task": event.data.taskTitle, "goal": event.data.goalTitle})
        vector = await embeddings.aembed_query(ai_response.content)
        await insights_collection.insert_one({
            "eventId": event_id,
            "userId": event.data.userId,
            "type": "productivity_insight",
            "goal": event.data.goalTitle,
            "task": event.data.taskTitle,
            "ai_summary": ai_response.content,
            "embedding": vector,
            "processed_at": event.timestamp,
        })
        log.info("task_insight_saved", event_id=event_id)
    except Exception as e:
        log.error("task_event_processing_error", error=str(e), event_id=event_id)


@app.get("/insights")
async def get_insights(user_id: str = Depends(verify_token)):
    cursor = insights_collection.find({"userId": user_id}).sort("processed_at", -1).limit(20)
    insights = await cursor.to_list(length=20)
    for insight in insights:
        insight["_id"] = str(insight["_id"])
    return {"insights": insights}


@app.post("/chat")
async def chat_with_ai(request: ChatRequest, user_id: str = Depends(verify_token)):
    log.info("chat_request_received", user_id=user_id)

    try:
        query_vector = await embeddings.aembed_query(request.message)
    except Exception as e:
        log.error("embedding_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")

    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": 50,
                "limit": 5,
                "filter": {"userId": {"$eq": user_id}},
            }
        },
        {"$project": {"ai_summary": 1, "score": {"$meta": "vectorSearchScore"}}},
    ]
    results = await insights_collection.aggregate(pipeline).to_list(length=5)
    context = "\n".join([f"- {doc['ai_summary']}" for doc in results])
    if not context:
        context = "No past productivity data found. The user is new."

    llm = make_llm()
    chat_prompt = PromptTemplate.from_template(
        "You are the AI Assistant for Knowledge Hub OS. You have access to the user's past productivity history.\n"
        "HISTORY:\n{context}\n\n"
        "USER QUESTION: {question}\n\n"
        "ANSWER: Give a highly personalized, encouraging answer based ONLY on their history. "
        "If their history doesn't answer it, politely say so, but encourage them to keep completing tasks!"
    )
    chain = chat_prompt | llm

    try:
        ai_reply = await invoke_with_retry(chain, {"context": context, "question": request.message})
        return {"reply": ai_reply.content}
    except Exception as e:
        log.error("llm_generation_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


# =============================================================================
# Phase 3.1: Exponential Backoff Retry via tenacity
# =============================================================================
@retry(
    retry=retry_if_exception_type(Exception),
    wait=wait_exponential(multiplier=1, min=2, max=16),  # 2s → 4s → 8s → 16s
    stop=stop_after_attempt(5),
    before_sleep=before_sleep_log(log, logging.WARNING),
    reraise=True,
)
async def invoke_with_retry(chain, inputs: dict):
    """Invoke a LangChain chain with exponential backoff (handles 429 rate limits)."""
    return await chain.ainvoke(inputs)


# =============================================================================
# Phase 2: Kafka Consumer with Idempotency + DLQ
# =============================================================================
async def publish_to_dlq(producer: AIOKafkaProducer, original_value: bytes, dlq_topic: str, error: Exception):
    """Phase 2.2: Publish failed message to the Dead Letter Queue."""
    error_headers = [
        ("error_message", str(error).encode("utf-8")),
        ("error_traceback", traceback.format_exc().encode("utf-8")),
    ]
    await producer.send_and_wait(
        dlq_topic,
        value=original_value,
        headers=error_headers,
    )
    log.warning("dlq_published", topic=dlq_topic, error=str(error))


async def consume_kafka():
    llm = make_llm()

    # Prompt 1: The Architect (for new users)
    roadmap_prompt = PromptTemplate.from_template(
        "You are an expert career architect for Knowledge Hub OS. "
        "A new user joined as a: {role}. "
        "Generate a specific, 3-step technical roadmap for their first 30 days in one concise paragraph."
    )
    roadmap_chain = roadmap_prompt | llm

    # Prompt 2: The Coach (for completed tasks)
    coach_prompt = PromptTemplate.from_template(
        "You are an energetic AI productivity coach. "
        "The user just completed the task '{task}' which is part of their overarching goal: '{goal}'. "
        "Give them a short, punchy high-five acknowledging their specific work, and a 1-sentence tip on maintaining momentum."
    )
    coach_chain = coach_prompt | llm

    # Phase 1.1: Use KAFKA_BROKER_URL env var
    # ── Kafka connection params — SASL for Upstash, plain for local Redpanda ──
    _kafka_sasl_username = os.getenv("KAFKA_SASL_USERNAME", "")
    _kafka_sasl_password = os.getenv("KAFKA_SASL_PASSWORD", "")
    _kafka_security_protocol = "SASL_SSL" if _kafka_sasl_username else "PLAINTEXT"
    _kafka_sasl_mechanism   = "SCRAM-SHA-256" if _kafka_sasl_username else "PLAIN"

    consumer = AIOKafkaConsumer(
        "user.events",
        "task.completed",
        bootstrap_servers=KAFKA_BROKER_URL,
        group_id="ai-service-group",
        security_protocol=_kafka_security_protocol,
        sasl_mechanism=_kafka_sasl_mechanism,
        sasl_plain_username=_kafka_sasl_username,
        sasl_plain_password=_kafka_sasl_password,
        auto_offset_reset="latest",
    )
    # Phase 2.2: DLQ producer — same auth settings
    dlq_producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BROKER_URL,
        security_protocol=_kafka_security_protocol,
        sasl_mechanism=_kafka_sasl_mechanism,
        sasl_plain_username=_kafka_sasl_username,
        sasl_plain_password=_kafka_sasl_password,
    )

    await consumer.start()
    await dlq_producer.start()

    try:
        log.info("kafka_consumer_started", topics=["user.events", "task.completed"])

        async for msg in consumer:
            raw_data = json.loads(msg.value.decode("utf-8"))
            insight_data = None
            event_id = raw_data.get("eventId")

            # ---------------------------------------------------------------
            # Phase 2.1: Idempotency — skip if eventId already processed
            # ---------------------------------------------------------------
            if event_id:
                existing = await insights_collection.find_one({"eventId": event_id})
                if existing:
                    log.info("duplicate_event_skipped", event_id=event_id, topic=msg.topic)
                    continue

            # ---------------------------------------------------------------
            # ROUTE 1: NEW USER
            # ---------------------------------------------------------------
            if msg.topic == "user.events":
                try:
                    event = UserCreatedEvent(**raw_data)
                    log.info("processing_user_event", role=event.data.role, event_id=event_id)

                    ai_response = await invoke_with_retry(roadmap_chain, {"role": event.data.role})

                    insight_data = {
                        "eventId": event_id,          # stored for dedup
                        "userId": event.data.userId,
                        "type": "career_roadmap",
                        "ai_summary": ai_response.content,
                        "processed_at": event.timestamp,
                    }
                except RetryError as e:
                    log.error("max_retries_exceeded", topic=msg.topic, event_id=event_id, error=str(e))
                    await publish_to_dlq(dlq_producer, msg.value, "dlq.user.events", e)
                    continue
                except Exception as e:
                    log.error("user_event_processing_error", error=str(e), event_id=event_id)
                    await publish_to_dlq(dlq_producer, msg.value, "dlq.user.events", e)
                    continue

            # ---------------------------------------------------------------
            # ROUTE 2: TASK COMPLETED
            # ---------------------------------------------------------------
            elif msg.topic == "task.completed":
                try:
                    event = TaskCompletedEvent(**raw_data)
                    log.info("processing_task_event", task=event.data.taskTitle, event_id=event_id)

                    ai_response = await invoke_with_retry(
                        coach_chain,
                        {"task": event.data.taskTitle, "goal": event.data.goalTitle},
                    )

                    insight_data = {
                        "eventId": event_id,          # stored for dedup
                        "userId": event.data.userId,
                        "type": "productivity_insight",
                        "goal": event.data.goalTitle,
                        "task": event.data.taskTitle,
                        "ai_summary": ai_response.content,
                        "processed_at": event.timestamp,
                    }
                except RetryError as e:
                    log.error("max_retries_exceeded", topic=msg.topic, event_id=event_id, error=str(e))
                    await publish_to_dlq(dlq_producer, msg.value, "dlq.task.completed", e)
                    continue
                except Exception as e:
                    log.error("task_event_processing_error", error=str(e), event_id=event_id)
                    await publish_to_dlq(dlq_producer, msg.value, "dlq.task.completed", e)
                    continue

            # ---------------------------------------------------------------
            # Persist to MongoDB (with embedding)
            # ---------------------------------------------------------------
            if insight_data:
                try:
                    vector = await embeddings.aembed_query(insight_data["ai_summary"])
                    insight_data["embedding"] = vector
                    result = await insights_collection.insert_one(insight_data)
                    log.info("insight_saved", mongo_id=str(result.inserted_id), event_id=event_id)
                except Exception as e:
                    log.error("mongo_save_failed", error=str(e), event_id=event_id)

    finally:
        await consumer.stop()
        await dlq_producer.stop()


# =============================================================================
# Startup
# =============================================================================
@app.on_event("startup")
async def startup_event():
    # Only start Kafka consumer if KAFKA_BROKER_URL is configured.
    # On Render free tier without Kafka, events arrive via HTTP instead.
    if KAFKA_BROKER_URL and KAFKA_BROKER_URL not in ("none", "disabled", ""):
        log.info("kafka_enabled", broker=KAFKA_BROKER_URL)
        asyncio.create_task(consume_kafka())
    else:
        log.info("kafka_disabled_using_http_fallback")


if __name__ == "__main__":
    # Render injects PORT; fall back to PORT_AI_SERVICE for local dev
    ai_port = int(os.getenv("PORT", os.getenv("PORT_AI_SERVICE", "8000")))
    uvicorn.run(app, host="0.0.0.0", port=ai_port)
