import { apiRequest } from "../../backend/services/api.js";
import { populateLiberiaCountySelect } from "../../assests/js/liberiaCounties.js";

const clientForm = document.getElementById("clientForm");
const clientCounty = document.getElementById("clientCounty");
const clientList = document.getElementById("clientsList");
const statusMessage = document.getElementById("clientMessageStatus");
const clientSearch = document.getElementById("clientSearch");
const clientStatusFilter = document.getElementById("clientStatusFilter");
let clients = [];
let posts = [];

populateLiberiaCountySelect(clientCounty);

document.getElementById("addClientBtn").addEventListener("click", () => {
    const section = document.getElementById("createClientSection");
    section.hidden = false;
    document.getElementById("addClientBtn").setAttribute("aria-expanded", "true");
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("clientName").focus();
});

document.getElementById("closeClientFormBtn").addEventListener("click", closeClientForm);

function closeClientForm() {
    document.getElementById("createClientSection").hidden = true;
    document.getElementById("addClientBtn").setAttribute("aria-expanded", "false");
    clientForm.reset();
    statusMessage.textContent = "";
}

function updateStatistics() {
    const activeClientIds = new Set(
        posts.filter(post => post.status === "Active").map(post => post.client_id)
    );
    document.getElementById("totalClientsStat").textContent = String(clients.length);
    document.getElementById("activeClientsStat").textContent =
        String(clients.filter(client => client.status === "Active").length);
    document.getElementById("inactiveClientsStat").textContent =
        String(clients.filter(client => client.status !== "Active").length);
    document.getElementById("clientsWithPostsStat").textContent =
        String(clients.filter(client => activeClientIds.has(client.id)).length);
}

function renderClients() {
    const query = clientSearch.value.trim().toLowerCase();
    const status = clientStatusFilter.value;
    const filtered = clients.filter(client => {
        const searchable = [
            client.client_name,
            client.contact_person,
            client.phone,
            client.email,
            client.address,
            client.county,
            client.business_type
        ].join(" ").toLowerCase();

        return (!query || searchable.includes(query)) &&
            (!status || client.status === status);
    });

    clientList.replaceChildren();
    if (!filtered.length) {
        const empty = document.createElement("p");
        empty.textContent = clients.length
            ? "No clients match the selected search or filters."
            : "No clients have been added yet.";
        clientList.appendChild(empty);
        return;
    }

    for (const client of filtered) {
        const item = document.createElement("article");
        item.className = "communication-history-item";
        const details = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = client.client_name || "Unnamed client";
        details.appendChild(title);

        for (const [label, value] of [
            ["Status", client.status || "Unknown"],
            ["Contact", client.contact_person],
            ["Phone", client.phone],
            ["Email", client.email],
            ["Location", [client.address, client.county].filter(Boolean).join(", ")],
            ["Business type", client.business_type]
        ]) {
            if (!value) continue;
            const paragraph = document.createElement("p");
            const strong = document.createElement("strong");
            strong.textContent = `${label}: `;
            paragraph.append(strong, document.createTextNode(value));
            details.appendChild(paragraph);
        }

        item.appendChild(details);
        clientList.appendChild(item);
    }
}

async function loadClients() {
    clientList.textContent = "Loading clients...";
    try {
        const result = await apiRequest("/clients");
        clients = result.clients || [];
        updateStatistics();
        renderClients();
    } catch (error) {
        console.error("Unable to load clients:", error);
        clientList.textContent = error.message || "Unable to load clients.";
    }
}

async function loadPostsForStatistics() {
    try {
        const result = await apiRequest("/posts");
        posts = result.posts || [];
        updateStatistics();
    } catch (error) {
        console.error("Unable to load posts for client statistics:", error);
        document.getElementById("clientsWithPostsStat").textContent = "—";
    }
}

clientSearch.addEventListener("input", renderClients);
clientStatusFilter.addEventListener("change", renderClients);

clientForm.addEventListener("submit", async event => {
    event.preventDefault();
    const saveButton = document.getElementById("saveClientBtn");
    saveButton.disabled = true;
    statusMessage.className = "form-message";
    statusMessage.textContent = "Saving client...";

    const clientData = {
        client_name: document.getElementById("clientName").value.trim(),
        contact_person: document.getElementById("clientContactPerson").value.trim(),
        phone: document.getElementById("clientPhone").value.trim(),
        email: document.getElementById("clientEmail").value.trim(),
        address: document.getElementById("clientAddress").value.trim(),
        county: clientCounty.value,
        business_type: document.getElementById("clientBusinessType").value.trim(),
        status: document.getElementById("clientStatus").value,
        notes: document.getElementById("clientNotes").value.trim()
    };

    try {
        const result = await apiRequest("/clients", {
            method: "POST",
            body: JSON.stringify(clientData)
        });
        clients.unshift(result.client);
        updateStatistics();
        renderClients();
        clientForm.reset();
        statusMessage.className = "form-message success";
        statusMessage.textContent = "Client added successfully.";
    } catch (error) {
        console.error("Unable to create client:", error);
        statusMessage.className = "form-message error";
        statusMessage.textContent = error.message || "Unable to add client.";
    } finally {
        saveButton.disabled = false;
    }
});

document.addEventListener("DOMContentLoaded", () => {
    void Promise.all([loadClients(), loadPostsForStatistics()]);
});
