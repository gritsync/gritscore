// stripe.js: Handles Stripe Checkout redirection on upload

// Use a global variable STRIPE_PUBLISHABLE_KEY set in the HTML, or fallback to test key
const STRIPE_PUBLISHABLE_KEY = window.STRIPE_PUBLISHABLE_KEY || 'pk_live_REPLACE_WITH_YOUR_LIVE_KEY'; // Set this in your HTML for production
// Example in index.html or template:
// <script>window.STRIPE_PUBLISHABLE_KEY = 'pk_live_...';</script>

const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    if (!uploadForm) return;

    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(uploadForm);
        // Optionally: Validate file before proceeding
        const response = await fetch('/create-checkout-session', {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: formData
        });
        const data = await response.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            alert('Error creating Stripe Checkout session: ' + (data.error || 'Unknown error'));
        }
    });
});
