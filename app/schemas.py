from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ApplicationStatus = Literal[
    "Applied",
    "Interview",
    "Assessment",
    "Offer",
    "Rejected"
]


class ApplicationCreate(BaseModel):
    company: str = Field(min_length=1, max_length=100)
    role: str = Field(min_length=1, max_length=100)
    job_url: str | None = Field(default=None, max_length=500)
    status: ApplicationStatus = "Applied"
    applied_on: date = Field(default_factory=date.today)
    notes: str | None = None


class ApplicationUpdate(ApplicationCreate):
    pass


class ApplicationResponse(ApplicationCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime