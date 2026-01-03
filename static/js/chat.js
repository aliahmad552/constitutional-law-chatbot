const chatForm = document.getElementById("chat-form");
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const toggleBtn = document.getElementById("theme-toggle");

const ws = new WebSocket(`ws://${window.location.host}/ws/chat`);

let botDiv = null;
let rawBuffer = "";
let renderInterval = null;

/* ======================
   WEBSOCKET STREAM
====================== */
ws.onmessage = (event) => {
    const token = event.data;

    if (token === "__END__") {
        renderMarkdown();
        stopRenderer();
        rawBuffer = "";
        botDiv = null;
        return;
    }

    rawBuffer += token;
};

/* ======================
   CHAT SUBMIT
====================== */
chatForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const message = userInput.value.trim();
    if (!message) return;

    addUserMessage(message);
    userInput.value = "";

    botDiv = document.createElement("div");
    botDiv.className = "bot-message markdown";
    botDiv.innerHTML = `<div class="content"></div>`;
    chatBox.appendChild(botDiv);

    rawBuffer = "";
    startRenderer();

    ws.send(message);
    scrollBottom();
});

/* ======================
   MARKDOWN RENDER
====================== */
function startRenderer() {
    renderInterval = setInterval(renderMarkdown, 60);
}

function stopRenderer() {
    clearInterval(renderInterval);
}

function renderMarkdown() {
    if (!botDiv) return;

    const contentDiv = botDiv.querySelector(".content");
    contentDiv.innerHTML = marked.parse(rawBuffer);
    scrollBottom();
}

/* ======================
   HELPERS
====================== */
function addUserMessage(message) {
    const div = document.createElement("div");
    div.className = "user-message";
    div.innerHTML = `<span>${message}</span>`;
    chatBox.appendChild(div);
}

function scrollBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

/* ======================
   DARK MODE
====================== */
toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    toggleBtn.textContent =
        document.body.classList.contains("dark") ? "☀️" : "🌙";
});
