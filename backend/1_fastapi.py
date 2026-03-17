from fastapi import FastAPI, UploadFile, File, Form
from pydantic import BaseModel
import google.generativeai as genai
import os
import tempfile
from dotenv import load_dotenv
import requests
import json
from enum import Enum
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Load model
model = genai.GenerativeModel("gemini-2.5-flash")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FOLDER = "data"
DB_FILE = "file_db.json"

os.makedirs(DATA_FOLDER, exist_ok=True)

SYSTEM_PROMPT = """
You are a document assistant.

Rules:
- Answer only using the uploaded file.
- Do not hallucinate.
- If the answer is not found say:
"The document does not contain this information."
"""

def load_db():
    if not os.path.exists(DB_FILE):
        return {}
    with open(DB_FILE, "r") as f:
        return json.load(f)


def save_db(db):
    with open(DB_FILE, "w") as f:
        json.dump(db, f, indent=2)


class LanguageEnum(str, Enum):
    english = "English"
    tamil = "Tamil"
    hindi = "Hindi"
    telugu = "Telugu"
    kannada = "Kannada"
    malayalam = "Malayalam"
    bengali = "Bengali"
    marathi = "Marathi"
    gujarati = "Gujarati"
    punjabi = "Punjabi"

@app.get("/")
def home():
    return {"message":  "Gemini Chatbot API Running"}

# -----------------------------------
# 1️⃣ Upload File Endpoint
# -----------------------------------

@app.post("/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    file_name: str = Form(...),
    description: str = Form(...)
):

    file_path = os.path.join(DATA_FOLDER, file.filename)

    # Save locally
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Upload to Gemini
    gemini_file = genai.upload_file(path=file_path)

    db = load_db()

    db[file_name] = {
        "local_path": file_path,
        "description": description,
        "gemini_file_name": gemini_file.name
    }

    save_db(db)

    return {
        "message": "File uploaded successfully",
        "file_name": file_name,
        "description": description,
        "gemini_file_name": gemini_file.name
    }

# -----------------------------------
# 2️⃣ Ask Assistant Endpoint
# -----------------------------------

#@app.post("/ask-assistant")
#async def ask_assistant(
#    file_name: str = Form(...),
#    question: str = Form(...)
#):
#
#    db = load_db()
#
#    if file_name not in db:
#        return {"error": "File not found"}
#
#    gemini_file_name = db[file_name]["gemini_file_name"]
#
#    # Retrieve file object
#    gemini_file = genai.get_file(gemini_file_name)
#
#    prompt = f"""
#{SYSTEM_PROMPT}
#
#User Question:
#{question}
#"""
#
#    response = model.generate_content([
#        gemini_file,
#        prompt
#    ])
#
#    return {
#        "file": file_name,
#        "question": question,
#        "answer": response.text
#    }

@app.post("/ask-assistant")
async def ask_assistant(
    file_name: str = Form(...),
    question: str = Form(...),
    language: LanguageEnum = Form(...)
):

    db = load_db()

    if file_name not in db:
        return {"error": "File not found"}

    gemini_file_name = db[file_name]["gemini_file_name"]
    gemini_file = genai.get_file(gemini_file_name)

    prompt = f"""
You are a document assistant.

Rules:
- Answer only using the uploaded document.
- Do not hallucinate information.
- If the answer is not present say (But you can summarize the document and other action that easily convey the info in the document):
  "The document does not contain this information."
- The final answer MUST be written entirely in {language.value}.
- Do not mix languages.

User Question:
{question}
"""

    response = model.generate_content([
        gemini_file,
        prompt
    ])

    return {
        "file": file_name,
        "language": language,
        "question": question,
        "answer": response.text
    }

@app.get("/files")
def list_files():

    with open(DB_FILE, "r") as f:
        db = json.load(f)

    files = list(db.keys())

    return {
        "files": files
    }

@app.get("/languages")
def get_languages():
    return {
        "languages": [lang.value for lang in LanguageEnum]
    }