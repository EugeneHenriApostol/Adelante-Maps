document.addEventListener('DOMContentLoaded', function () {
    
    // DOM Elements
    const chatbotWidget = document.getElementById('chatbot-widget');
    const chatbotButton = document.getElementById('chatbot-widget-button');
    const closeButton = document.getElementById('close-chatbot');
    const minimizeButton = document.getElementById('minimize-chatbot');
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');

    // Check if all elements exist
    if (!chatbotWidget || !chatbotButton || !closeButton || !minimizeButton || !chatBox || !userInput || !sendButton) {
        console.error('One or more chatbot elements not found:', {
            chatbotWidget: !!chatbotWidget,
            chatbotButton: !!chatbotButton,
            closeButton: !!closeButton,
            minimizeButton: !!minimizeButton,
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

    // Function to scroll to the bottom of the chat box
    function scrollToBottom() {
        if (chatBox) {
            chatBox.scrollTop = chatBox.scrollHeight;
            console.log('Scrolled to bottom, height:', chatBox.scrollHeight);
        }
    }

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
        
        // Scroll to the bottom after adding a message
        setTimeout(scrollToBottom, 10);

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
        scrollToBottom();
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
    
    // Function to toggle minimize state
    function toggleMinimize() {
        console.log('Toggling minimize state');
        chatbotWidget.classList.toggle('minimized');
        
        if (chatbotWidget.classList.contains('minimized')) {
            minimizeButton.textContent = '+';
            minimizeButton.title = 'Maximize';
        } else {
            minimizeButton.textContent = '–';
            minimizeButton.title = 'Minimize';
            // When maximizing, scroll to bottom
            setTimeout(scrollToBottom, 100);
        }
    }
    
    // Function to show chatbot
    function showChatbot() {
        console.log('Showing chatbot');
        chatbotWidget.style.display = 'flex';
        chatbotWidget.classList.remove('minimized');
        minimizeButton.textContent = '–';
        minimizeButton.title = 'Minimize';
        
        // Initialize chat if needed
        initializeChat();
        
        // Focus on input field
        setTimeout(() => {
            userInput.focus();
            scrollToBottom();
        }, 100);
    }
    
    // Function to hide chatbot
    function hideChatbot() {
        console.log('Hiding chatbot');
        chatbotWidget.style.display = 'none';
        // Save chat history
        localStorage.setItem('adelanteChatHistory', JSON.stringify(chatHistory));
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
        scrollToBottom();
    }
    
    // initialize chat on page load
    function initializeChat() {
        // Only initialize if not already initialized
        if (chatBox.children.length === 0) {
            // Load existing chat history
            const existingHistory = loadChatHistory();

            // Clear existing chat box content
            chatBox.innerHTML = '';

            // Render existing messages
            existingHistory.forEach(msg => addMessage(msg));

            // If no messages, show welcome message
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
    }

    // Event Listeners
    chatbotButton.addEventListener('click', function(e) {
        console.log('Chatbot button clicked');
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        
        // Always ensure the button is visible
        chatbotButton.style.display = 'flex';
        
        if (chatbotWidget.style.display === 'none' || !chatbotWidget.style.display) {
            showChatbot();
        } else {
            hideChatbot();
        }
    });

    closeButton.addEventListener('click', function(e) {
        console.log('Close button clicked');
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        hideChatbot();
        
        // Ensure the button is visible
        chatbotButton.style.display = 'flex';
    });
    
    minimizeButton.addEventListener('click', function(e) {
        console.log('Minimize button clicked');
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        toggleMinimize();
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
    
    // Prevent clicks inside the chatbot from closing it
    chatbotWidget.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // initialize chatbot
    chatbotWidget.style.display = 'none';
    
    // Ensure the button is always visible
    chatbotButton.style.display = 'flex';
    
    // Handle window events to ensure button visibility
    window.addEventListener('click', function() {
        // Always ensure the button is visible
        chatbotButton.style.display = 'flex';
    });
    
    // Prevent the button from being hidden
    setInterval(function() {
        if (chatbotButton.style.display !== 'flex') {
            chatbotButton.style.display = 'flex';
        }
    }, 500);
    
    // Add event listener for window resize to ensure proper scrolling
    window.addEventListener('resize', function() {
        if (chatbotWidget.style.display !== 'none') {
            setTimeout(scrollToBottom, 100);
        }
    });
    
    // MutationObserver to watch for changes in the chat box and scroll to bottom
    const observer = new MutationObserver(function(mutations) {
        scrollToBottom();
    });
    
    observer.observe(chatBox, { 
        childList: true,
        subtree: true,
        characterData: true
    });
    
    // debug logging
    console.log('Chatbot initialized');
});