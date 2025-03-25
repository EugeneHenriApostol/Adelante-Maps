document.addEventListener('DOMContentLoaded', function () {
    
    // DOM Elements
    const chatbotWidget = document.getElementById('chatbot-widget');
    const chatbotButton = document.getElementById('chatbot-widget-button');
    const closeButton = document.getElementById('close-chatbot');
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');
    const storedChatHistory = localStorage.getItem('adelanteChatHistory');

    // Check if all elements exist
    if (!chatbotWidget || !chatbotButton || !closeButton || !chatBox || !userInput || !sendButton) {
        console.error('One or more chatbot elements not found:', {
            chatbotWidget: !!chatbotWidget,
            chatbotButton: !!chatbotButton,
            closeButton: !!closeButton,
            chatBox: !!chatBox,
            userInput: !!userInput,
            sendButton: !!sendButton
        });
        return;
    }

    let chatHistory = [];

    if (storedChatHistory) {
        try {
            const parsedHistory = JSON.parse(storedChatHistory);
            
            // Validate and convert history if needed
            chatHistory = parsedHistory.map(item => {
                // If item is a string, convert to object
                if (typeof item === 'string') {
                    return { 
                        text: item, 
                        sender: chatHistory.length % 2 === 0 ? 'user' : 'bot' 
                    };
                }
                return item;
            });

            // Render messages from history
            chatHistory.forEach(msg => {
                if (msg.text) {  // Ensure message has content
                    addMessage(msg);
                }
            });
        } catch (error) {
            console.error("Error parsing chat history:", error);
            localStorage.removeItem('adelanteChatHistory');
            chatHistory = [];
        }
    }


    console.log('All chatbot elements found');

    const welcomeMessage = {
        text: "Hello! I'm your Adelante Maps Assistant. How can I help you today?",
        sender: 'bot'
    };

    // function to add message to chat box
    function addMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', message.sender);
        
        // create message content
        const contentElement = document.createElement('div');
        contentElement.classList.add('content');
        contentElement.innerHTML = message.text;
        
        // add timestamp
        const timestamp = document.createElement('div');
        timestamp.classList.add('timestamp');
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        timestamp.textContent = `${hours}:${minutes}`;
        
        messageElement.appendChild(contentElement);
        messageElement.appendChild(timestamp);
        
        chatBox.appendChild(messageElement);
        
        // scroll to the bottom after adding a message
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    async function processUserInput(input) {
        const processedInput = input.trim();
        
        addMessage({ text: processedInput, sender: 'user' });

        showTypingIndicator();

        try {
            const cleanedHistory = (chatHistory || []).filter(item => typeof item === "string");

            const response = await fetch("/maps/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: processedInput, history: cleanedHistory }) // Ensure history contains only strings
            });

            const data = await response.json();

            hideTypingIndicator();

            addMessage({ text: data.response || "Sorry, I couldn't retrieve an answer.", sender: 'bot' });

            chatHistory.push(processedInput);  // Store user input
            chatHistory.push(data.response);   // Store bot response

        } catch (error) {
            console.error("Error fetching response:", error);
            hideTypingIndicator();
            addMessage({ text: "Oops! Something went wrong. Please try again.", sender: 'bot' });
        }
    }


    
    // function to show typing indicator
    function showTypingIndicator() {
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'bot', 'typing-indicator');
        typingIndicator.innerHTML = '<div class="dots"><span></span><span></span><span></span></div>';
        typingIndicator.id = 'typing-indicator';
        chatBox.appendChild(typingIndicator);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    
    // function to hide typing indicator
    function hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    // function to handle user input submission
    function handleSubmit() {
        const message = userInput.value.trim();
        if (message) {
            processUserInput(message);
            userInput.value = '';
        }
    }
    
    // function to toggle chatbot visibility
    function toggleChatbot() {
        console.log('Toggling chatbot visibility');
        
        // toggle visibility using inline styles
        if (chatbotWidget.style.display === 'none' || !chatbotWidget.style.display) {
            chatbotWidget.style.display = 'flex';
            console.log('Showing chatbot');
            console.log('Chatbot should now be visible');
            
            // if opening the widget and no messages yet, add welcome message
            if (chatBox.children.length === 0) {
                addMessage(welcomeMessage);
                addSuggestions();
            }
            
            // focus on input field
            setTimeout(() => {
                userInput.focus();
            }, 100);
        } else {
            chatbotWidget.style.display = 'none';
            console.log('Hiding chatbot');
        }
    }
    
    // ensures that chatbox defaults to the bottom of the chat box upon initializing
    chatbotButton.addEventListener('click', function () {
        chatbotWidget.style.display = 'flex';
    });

    closeButton.addEventListener('click', function(e) {
        console.log('Close button clicked');
        e.preventDefault();
        e.stopPropagation();

        localStorage.setItem('adelanteChatHistory', JSON.stringify(chatHistory));  // ✅ Store JSON properly
        chatbotWidget.style.display = 'none';
    });


    
    sendButton.addEventListener('click', function(e) {
        e.preventDefault();
        handleSubmit();
    });
    
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    });
    
    // prevent clicks inside the chatbot from closing it
    chatbotWidget.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // suggestions functionality
    function addSuggestions() {
        const suggestions = [
            "How do I use filters?",
            "What are clusters?",
            "Help me with data analytics",
            "Explain the geospatial tool"
        ];
        
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.classList.add('suggestions');
        
        suggestions.forEach(suggestion => {
            const suggestionButton = document.createElement('button');
            suggestionButton.classList.add('suggestion-btn');
            suggestionButton.textContent = suggestion;
            
            suggestionButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                userInput.value = suggestion;
                handleSubmit();
            });
            
            suggestionsContainer.appendChild(suggestionButton);
        });
        
        chatBox.appendChild(suggestionsContainer);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    
    // initialize chatbot
    chatbotWidget.style.display = 'none';
    
    
    // debug logging
    console.log('Chatbot initialized');
});