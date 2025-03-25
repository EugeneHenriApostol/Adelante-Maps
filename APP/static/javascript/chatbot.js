document.addEventListener('DOMContentLoaded', function () {
    
    // DOM Elements
    const chatbotWidget = document.getElementById('chatbot-widget');
    const chatbotButton = document.getElementById('chatbot-widget-button');
    const closeButton = document.getElementById('close-chatbot');
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');

    // check if all elements exist
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
    function loadChatHistory() {
        const storedChatHistory = localStorage.getItem('adelanteChatHistory');
        
        if (storedChatHistory) {
            try {
                const parsedHistory = JSON.parse(storedChatHistory);
                
                // validate and ensure all messages have necessary properties
                chatHistory = parsedHistory.map(msg => {
                    // if message is missing timestamp, add current timestamp
                    if (!msg.timestamp) {
                        msg.timestamp = new Date().toISOString();
                    }
                    
                    // ensure all required fields exist
                    return {
                        text: msg.text || '',
                        sender: msg.sender || 'bot',
                        timestamp: msg.timestamp
                    };
                }).filter(msg => msg.text);

                return chatHistory;
            } catch (error) {
                console.error("Error parsing chat history:", error);
                localStorage.removeItem('adelanteChatHistory');
                return [];
            }
        }
        return [];
    }

    console.log('All chatbot elements found');

    // function to add message to chat box
    function addMessage(message) {
        // ensure message has a timestamp
        const messageToAdd = {
            ...message,
            timestamp: message.timestamp || new Date().toISOString()
        };

        const messageElement = document.createElement('div');
        messageElement.classList.add('message', messageToAdd.sender);
        
        // create message content
        const contentElement = document.createElement('div');
        contentElement.classList.add('content');
        contentElement.innerHTML = messageToAdd.text;
        
        // format timestamp
        const timestamp = document.createElement('div');
        timestamp.classList.add('timestamp');
        const date = new Date(messageToAdd.timestamp);
        const hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        timestamp.textContent = `${hours}:${minutes}`;
        
        messageElement.appendChild(contentElement);
        messageElement.appendChild(timestamp);
        
        chatBox.appendChild(messageElement);
        
        // scroll to the bottom
        chatBox.scrollTop = chatBox.scrollHeight;

        return messageToAdd;
    }

    async function processUserInput(input) {
        const processedInput = input.trim();
        
        // add user message with current timestamp
        const userMessage = addMessage({ 
            text: processedInput, 
            sender: 'user',
            timestamp: new Date().toISOString()
        });

        // add to chat history
        chatHistory.push(userMessage);

        showTypingIndicator();

        try {
            const response = await fetch("/maps/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    message: processedInput, 
                    history: chatHistory.map(msg => ({
                        text: msg.text,
                        sender: msg.sender,
                        timestamp: msg.timestamp
                    }))
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                throw new Error(`Server responded with ${response.status}: ${errorText}`);
            }

            const data = await response.json();

            hideTypingIndicator();

            const botResponse = data.response || "Sorry, I couldn't retrieve an answer.";
            
            // add bot message with current timestamp
            const botMessage = addMessage({ 
                text: botResponse, 
                sender: 'bot',
                timestamp: new Date().toISOString()
            });

            // add to chat history
            chatHistory.push(botMessage);

            // update localStorage with complete chat history
            localStorage.setItem('adelanteChatHistory', JSON.stringify(chatHistory));

        } catch (error) {
            console.error("Error fetching response:", error);
            hideTypingIndicator();
            
            const errorMessage = addMessage({ 
                text: `Error: ${error.message}`, 
                sender: 'bot',
                timestamp: new Date().toISOString()
            });

            chatHistory.push(errorMessage);
            localStorage.setItem('adelanteChatHistory', JSON.stringify(chatHistory));
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
            
            // if opening the widget and no messages yet, add welcome message
            if (chatBox.children.length === 0) {
                initializeChat();
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
    
    // initialize chat on page load
    function initializeChat() {
        // load existing chat history
        const existingHistory = loadChatHistory();

        // clear existing chat box content
        chatBox.innerHTML = '';

        // render existing messages
        existingHistory.forEach(msg => addMessage(msg));

        // if no messages, show welcome message
        if (existingHistory.length === 0) {
            const welcomeMessage = {
                text: "Hello! I'm your Adelante Maps Assistant. How can I help you today?",
                sender: 'bot',
                timestamp: new Date().toISOString()
            };
            addMessage(welcomeMessage);
            chatHistory.push(welcomeMessage);
            addSuggestions();
        }
    }

    // event Listeners
    chatbotButton.addEventListener('click', function () {
        chatbotWidget.style.display = 'flex';
        initializeChat();
    });

    // submits chat
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
    
    closeButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        localStorage.setItem('adelanteChatHistory', JSON.stringify(chatHistory));
        chatbotWidget.style.display = 'none';
    });
    
    // prevent clicks inside the chatbot from closing it
    chatbotWidget.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // initialize chatbot
    chatbotWidget.style.display = 'none';
    
    // initialize chatbot when DOM is loaded
    initializeChat();
    
    // debug logging
    console.log('Chatbot initialized');
});