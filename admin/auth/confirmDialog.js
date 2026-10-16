let dialogQueue = Promise.resolve();

function showConfirmation({
    title = "Confirm action",
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    destructive = false
}) {
    return new Promise(resolve => {
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        const backdrop = document.createElement("div");
        backdrop.className = "action-confirm-backdrop";
        backdrop.innerHTML = `
            <section class="action-confirm-dialog" role="alertdialog" aria-modal="true">
                <h2 class="action-confirm-title"></h2>
                <p class="action-confirm-message"></p>
                <div class="action-confirm-buttons">
                    <button type="button" class="action-confirm-cancel"></button>
                    <button type="button" class="action-confirm-accept"></button>
                </div>
            </section>
        `;

        const dialog = backdrop.querySelector(".action-confirm-dialog");
        const titleElement = backdrop.querySelector(".action-confirm-title");
        const messageElement = backdrop.querySelector(".action-confirm-message");
        const cancelButton = backdrop.querySelector(".action-confirm-cancel");
        const confirmButton = backdrop.querySelector(".action-confirm-accept");

        titleElement.textContent = title;
        messageElement.textContent = message;
        cancelButton.textContent = cancelLabel;
        confirmButton.textContent = confirmLabel;
        confirmButton.classList.toggle("is-destructive", destructive);
        dialog.setAttribute("aria-labelledby", "action-confirm-title");
        dialog.setAttribute("aria-describedby", "action-confirm-message");
        titleElement.id = "action-confirm-title";
        messageElement.id = "action-confirm-message";

        let settled = false;
        const finish = confirmed => {
            if (settled) {
                return;
            }
            settled = true;
            document.removeEventListener("keydown", handleKeydown);
            backdrop.remove();
            document.body.style.overflow = previousOverflow;
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
                previousFocus.focus();
            }
            resolve(confirmed);
        };

        const handleKeydown = event => {
            if (event.key === "Escape") {
                event.preventDefault();
                finish(false);
                return;
            }

            if (event.key !== "Tab") {
                return;
            }

            const focusable = [cancelButton, confirmButton];
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        cancelButton.addEventListener("click", () => finish(false));
        confirmButton.addEventListener("click", () => finish(true));
        backdrop.addEventListener("click", event => {
            if (event.target === backdrop) {
                finish(false);
            }
        });
        document.addEventListener("keydown", handleKeydown);
        document.body.appendChild(backdrop);
        document.body.style.overflow = "hidden";
        cancelButton.focus();
    });
}

export function confirmAction(options) {
    const request = dialogQueue.then(() => showConfirmation(options));
    dialogQueue = request.then(
        () => undefined,
        () => undefined
    );
    return request;
}
