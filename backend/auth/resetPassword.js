import { supabase } from "../config/supabase.js";

const resetPasswordForm = document.getElementById("resetPasswordForm");
const resetPasswordMessage = document.getElementById("resetPasswordMessage");
const resetPasswordBtn = document.getElementById("resetPasswordBtn");

function showMessage(message, isError = false) {
    resetPasswordMessage.textContent = message;
    resetPasswordMessage.classList.toggle("login-message-error", isError);
    resetPasswordMessage.classList.toggle("login-message-success", !isError);
}

async function checkRecoverySession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
        console.error("Password recovery session check failed:", error);
        showMessage(error.message, true);
        resetPasswordBtn.disabled = true;
        return;
    }

    if (!data.session) {
        showMessage(
            "This password reset link is invalid or has expired. Request a new one from the sign-in page.",
            true
        );
        resetPasswordBtn.disabled = true;
    }
}

resetPasswordForm.addEventListener("submit", async event => {
    event.preventDefault();

    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword !== confirmPassword) {
        showMessage("The passwords do not match.", true);
        return;
    }

    resetPasswordBtn.disabled = true;
    showMessage("Updating password...");

    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            throw error;
        }

        resetPasswordForm.reset();

        const { error: signOutError } = await supabase.auth.signOut();

        if (signOutError) {
            console.error("Unable to end password recovery session:", signOutError);
            showMessage(
                "Password updated, but the recovery session could not be ended. Close this page, then sign in with your new password.",
                true
            );
            return;
        }

        showMessage("Password updated. Return to admin sign in.");
    } catch (error) {
        console.error("Password update failed:", error);
        showMessage(
            error.message || "Unable to update password. Request a new reset link and try again.",
            true
        );
    } finally {
        resetPasswordBtn.disabled = false;
    }
});

checkRecoverySession();
