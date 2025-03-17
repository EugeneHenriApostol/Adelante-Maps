// forgot-password.js

document.getElementById('forgotPasswordForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const emailInput = document.getElementById('email');
    const email = emailInput.value.trim();
    
    if (!email) {
        alert('Please enter your email.');
        return;
    }
    
    try {
        const response = await fetch('/api/request-password-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to send reset link. Please try again.');
        }
        
        alert('A password reset link has been sent to your email.');
        window.location.href = '/login';
    } catch (error) {
        alert(error.message);
    }
});