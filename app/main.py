

from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app import models
from app.schemas import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationResponse
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Job Application Tracker API",
    description="API to manage job applications",
    version="1.0.0"
)


FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static"
)


@app.get("/")
def home():
    return FileResponse(FRONTEND_DIR / "index.html")

@app.post(
    "/applications",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED
)
def create_application(
    application: ApplicationCreate,
    db: Session = Depends(get_db)
):
    new_application = models.JobApplication(**application.model_dump())

    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    return new_application


@app.get(
    "/applications",
    response_model=list[ApplicationResponse]
)
def get_applications(db: Session = Depends(get_db)):
    return (
        db.query(models.JobApplication)
        .order_by(models.JobApplication.id.desc())
        .all()
    )


@app.get(
    "/applications/{application_id}",
    response_model=ApplicationResponse
)
def get_application(
    application_id: int,
    db: Session = Depends(get_db)
):
    application = db.get(models.JobApplication, application_id)

    if application is None:
        raise HTTPException(
            status_code=404,
            detail="Job application not found"
        )

    return application


@app.put(
    "/applications/{application_id}",
    response_model=ApplicationResponse
)
def update_application(
    application_id: int,
    updated_data: ApplicationUpdate,
    db: Session = Depends(get_db)
):
    application = db.get(models.JobApplication, application_id)

    if application is None:
        raise HTTPException(
            status_code=404,
            detail="Job application not found"
        )

    for field, value in updated_data.model_dump().items():
        setattr(application, field, value)

    db.commit()
    db.refresh(application)

    return application


@app.delete(
    "/applications/{application_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_application(
    application_id: int,
    db: Session = Depends(get_db)
):
    application = db.get(models.JobApplication, application_id)

    if application is None:
        raise HTTPException(
            status_code=404,
            detail="Job application not found"
        )

    db.delete(application)
    db.commit()