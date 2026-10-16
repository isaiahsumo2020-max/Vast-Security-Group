import { getApiBaseUrl } from "../../backend/config/apiUrl.js";
import {
    SUPABASE_ANON_KEY
} from "../../backend/config/supabase.js";

const emailJs = window.emailjs;
emailJs.init("rkCLqh0qBH5FOCEzN");

const form = document.getElementById("contactForm");
const sendButton = document.getElementById("sendBtn");
const status = document.getElementById("formStatus");

form.addEventListener("submit", async event => {
    event.preventDefault();
    sendButton.disabled = true;
    sendButton.textContent = "Sending…";
    status.textContent = "";
    status.className = "";

    const params = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        subject: document.getElementById("subject").value.trim(),
        message: document.getElementById("message").value.trim()
    };

    try {
        const functionUrl = new URL(getApiBaseUrl());
        functionUrl.searchParams.set("path", "/contact-messages");
        const response = await fetch(functionUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: SUPABASE_ANON_KEY
            },
            body: JSON.stringify(params)
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to save your message.");
        }

        form.reset();
        try {
            await emailJs.send(
                "service_hg3tg9p",
                "template_1y973wc",
                params
            );
            status.textContent = "Your message has been received and sent to our team.";
        } catch (error) {
            console.error("Message was saved, but the email notification failed:", error);
            status.textContent = "Your message was received. The email notification could not be sent, but your inquiry is saved.";
        }
        status.className = "success";
    } catch (error) {
        console.error("Unable to submit contact message:", error);
        status.textContent = error.message || "Failed to send your message. Please try again.";
        status.className = "error";
    } finally {
        sendButton.disabled = false;
        sendButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>Send Message</span>';
    }
});