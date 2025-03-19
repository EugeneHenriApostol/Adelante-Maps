from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai.embeddings import OpenAIEmbeddings
from langchain_chroma import Chroma
from uuid import uuid4

from dotenv import load_dotenv
load_dotenv()

# config
DATA_PATH = r"data"
CHROMA_PATH = r"chroma_db"

# initiate embeddings model
embeddings_model = OpenAIEmbeddings(model="text-embedding-3-large")

# iniate vector store
vector_store = Chroma(
    collection_name="data_collection",
    embedding_function=embeddings_model,
    persist_directory=CHROMA_PATH,
)

# load pdf document
loader = PyPDFDirectoryLoader(DATA_PATH)

raw_documents = loader.load()

# split the document
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=300,
    chunk_overlap=100,
    length_function=len,
    is_separator_regex=False,
)

# creating the chunks
chunks = text_splitter.split_documents(raw_documents)

# creating unique ID's
uuids = [str(uuid4()) for _ in range(len(chunks))]

# adding chunks to vector store
vector_store.add_documents(documents=chunks, ids=uuids)