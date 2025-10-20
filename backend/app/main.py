from fastapi import FastAPI

from app.core.config import settings
from app.routes import auth, files

app = FastAPI(title=settings.APP_NAME)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(files.router, prefix="/files", tags=["files"])


@app.get("/")
async def root():
    return {"message": f"{settings.APP_NAME} backend is running!"}
