import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.schemas import AskRequest, AskResponse
from app.services.retrieval import retrieve_relevant_docs
from app.services.generation import generate_answer, stream_answer

router = APIRouter()


def sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


@router.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest):
    try:
        docs = await retrieve_relevant_docs(request.question, state=request.state)
        result = await generate_answer(request.question, docs)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask/stream")
async def ask_stream(request: AskRequest):
    async def event_stream():
        try:
            docs = await retrieve_relevant_docs(request.question, state=request.state)

            sources = [
                {
                    "title": d["title"],
                    "citation": d["citation"],
                    "excerpt": d["text"][:200],
                    "url": None,
                }
                for d in docs
            ]
            yield sse({"type": "sources", "sources": sources})

            async for delta in stream_answer(request.question, docs):
                yield sse({"type": "delta", "text": delta})

            yield sse({"type": "done"})

        except Exception as e:
            # Once streaming starts the status code is already sent, so errors
            # have to travel as an event rather than an HTTP error response.
            yield sse({"type": "error", "detail": str(e)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )