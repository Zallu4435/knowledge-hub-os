from pydantic import BaseModel

class TaskCompletedData(BaseModel):
    userId: str
    goalTitle: str
    taskTitle: str

class TaskCompletedEvent(BaseModel):
    eventId: str
    timestamp: str
    data: TaskCompletedData
