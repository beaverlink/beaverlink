from datetime import date, datetime
from typing import Annotated, Literal

import psycopg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import (
    BaseModel,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.auth import get_current_user_id
from app.db import get_connection

StudentYear = Literal[
    "First year",
    "Second year",
    "Third year",
    "Fourth year",
    "Fifth year or later",
    "Graduate student",
]
ShortText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]
Goal = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]
LongText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000)]


class ProfileIn(BaseModel):
    profile_type: Literal["student", "alumnus"]
    student_year: StudentYear | None = None
    graduation_year: int | None = None
    major: ShortText = ""
    industry: ShortText = ""
    job_title: ShortText = ""
    goals: list[Goal] = Field(min_length=1, max_length=10)
    goal_details: LongText = ""

    @field_validator("graduation_year")
    @classmethod
    def check_graduation_year(cls, year: int | None) -> int | None:
        if year is not None and not 1900 <= year <= date.today().year:
            raise ValueError("must be a four-digit year that is not in the future")
        return year

    @model_validator(mode="after")
    def check_fields_for_type(self) -> "ProfileIn":
        # Fields for the other profile type are cleared, not stored.
        if self.profile_type == "student":
            if self.student_year is None:
                raise ValueError("student_year is required for students")
            if not self.major:
                raise ValueError("major is required for students")
            self.graduation_year = None
            self.industry = ""
            self.job_title = ""
        else:
            if self.graduation_year is None:
                raise ValueError("graduation_year is required for alumni")
            if not self.industry:
                raise ValueError("industry is required for alumni")
            self.student_year = None
        return self


class ProfileOut(BaseModel):
    profile_type: Literal["student", "alumnus"]
    student_year: str | None
    graduation_year: int | None
    major: str
    industry: str
    job_title: str
    goals: list[str]
    goal_details: str
    updated_at: datetime


UserId = Annotated[str, Depends(get_current_user_id)]
Connection = Annotated[psycopg.Connection, Depends(get_connection)]

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me", response_model=ProfileOut)
def read_my_profile(user_id: UserId, conn: Connection):
    row = conn.execute(
        """
        select profile_type, student_year, graduation_year, major, industry,
               job_title, goals, goal_details, updated_at
        from profiles
        where user_id = %s
        """,
        (user_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    return row


@router.put("/me", response_model=ProfileOut)
def save_my_profile(profile: ProfileIn, user_id: UserId, conn: Connection):
    row = conn.execute(
        """
        insert into profiles (user_id, profile_type, student_year, graduation_year,
                              major, industry, job_title, goals, goal_details)
        values (%(user_id)s, %(profile_type)s, %(student_year)s, %(graduation_year)s,
                %(major)s, %(industry)s, %(job_title)s, %(goals)s, %(goal_details)s)
        on conflict (user_id) do update set
            profile_type = excluded.profile_type,
            student_year = excluded.student_year,
            graduation_year = excluded.graduation_year,
            major = excluded.major,
            industry = excluded.industry,
            job_title = excluded.job_title,
            goals = excluded.goals,
            goal_details = excluded.goal_details,
            updated_at = now()
        returning profile_type, student_year, graduation_year, major, industry,
                  job_title, goals, goal_details, updated_at
        """,
        {"user_id": user_id, **profile.model_dump()},
    ).fetchone()
    conn.commit()
    return row
