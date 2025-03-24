from fastapi import APIRouter
from fastapi.responses import JSONResponse
import schemas
from database import get_db

from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_openai import ChatOpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai.embeddings import OpenAIEmbeddings
from langchain_chroma import Chroma
from uuid import uuid4

from dotenv import load_dotenv
load_dotenv()

chatbot_api_router = APIRouter()

DATA_PATH = r"data"
CHROMA_PATH = r"chroma_db"

embeddings_model = OpenAIEmbeddings(model="text-embedding-3-large")

# initiate the model
llm = ChatOpenAI(temperature=0.5, model='gpt-4o-mini')

# connect to the chromadb
vector_store = Chroma(
    collection_name="data_collection",
    embedding_function=embeddings_model,
    persist_directory=CHROMA_PATH, 
)

# set up the vectorstore to be the retriever
num_results = 2
retriever = vector_store.as_retriever(search_kwargs={'k': num_results})

@chatbot_api_router.post('/api/chat')
async def chat_endpoint(chat_request: schemas.ChatRequest):
    message = chat_request.message
    history = chat_request.history

    # Retrieve relevant chunks based on the question asked
    docs = retriever.invoke(message)

    # Prepare the knowledge string from retrieved documents
    knowledge = "\n\n".join(doc.page_content for doc in docs)

    # Prepare the RAG prompt
    rag_prompt = f"""
    You are an assistant which answers questions based on knowledge which is provided to you.
    While answering, you don't use your internal knowledge, 
    but solely the information in the "The knowledge" section.
    You don't mention anything to the user about the provided knowledge.

    The question: {message}

    Conversation history: {history}

    The knowledge: {knowledge}
    """

    # Generate the response
    full_response = ""
    for response in llm.stream(rag_prompt):
        full_response += response.content

    # Return the full response as JSON
    return JSONResponse(content={"answer": full_response})