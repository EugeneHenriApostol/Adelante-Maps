// register.js

const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm_password');
const passwordMatchMessage = document.getElementById('password-match');

// confirm password check
confirmPasswordInput.addEventListener('input', () => {
    const passwordsMatch = confirmPasswordInput.value === passwordInput.value;
    passwordMatchMessage.classList.toggle("hidden", passwordsMatch);
    passwordMatchMessage.style.position = "absolute"; // Ensure it doesn’t push content
});


if (confirmPasswordInput.value && confirmPasswordInput.value !== passwordInput.value) {
    passwordMatchMessage.textContent = "Passwords do not match!";
    passwordMatchMessage.classList.remove("hidden");
} else {
    passwordMatchMessage.classList.add("hidden");
}

// real time input validation
const registerForm = document.getElementById("registerForm");
const firstNameInput = document.getElementById("first_name");
const lastNameInput = document.getElementById("last_name");
const emailInput = document.getElementById("email");

// error message
const createErrorElement = (id, message) => {
    let errorElement = document.getElementById(id);
    if (!errorElement) {
        errorElement = document.createElement("p");
        errorElement.id = id;
        errorElement.className = "error-message"; 
        errorElement.textContent = message;
        errorElement.style.marginTop = "0"; 
    }
    return errorElement;
};


// real time name validation 
const validateName = (input, id, fieldName) => {
    const nameRegex = /^[A-Z][a-z]*(\s[A-Z][a-z]*)*$/;
    const errorElement = createErrorElement(id, `${fieldName} must start with a capital letter`);
    const value = input.value.trim();

    // Don't show error if the field is empty
    if (value === "") {
        const existingError = document.getElementById(id);
        if (existingError) existingError.remove();
        return true; 
    }

    if (!nameRegex.test(value)) {
        input.parentElement.appendChild(errorElement);
        return false;
    } else {
        const existingError = document.getElementById(id);
        if (existingError) existingError.remove();
        return true;
    }
};


// real time email validation with server check
emailInput.addEventListener("blur", async () => {
    const emailValue = emailInput.value.trim();
    const emailErrorId = "email-exists-error";
    const errorElement = createErrorElement(emailErrorId, "This email is already registered.");

    if (emailValue === "") return; // skip check if email is empty

    try {
        const response = await fetch(`/api/check-email?email=${encodeURIComponent(emailValue)}`);
        if (!response.ok) {
            console.error("Error checking email:", response.statusText);
            return;
        }

        const data = await response.json();
        const existingError = document.getElementById(emailErrorId);

        if (data.exists) {
            if (!existingError) {
                emailInput.parentElement.appendChild(errorElement);
            }
        } else {
            if (existingError) existingError.remove();
        }
    } catch (error) {
        console.error("Error checking email:", error);
    }
});

// toggle password visibility
function toggleVisibility(inputId, toggleButtonId) {
    const input = document.getElementById(inputId);
    const toggleButton = document.getElementById(toggleButtonId);
    const toggleIcon = toggleButton.querySelector("i");

    toggleButton.addEventListener("click", () => {
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        toggleIcon.classList.toggle("fa-eye", !isPassword);
        toggleIcon.classList.toggle("fa-eye-slash", isPassword);
    });
};

toggleVisibility("password", "toggle-password");
toggleVisibility("confirm_password", "toggle-confirm-password");

// real time input event listeners
firstNameInput.addEventListener("blur", () => validateName(firstNameInput, "first-name-error", "First Name"));
lastNameInput.addEventListener("blur", () => validateName(lastNameInput, "last-name-error", "Last Name"));

// email validation function
function validateEmail() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailErrorId = "email-format-error";
    const errorElement = createErrorElement(emailErrorId, "Invalid email format.");

    if (!emailRegex.test(emailInput.value.trim())) {
        emailInput.parentElement.appendChild(errorElement);
        return false;
    } else {
        const existingError = document.getElementById(emailErrorId);
        if (existingError) existingError.remove();
        return true;
    }
}

// modal function to show error
function showErrorModal(message) {
    const modal = document.getElementById("errorModal");
    const errorMessage = document.getElementById("errorMessage");
    const closeModal = document.getElementById("closeErrorModal");

    errorMessage.textContent = message;
    modal.classList.remove("hidden");

    closeModal.addEventListener("click", () => {
        modal.classList.add("hidden");
    });
}

document.getElementById("registerForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const firstNameValid = validateName(firstNameInput, "first-name-error", "First Name");
    const lastNameValid = validateName(lastNameInput, "last-name-error", "Last Name");
    const emailValid = validateEmail();
    
    // check password match
    const passwordsMatch = passwordInput.value === confirmPasswordInput.value;
    if (!passwordsMatch) {
        passwordMatchMessage.textContent = "Passwords do not match!";
        passwordMatchMessage.classList.remove("hidden");
    } else {
        passwordMatchMessage.classList.add("hidden");
    }

    if (!firstNameValid || !lastNameValid || !emailValid || !passwordsMatch) {
        showErrorModal("Please fix the errors in the form before submitting.");
        return;
    }

    // check if email is already registered
    const formData = {
        first_name: document.getElementById("first_name").value,
        last_name: document.getElementById("last_name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value
    };

    console.log("Sending data:", formData);  // check if data matches API schema

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            document.getElementById("emailModal").classList.remove("hidden"); // show modal

            document.getElementById("closeModal").addEventListener("click", () => {
                window.location.href = "/login"; // redirect after closing modal
            });
        } else {
            const errorData = await response.json();
            if (errorData.detail === "Email already registered") {
                const emailError = createErrorElement("email-exists-error", "This email is already registered.");
                emailInput.parentElement.appendChild(emailError);
            }
        }
    } catch (error) {
        console.error("Registration error:", error);
    }
});