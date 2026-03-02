from pydantic import BaseModel

class UserCreatedData(BaseModel):
    userId: str
    email: str
    role: str

class UserCreatedEvent(BaseModel):
    eventId: str
    timestamp: str
    data: UserCreatedData
