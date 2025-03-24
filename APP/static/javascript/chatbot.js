document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatbotWidget = document.getElementById('chatbot-widget');
    const chatbotButton = document.getElementById('chatbot-widget-button');
    const closeButton = document.getElementById('close-chatbot');
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');

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

    console.log('All chatbot elements found');

    // Initial welcome message
    const welcomeMessage = {
        text: "Hello! I'm your Adelante Maps Assistant. How can I help you today?",
        sender: 'bot'
    };

    // Predefined responses for common questions
    const predefinedResponses = {
        'help': "I can help you with:<br>- Finding locations on the map<br>- Explaining filter options<br>- Information about clusters<br>- Data analytics features<br>- Using the geospatial event tool",
        'filter': "You can use the Filter Controls to narrow down data by strand, course, previous school, year level, and age. Click the 'Filter Controls' button in the navbar to access these options.",
        'cluster': "Clusters group students based on location. You can view Senior High or College clusters by address or proximity from the Clusters dropdown menu.",
        'data': "The Data Analytics section provides visualizations for Senior High and College data. Access these from the Data Analytics dropdown in the navbar.",
        'event': "The Geospatial Event Tool allows you to mark areas affected by events like floods or strikes. Click the tool icon in the navbar to activate it.",
        'radius': "You can adjust the circle radius using the slider in the navbar. This affects the area of influence for proximity calculations.",
        'map': "The map displays student locations and various data points. You can interact with it by clicking on markers or using the controls in the navbar.",
        'location': "You can find specific locations by using the search feature or by manually navigating the map.",
        'marker': "Markers on the map represent students or points of interest. Different colors may indicate different categories.",
        'search': "You can search for specific locations or students using the search bar at the top of the map.",
        'zoom': "Use the + and - buttons on the map, or your mouse wheel, to zoom in and out.",
        'export': "You can export data by using the export options in the Data Analytics section.",
        'report': "Event reports can be accessed by clicking on the 'Event Reports' link in the navbar.",
        'login': "You can log in by clicking the user icon in the top right corner.",
        'logout': "To log out, click on the user icon in the top right corner and select 'Logout' from the dropdown menu.",
        'profile': "You can edit your profile by clicking the user icon and selecting 'Edit Profile'.",
        'app': "This app helps you visualize and analyze student data on a map. You can use filters to narrow down data, view clusters of students, and analyze data through various visualizations."
    };

    // Function to add a message to the chat box
    function addMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', message.sender);
        
        // Create message content
        const contentElement = document.createElement('div');
        contentElement.classList.add('content');
        contentElement.innerHTML = message.text;
        
        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.classList.add('timestamp');
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        timestamp.textContent = `${hours}:${minutes}`;
        
        // Assemble message
        messageElement.appendChild(contentElement);
        messageElement.appendChild(timestamp);
        
        // Add to chat box
        chatBox.appendChild(messageElement);
        
        // Scroll to the bottom
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Function to process user input and generate a response
    async function processUserInput(input) {
        // Trim and lowercase the input for easier matching
        const processedInput = input.trim().toLowerCase();
        
        // Add user message to chat
        addMessage({
            text: input,
            sender: 'user'
        });
        
        // Show typing indicator
        showTypingIndicator();
        
        // Simulate processing delay for a more natural feel
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Remove typing indicator
        hideTypingIndicator();
        
        // Generate response based on input
        let response = "I'm not sure how to help with that specific question. You can ask me about using the map, filters, clusters, data analytics, or the geospatial event tool.";
        
        // Check for predefined responses
        for (const [keyword, reply] of Object.entries(predefinedResponses)) {
            if (processedInput.includes(keyword)) {
                response = reply;
                break;
            }
        }
        
        // Special case for general help or app usage
        if (processedInput === 'help' || processedInput.includes('what can you do')) {
            response = predefinedResponses['help'];
        } else if (processedInput.includes('how to use') || processedInput.includes('how do i use')) {
            response = predefinedResponses['app'];
        }
        
        // Add bot response to chat
        addMessage({
            text: response,
            sender: 'bot'
        });
    }
    
    // Function to show typing indicator
    function showTypingIndicator() {
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'bot', 'typing-indicator');
        typingIndicator.innerHTML = '<div class="dots"><span></span><span></span><span></span></div>';
        typingIndicator.id = 'typing-indicator';
        chatBox.appendChild(typingIndicator);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    
    // Function to hide typing indicator
    function hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    // Function to handle user input submission
    function handleSubmit() {
        const message = userInput.value.trim();
        if (message) {
            processUserInput(message);
            userInput.value = '';
        }
    }
    
    // Function to toggle chatbot visibility
    function toggleChatbot() {
        console.log('Toggling chatbot visibility');
        
        // Toggle visibility using inline styles
        if (chatbotWidget.style.display === 'none' || !chatbotWidget.style.display) {
            chatbotWidget.style.display = 'flex';
            console.log('Showing chatbot');
            console.log('Chatbot should now be visible');
            
            // If opening the widget and no messages yet, add welcome message
            if (chatBox.children.length === 0) {
                addMessage(welcomeMessage);
                addSuggestions();
            }
            
            // Focus on input field
            setTimeout(() => {
                userInput.focus();
            }, 100);
        } else {
            chatbotWidget.style.display = 'none';
            console.log('Hiding chatbot');
        }
    }
    
    // Event Listeners
    chatbotButton.addEventListener('click', function(e) {
        console.log('Chatbot button clicked');
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        toggleChatbot();
    });
    
    closeButton.addEventListener('click', function(e) {
        console.log('Close button clicked');
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        chatbotWidget.style.display = 'none';
        // Save chat history
        localStorage.setItem('adelanteChatHistory', chatBox.innerHTML);
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
    
    // Suggestions functionality
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
    
    // Initialize chatbot
    // Hide chatbot widget initially using inline style
    chatbotWidget.style.display = 'none';
    
    // Load chat history if available
    const chatHistory = localStorage.getItem('adelanteChatHistory');
    if (chatHistory) {
        chatBox.innerHTML = chatHistory;
    }
    
    // Clear chat history function
    window.clearChatHistory = function() {
        chatBox.innerHTML = '';
        localStorage.removeItem('adelanteChatHistory');
        addMessage(welcomeMessage);
        addSuggestions();
    };
    
    // Debug logging
    console.log('Chatbot initialized');
});