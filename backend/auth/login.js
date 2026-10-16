import { supabase } from "../config/supabase.js";

const loginForm = document.getElementById("adminLoginForm");
const loginMessage = document.getElementById("loginMessage");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

export async function loginAdmin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error("Login error:", error);
        throw error;
    }

    return data;
}

function showLoginMessage(message, isError = false) {
    loginMessage.textContent = message;
    loginMessage.classList.toggle("login-message-error", isError);
    loginMessage.classList.toggle("login-message-success", !isError);
}

const loginParams = new URLSearchParams(window.location.search);

if (loginParams.has("error")) {
    showLoginMessage(
        loginParams.get("reason") ||
            "Sign-in succeeded, but administrator access could not be verified. Check your active admin profile or contact the administrator.",
        true
    );
}

togglePassword.addEventListener("click", () => {
    const isVisible = passwordInput.type === "text";

    passwordInput.type = isVisible ? "password" : "text";
    togglePassword.textContent = isVisible ? "Show" : "Hide";
    togglePassword.setAttribute("aria-pressed", String(!isVisible));
});

forgotPasswordBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();

    if (!email) {
        showLoginMessage("Enter your admin email address first.", true);
        document.getElementById("email").focus();
        return;
    }

    forgotPasswordBtn.disabled = true;
    showLoginMessage("Sending password reset link...");

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: new URL("./reset-password.html", window.location.href).href
        });

        if (error) {
            throw error;
        }

        showLoginMessage(
            "If an account exists for that email, a password reset link has been sent."
        );
    } catch (error) {
        console.error("Password reset request failed:", error);
        showLoginMessage(
            error.message || "Unable to send a password reset link. Please try again.",
            true
        );
    } finally {
        forgotPasswordBtn.disabled = false;
    }
});

loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const submitButton = loginForm.querySelector("button[type=submit]");

    submitButton.disabled = true;
    showLoginMessage("Signing in...");

    try {
        await loginAdmin(
            document.getElementById("email").value.trim(),
            document.getElementById("password").value
        );

        window.location.replace("./dashboard.html");
    } catch (error) {
        showLoginMessage(
            error.message || "Unable to sign in. Please try again.",
            true
        );
        submitButton.disabled = false;
    }
});