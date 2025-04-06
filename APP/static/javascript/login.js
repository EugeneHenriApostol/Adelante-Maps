// login.js

// toggle password visibility
function toggleVisibility(inputId, toggleButtonId) {
    const input = document.getElementById(inputId);
    const toggleButton = document.getElementById(toggleButtonId);
    const toggleIcon = toggleButton.querySelector("i");

    toggleButton.addEventListener("click", () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        toggleIcon.classList.toggle('fa-eye', !isPassword);
        toggleIcon.classList.toggle('fa-eye-slash', isPassword);
    });
}

toggleVisibility('password', 'toggle-password');

async function login(email, password) {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' ,
        },
        body: new URLSearchParams({ username: email, password: password }),
        credentials: 'include' // include cookies in the request
    });

    if (!response.ok) {
        alert('Login failed. Please check your credentials.');
        return;
    }

    const data = await response.json(); // get role id from response

    // redirect user based on their role id
    if (data.role_id === 2 || data.role_id === 3) {
        window.location.replace('/admin-dashboard'); 
    } else {
        window.location.replace('/maps');
    }
}

document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    await login(email, password);
});