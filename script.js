// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// --- Gemini API configuration (optional) ---
// To enable: set `USE_GEMINI = true`. For local testing you can set
// `GEMINI_API_KEY`, but do NOT embed secret API keys in client-side
// code for production. Prefer a server-side proxy to keep keys secret.
const USE_GEMINI = false; // set to true to call the Gemini (Generative Language) API
const GEMINI_API_KEY = 'AIzaSyCVbiA-h4XrwPgpGtBbDBOHsuLAwXKIp_w'; // <-- REMOVE any key from client-side code. Keep empty.
const GEMINI_MODEL = 'gemini-2.5-flash'; // change model if needed

// If `GEMINI_API_KEY` is empty and `USE_GEMINI` is true, the client will
// attempt to POST to a local proxy at `/api/gemini`. Implement that proxy
// server-side and keep your real key there.
if (USE_GEMINI && !GEMINI_API_KEY) {
    console.warn('USE_GEMINI is enabled but GEMINI_API_KEY is not set. The client will try /api/gemini proxy. Do NOT expose keys in client code.');
}

// Initialize
let messageId = 0;

// Auto-resize textarea
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Send message on Enter (Shift+Enter for new line)
messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Send button click
sendBtn.addEventListener('click', sendMessage);

// Send message function
function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (!messageText) return;

    // Create and display sent message
    addMessage(messageText, 'sent');
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Simulate response after a delay
    setTimeout(() => {
        // If Gemini usage is enabled and an API key is provided, call Gemini
        if (USE_GEMINI && GEMINI_API_KEY) {
            // show a temporary typing indicator
            const typingId = `typing-${Date.now()}`;
            addMessage('...', 'received');
            // call Gemini and replace the temporary message with the real reply
            queryGemini(messageText)
                .then(reply => {
                    // remove the last '...' message we added
                    const last = chatMessages.lastElementChild;
                    if (last && last.textContent === '...') {
                        chatMessages.removeChild(last);
                    }
                    addMessage(reply, 'received');
                })
                .catch(err => {
                    const last = chatMessages.lastElementChild;
                    if (last && last.textContent === '...') {
                        chatMessages.removeChild(last);
                    }
                    addMessage('Sorry, the bot encountered an error.', 'received');
                    console.error('Gemini request failed:', err);
                });
        } else {
            simulateResponse(messageText);
        }
    }, 1000 + Math.random() * 1000);
}

// Query Gemini / Generative Language API (basic POST wrapper)
async function queryGemini(userMessage) {
    // If a client-side API key is provided (NOT recommended for production),
    // call the official Generative Language API. Otherwise, attempt to call
    // a local server-side proxy at `/api/gemini` which should hold the key.
    if (GEMINI_API_KEY) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta2/${GEMINI_MODEL}:generate?key=${encodeURIComponent(GEMINI_API_KEY)}`;

        const body = {
            prompt: {
                text: userMessage
            },
            maxOutputTokens: 256
        };

        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`HTTP ${resp.status}: ${text}`);
        }

        const data = await resp.json();
        const candidate = data.candidates && data.candidates[0];
        if (candidate && (candidate.output || candidate.content)) {
            return candidate.output || candidate.content;
        }
        if (data.output) return data.output;
        if (data.result) return typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
        return 'I couldn\'t generate a response.';
    }

    // Proxy path: call server endpoint that wraps the real API key.
    // Expected proxy request/response (example):
    // POST /api/gemini { message: 'text', model: 'gemini-2.5-flash' }
    // Response: { reply: '...' }
    const proxyResp = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, model: GEMINI_MODEL })
    });

    if (!proxyResp.ok) {
        const text = await proxyResp.text();
        throw new Error(`Proxy error ${proxyResp.status}: ${text}`);
    }

    const proxyData = await proxyResp.json();
    if (proxyData.reply) return proxyData.reply;
    if (proxyData.error) throw new Error(proxyData.error);
    // Fallback to a stringified response if shape differs
    return typeof proxyData === 'string' ? proxyData : JSON.stringify(proxyData);
}

// Add message to chat
function addMessage(text, type = 'received') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.id = `message-${messageId++}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const messageText = document.createElement('p');
    messageText.textContent = text;
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = getCurrentTime();
    
    messageContent.appendChild(messageText);
    messageContent.appendChild(messageTime);
    messageDiv.appendChild(messageContent);
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Simulate bot response
function simulateResponse(userMessage) {
    const responses = [
        "That's interesting! Tell me more.",
        "I understand what you mean.",
        "Thanks for sharing that with me.",
        "That's a great point!",
        "I see, can you elaborate?",
        "That makes sense.",
        "Interesting perspective!",
        "Got it, anything else?",
    ];
    
    // Simple keyword-based responses
    const lowerMessage = userMessage.toLowerCase();
    let response;
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        response = "Hello! How can I help you today?";
    } else if (lowerMessage.includes('how are you')) {
        response = "I'm doing well, thank you for asking! How about you?";
    } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
        response = "Goodbye! Have a great day!";
    } else if (lowerMessage.includes('help')) {
        response = "I'm here to chat! Feel free to ask me anything or just have a conversation.";
    } else if (lowerMessage.includes('thank')) {
        response = "You're welcome! Is there anything else I can help with?";
    } else {
        response = responses[Math.floor(Math.random() * responses.length)];
    }
    
    addMessage(response, 'received');
}

// Get current time
function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Scroll to bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Header button actions
document.getElementById('minimizeBtn').addEventListener('click', () => {
    alert('Minimize feature - would minimize the chat window');
});

document.getElementById('maximizeBtn').addEventListener('click', () => {
    const container = document.querySelector('.chat-container');
    if (container.style.width === '100vw') {
        container.style.width = '';
        container.style.height = '';
        container.style.maxWidth = '';
        container.style.maxHeight = '';
    } else {
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.maxWidth = '100vw';
        container.style.maxHeight = '100vh';
        container.style.borderRadius = '0';
    }
});

document.getElementById('closeBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to close the chat?')) {
        alert('Close feature - would close the chat window');
    }
});

// Emoji button (placeholder)
document.getElementById('emojiBtn').addEventListener('click', () => {
    const emojis = ['😀', '😂', '😊', '❤️', '👍', '🎉', '🔥', '✨'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    messageInput.value += randomEmoji;
    messageInput.focus();
});

// Attach button (placeholder)
document.getElementById('attachBtn').addEventListener('click', () => {
    alert('File attachment feature - would open file picker');
});

// Focus input on load
messageInput.focus();

// Initial scroll to bottom
scrollToBottom();

