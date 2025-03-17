// reset-password.js

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    
    // Toggle eye icon
    const icon = event.currentTarget.querySelector('i');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
}

document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (!token) {
        alert("Invalid or expired link.");
        window.location.href = "/"; 
        return;
    }

    document.getElementById("resetForm").addEventListener("submit", async function (e) {
        e.preventDefault();
        
        const password = document.getElementById("new-password").value;
        const confirmPassword = document.getElementById("confirm-password").value;


        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        try {
            const response = await fetch("/api/reset-password", { 
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, new_password: password }),
            });

            const result = await response.json();
            if (response.ok) {
                alert("Password reset successful!");
                window.location.href = "/login";
            } else {
                alert(result.detail || "Error resetting password.");
            }
        } catch (error) {
            alert("Something went wrong.");
        }
    });
});