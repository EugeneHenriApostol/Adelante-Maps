// register.js

const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm_password');
const passwordMatchMessage = document.getElementById('password-match');

// confirm password check
confirmPasswordInput.addEventListener('input', () => {
    const passwordsMatch = confirmPasswordInput.value === passwordInput.value;
    passwordMatchMessage.classList.toggle("hidden", passwordsMatch);
});

confirmPasswordInput.addEventListener("blur", () => {
    if (confirmPasswordInput.value && !passwordMatchMessage.classList.toggle("hidden")) {
        passwordMatchMessage.textContent = "Password do not match!";
    }
});

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
        errorElement.className = "text-xs mt-1 text-red-600";
        errorElement.textContent = message;
    }
    return errorElement;
};

// real time validation functions
const validateName = (input, id, fieldName) => {
    const nameRegex = /^[A-Z][a-z]*(\s[A-Z][a-z]*)*$/;
    const errorElement = createErrorElement(id, `${fieldName} must start with a capital letter`);
    if (!nameRegex.test(input.value.trim())) {
        input.parentElement.appendChild(errorElement);
        return false;
    } else {
        const existingError = document.getElementById(id);
        if (existingError) existingError.remove();
        return true;
    }
};

// real time validation with server check
emailInput.addEventListener("blur", async () => {
    const emailValue = emailValue.input.trim();
    const emailErrorId = "email-exists-error";
    const errorElement = createErrorElement(emailErrorId, "This email is already registered.");

    if (emailValue === "") // skip if email is already empty

    try {
        const response = await fetch(`/api/check/email?email=${encodeURIComponent(emailValue)}`);
        const data = await response.json();

        // check to response to check if email already exists
        if (response.ok && data.exists) {
            emailInput.parentElement.appendChild(errorElement);
        } else {
            const existingError = document.getElementById(emailErrorId);
            if (existingError) existingError.remove();
        }
    } catch (error) {
        console.error("Error checking email: ", error);
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

document.getElementById("registerForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const firstNameValid = validateName(firstNameInput, "first-name-error", "First Name");
    const lastNameValid = validateName(lastNameInput, "last-name-error", "Last Name");

    if (!firstNameValid || !lastNameValid) {
        alert("Please fix the errors in the form before submitting.");
        return;
    }

    // check if email is already registered
    const formData = {
        fist_name: firstNameInput.value.trim(),
        last_name: lastNameInput.value.trim(),
        email: emailInput.value.trim(),
        password: document.getElementById("password").value,
    };

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const data = await response.json(); // get the json response
            const token = data.token; // extract the token
            localStorage.setItem("registered", "true");

            if (token) {
                window.location.href = `/verify-email?token=${token}`;
            } else {
                alert("No verification token received.");
            }
        } else {
            const errorData = await response.json();
            if(errorData.detail === "Email already registered") {
                const emailError = createErrorElement("email-exists-error", "This email is already registered.");
                emailInput.parentElement.appendChild(emailError);
            } else {
                alert(errorData.detail || 'Registration failed. Please try again.');
            }
        }
    } catch (error){
        console.error('Error occurred during registration', error);
        alert('An error occurred during registration. Please try again.');
    }
});