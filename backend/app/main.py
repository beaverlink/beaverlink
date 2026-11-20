from fastapi import FastAPI

from app import profiles

app = FastAPI(title="BeaverLink API")
app.include_router(profiles.router)


@app.get("/health")
def health():
    return {"status": "ok"}
