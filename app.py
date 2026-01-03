from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import StreamingResponse
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
from src.prompt import *
from src.helper import download_embeddings,format_docs
from langchain_pinecone import PineconeVectorStore
from langchain_openai import ChatOpenAI
from langchain_core.runnables import RunnableLambda, RunnableParallel
from operator import itemgetter
from langchain_core.output_parsers import StrOutputParser
load_dotenv()

app = FastAPI()

# ✅ Static & template setup (ONLY ADDITION)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# ======================
# YOUR EXISTING LOGIC
# ======================

embeddings = download_embeddings()
index_name = "my-index-v2"

vc = PineconeVectorStore.from_existing_index(
    index_name=index_name,
    embedding=embeddings
)

retriever = vc.as_retriever(search_type="similarity", search_kwargs={"k": 3})

parallel_chain = RunnableParallel({
    "context": itemgetter('question') | retriever | RunnableLambda(format_docs),
    "question": itemgetter('question')
})

model = ChatOpenAI(model_name="gpt-4o-mini",streaming=True  )

chain = parallel_chain | prompt | model | StrOutputParser()

# ======================
# ROUTES
# ======================

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.websocket('/ws/chat')
async def websocket_chat(ws:WebSocket):
    await ws.accept()
    try:
        while True:
            user_msg = await ws.receive_text()
            if user_msg == '__STOP__':
                continue

            for token in chain.stream({'question':user_msg}):
                await ws.send_text(token)

            await ws.send_text("__END__")

    except WebSocketDisconnect:
        print("Client Disconnected")

