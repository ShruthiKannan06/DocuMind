const API_URL = "http://127.0.0.1:8000"


async function sendQuestion() {

    const questionInput = document.getElementById("question")
    const question = questionInput.value.trim()

    const file = document.getElementById("fileSelect").value
    const language = document.getElementById("languageSelect").value

    if (!question) {
        alert("Please enter a question")
        return
    }

    if (!file) {
        alert("Please select a file")
        return
    }

    addMessage("user", question)

    questionInput.value = ""

    // show AI thinking animation
    const loader = showThinking()

    const formData = new FormData()

    formData.append("file_name", file)
    formData.append("question", question)
    formData.append("language", language)

    try {

        const response = await fetch(`${API_URL}/ask-assistant`, {
            method: "POST",
            body: formData
        })

        const data = await response.json()

        // remove loader
        loader.remove()

        addMessage("ai", data.answer)

    } catch (error) {

        loader.remove()

        addMessage("ai", "Error contacting server")

    }

}

function showThinking() {

    const chat = document.getElementById("chatMessages")

    const div = document.createElement("div")
    div.className = "message-ai"

    const bubble = document.createElement("span")

    bubble.innerHTML = `
        <div class="ai-msg">
            <div class="typing">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `

    div.appendChild(bubble)

    chat.appendChild(div)

    chat.scrollTop = chat.scrollHeight

    return div
}

function addMessage(role, text) {

    const chat = document.getElementById("chatMessages")
    // remove welcome message if present
    const welcome = document.querySelector(".welcome")
    if (welcome) {
        welcome.remove()
    }
    const div = document.createElement("div")

    div.className = role === "user"
        ? "message-user"
        : "message-ai"

    const bubble = document.createElement("span")

    // render markdown
    if (role === "ai") {

    bubble.innerHTML = `
        <div class="ai-msg">
            <div class="ai-content">

                <div class="ai-text">${marked.parse(text)}</div>

                <div class="ai-actions">
                    <button onclick="copyText(this)">📋 Copy</button>
                    <button onclick="readAloud(this)">🔊 Read</button>
                </div>

            </div>
        </div>
    `

    } else {

        bubble.innerHTML = marked.parse(text)

    }

    div.appendChild(bubble)

    chat.appendChild(div)

    // render LaTeX
    renderMathInElement(bubble, {
        delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "$", right: "$", display: false}
        ]
    })

    chat.scrollTop = chat.scrollHeight
}


function openUpload() {
    document.getElementById("uploadModal").style.display = "flex"
}


function closeUpload() {
    document.getElementById("uploadModal").style.display = "none"
}


async function uploadFile() {

    const fileName = document.getElementById("fileName").value
    const description = document.getElementById("fileDescription").value
    const file = document.getElementById("fileInput").files[0]

    if (!file || !fileName) {
        alert("Please provide file name and select file")
        return
    }

    const formData = new FormData()

    formData.append("file_name", fileName)
    formData.append("description", description)
    formData.append("file", file)

    try {

        const response = await fetch(`${API_URL}/upload-file`, {
            method: "POST",
            body: formData
        })

        await response.json()

        alert("File uploaded successfully")

        closeUpload()

        loadFiles()   // refresh dropdown

    } catch (error) {

        alert("Upload failed")

    }

}


async function loadFiles() {

    try {

        const response = await fetch(`${API_URL}/files`)

        const data = await response.json()

        const dropdown = document.getElementById("fileSelect")

        dropdown.innerHTML = ""

        data.files.forEach(file => {

            const option = document.createElement("option")

            option.value = file
            option.text = file

            dropdown.appendChild(option)

        })

    } catch (error) {

        console.log("Error loading files")

    }

}

async function loadLanguages() {

    const response = await fetch(`${API_URL}/languages`)

    const data = await response.json()

    const dropdown = document.getElementById("languageSelect")

    dropdown.innerHTML = ""

    data.languages.forEach(language => {

        const option = document.createElement("option")

        option.value = language
        option.text = language

        dropdown.appendChild(option)

    })

}

window.onload = () => {

    loadFiles()
    loadLanguages()

    document
        .getElementById("question")
        .addEventListener("keypress", function(e) {

            if (e.key === "Enter") {
                e.preventDefault()
                sendQuestion()
            }

        })

}

function getSpeechLang(lang){

    const map = {
        "English": "en-US",
        "Tamil": "ta-IN",
        "Hindi": "hi-IN",
        "Telugu": "te-IN",
        "Kannada": "kn-IN",
        "Malayalam": "ml-IN",
        "Bengali": "bn-IN",
        "Marathi": "mr-IN",
        "Gujarati": "gu-IN",
        "Punjabi": "pa-IN"
    }

    return map[lang] || "en-US"

}

function startListening(){

    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition

    if(!SpeechRecognition){
        alert("Speech recognition not supported")
        return
    }

    const recognition = new SpeechRecognition()

    const micBtn = document.getElementById("micBtn")

    const selectedLang = document.getElementById("languageSelect").value

    recognition.lang = getSpeechLang(selectedLang)

    // change icon to recording
    micBtn.innerText = "🔴"
    micBtn.classList.add("mic-recording")

    recognition.start()

    recognition.onresult = function(event){

        const transcript = event.results[0][0].transcript

        document.getElementById("question").value = transcript

    }

    recognition.onend = function(){

        // return mic icon
        micBtn.innerText = "🎤"
        micBtn.classList.remove("mic-recording")

    }

}

function copyText(btn){

    const text = btn
        .closest(".ai-content")
        .querySelector(".ai-text")
        .innerText

    navigator.clipboard.writeText(text)

    btn.innerText = "✅ Copied"

    setTimeout(()=>{
        btn.innerText="📋 Copy"
    },1500)

}

function getSpeechLang(lang){

    const map = {

        "English":"en-US",
        "Tamil":"ta-IN",
        "Hindi":"hi-IN",
        "Telugu":"te-IN",
        "Kannada":"kn-IN",
        "Malayalam":"ml-IN",
        "Bengali":"bn-IN",
        "Marathi":"mr-IN",
        "Gujarati":"gu-IN",
        "Punjabi":"pa-IN"

    }

    return map[lang] || "en-US"

}

function readAloud(btn){

    const text = btn
        .closest(".ai-content")
        .querySelector(".ai-text")
        .innerText

    // if already speaking → stop
    if (speechSynthesis.speaking) {

        speechSynthesis.cancel()
        btn.innerText = "🔊 Read"
        btn.classList.add("active")
        return
    }

    const speech = new SpeechSynthesisUtterance(text)

    const selectedLang = document
        .getElementById("languageSelect")
        .value

    speech.lang = getSpeechLang(selectedLang)

    // change button
    btn.innerText = "⏹ Stop"
    btn.classList.remove("active")

    speech.onend = function(){

        btn.innerText = "🔊 Read"
        
    }

    speechSynthesis.speak(speech)

}