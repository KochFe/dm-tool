from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message author: 'user' or 'assistant'")
    content: str = Field(..., description="Text content of the message")

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        """Ensure role is one of the two permitted values."""
        if v not in ("user", "assistant"):
            raise ValueError("role must be 'user' or 'assistant'")
        return v


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(
        ..., description="Full conversation history, oldest message first"
    )

    @field_validator("messages")
    @classmethod
    def messages_must_not_be_empty(cls, v: list[ChatMessage]) -> list[ChatMessage]:
        """At least one message is required to invoke the agent."""
        if not v:
            raise ValueError("messages list must not be empty")
        return v


class ChatResponse(BaseModel):
    message: ChatMessage = Field(..., description="The assistant's reply")
