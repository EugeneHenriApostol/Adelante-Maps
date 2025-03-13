// chatbot.js
let history = [];

document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value;

    if (!message.trim()) return;

    // Display the user message
    displayMessage(message, 'user');

    // Add the user's message to history
    history.push(`User: ${message}`);

    // Clear input field
    userInput.value = '';

    // Send the message to the backend
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message, history }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        // Display the bot response
        displayMessage(data.answer, 'bot');

        // Add the bot's response to history
        history.push(`Bot: ${data.answer}`);
    } catch (error) {
        console.error('Error:', error);
        displayMessage("I'm sorry, there was an error processing your request.", 'bot');
    }
}

function displayMessage(message, sender) {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    messageDiv.innerHTML = `<p>${message}</p>`;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to the latest message
}