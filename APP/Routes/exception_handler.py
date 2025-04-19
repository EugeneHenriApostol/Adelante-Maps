from fastapi import HTTPException
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi import HTTPException, status, Request

async def custom_http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == status.HTTP_401_UNAUTHORIZED:
        return RedirectResponse(url="/unauthorized")
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
