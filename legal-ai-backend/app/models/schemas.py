from datetime import datetime
from typing import Annotated, List, Optional

from pydantic import BaseModel, EmailStr, StringConstraints, field_validator


class AskRequest(BaseModel):
    question: str
    state: Optional[str] = None
    case_type: Optional[str] = None

class SourceDoc(BaseModel):
    title: str
    citation: str
    excerpt: str
    url: Optional[str] = None

class AskResponse(BaseModel):
    answer: str
    sources: List[SourceDoc]
    disclaimer: str = "This is general legal information, not legal advice. Consult a qualified advocate for your specific situation."


# --------------------------------------------------------------------- auth

# bcrypt hashes at most 72 bytes and raises above that, so the ceiling is
# enforced here rather than letting a long password blow up at hash time.
Password = Annotated[str, StringConstraints(min_length=8, max_length=72)]
GivenPassword = Annotated[str, StringConstraints(min_length=1, max_length=72)]
Name = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)
]


class SignupRequest(BaseModel):
    name: Name
    email: EmailStr
    password: Password

    @field_validator("email")
    @classmethod
    def normalise_email(cls, v: str) -> str:
        # Without this, Aisha@x.com and aisha@x.com become two accounts.
        return v.lower()


class LoginRequest(BaseModel):
    email: EmailStr
    password: GivenPassword

    @field_validator("email")
    @classmethod
    def normalise_email(cls, v: str) -> str:
        return v.lower()


class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str
    default_personal_law: str
    default_state: str
    default_case_type: str
    created_at: datetime

    # Lets FastAPI build this straight from the SQLAlchemy row. password_hash
    # is absent from this model, so it can never leak into a response.
    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    expires_in: int  # seconds
    user: UserOut


class UpdateProfileRequest(BaseModel):
    name: Optional[Name] = None
    default_personal_law: Optional[
        Annotated[str, StringConstraints(max_length=60)]
    ] = None
    default_state: Optional[Annotated[str, StringConstraints(max_length=60)]] = None
    default_case_type: Optional[Annotated[str, StringConstraints(max_length=80)]] = None


class ChangePasswordRequest(BaseModel):
    current_password: GivenPassword
    new_password: Password