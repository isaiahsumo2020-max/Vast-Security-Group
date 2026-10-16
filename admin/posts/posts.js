import { apiRequest } from "../../backend/services/api.js";
import { populateLiberiaCountySelect } from "../../assests/js/liberiaCounties.js";


const postForm =
    document.getElementById("postForm");

const postClient =
    document.getElementById("postClient");

const postCounty =
    document.getElementById("postCounty");

const postSupervisor =
    document.getElementById("postSupervisor");

const postsList =
    document.getElementById("postsList");

const postMessageStatus =
    document.getElementById(
        "postMessageStatus"
    );

const assignmentForm =
    document.getElementById(
        "assignmentForm"
    );

const assignmentPost =
    document.getElementById(
        "assignmentPost"
    );

const assignmentOfficer =
    document.getElementById(
        "assignmentOfficer"
    );

const assignmentHistory =
    document.getElementById(
        "assignmentHistory"
    );

const assignmentMessageStatus =
    document.getElementById(
        "assignmentMessageStatus"
    );


let clients = [];
let officers = [];
let posts = [];

populateLiberiaCountySelect(postCounty);

const postSearch = document.getElementById("postSearch");
const postStatusFilter = document.getElementById("postStatusFilter");
const postClientFilter = document.getElementById("postClientFilter");

document.getElementById("addSecurityPostBtn").addEventListener("click", () => {
    const section = document.getElementById("createSecurityPostSection");
    section.hidden = false;
    document.getElementById("addSecurityPostBtn").setAttribute("aria-expanded", "true");
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    postClient.focus();
});

document.getElementById("closeSecurityPostFormBtn").addEventListener("click", () => {
    document.getElementById("createSecurityPostSection").hidden = true;
    document.getElementById("addSecurityPostBtn").setAttribute("aria-expanded", "false");
    postForm.reset();
    postMessageStatus.textContent = "";
});

document.getElementById("openAssignmentFormBtn").addEventListener("click", () => {
    const section = document.getElementById("deploymentSection");
    section.hidden = false;
    document.getElementById("openAssignmentFormBtn").setAttribute("aria-expanded", "true");
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    assignmentPost.focus();
});

document.getElementById("closeAssignmentFormBtn").addEventListener("click", () => {
    document.getElementById("deploymentSection").hidden = true;
    document.getElementById("openAssignmentFormBtn").setAttribute("aria-expanded", "false");
    assignmentForm.reset();
    assignmentMessageStatus.textContent = "";
});

for (const filter of [postSearch, postStatusFilter, postClientFilter]) {
    filter.addEventListener("input", renderFilteredPosts);
    filter.addEventListener("change", renderFilteredPosts);
}


// ==========================================
// LOAD CLIENTS
// ==========================================

async function loadClients() {

    try {

        const result =
            await apiRequest("/clients");

        clients =
            result.clients || [];

        populateClients();
        populatePostClientFilter();

        console.log("✔ Clients loaded");

    } catch (error) {

        console.error(
            "Error loading clients:",
            error
        );

        postMessageStatus.textContent =
            error.message || "Unable to load clients for post creation.";

    }

}


// ==========================================
// POPULATE CLIENT SELECT
// ==========================================

function populateClients() {

    postClient.innerHTML = `
        <option value="">
            Select Client
        </option>
    `;

    clients.forEach(client => {

        const option =
            document.createElement("option");

        option.value =
            client.id;

        option.textContent =
            client.client_name;

        postClient.appendChild(
            option
        );

    });

}


// ==========================================
// LOAD OFFICERS
// ==========================================

async function loadOfficers() {

    try {

        const result =
            await apiRequest("/officers");

        officers =
            result.officers || [];

        populateSupervisors();

        console.log("✔ Officers loaded");

    } catch (error) {

        console.error(
            "Error loading officers:",
            error
        );

        postMessageStatus.textContent =
            error.message ||
            "Unable to load officers.";

    }

}


// ==========================================
// POPULATE SUPERVISORS
// ==========================================

function populateSupervisors() {

    postSupervisor.innerHTML = `
        <option value="">
            Select Supervisor
        </option>
    `;

    officers.forEach(officer => {

        const option =
            document.createElement("option");

        option.value =
            officer.id;

        option.textContent =
            `${officer.name || ""} — ${officer.position || ""}`;

        postSupervisor.appendChild(
            option
        );

    });

}


// ==========================================
// SAVE SECURITY POST
// ==========================================

postForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        postMessageStatus.textContent =
            "Creating security post...";

        try {

            const postData = {

                client_id:
                    postClient.value ||
                    null,

                post_name:
                    document.getElementById(
                        "postName"
                    ).value.trim(),

                location:
                    document.getElementById(
                        "postLocation"
                    ).value.trim(),

                county:
                    postCounty.value,

                required_officers:
                    Number(
                        document.getElementById(
                            "requiredOfficers"
                        ).value
                    ),

                shift_system:
                    document.getElementById(
                        "shiftSystem"
                    ).value,

                shift_one_start:
                    document.getElementById(
                        "shiftOneStart"
                    ).value ||
                    null,

                shift_one_end:
                    document.getElementById(
                        "shiftOneEnd"
                    ).value ||
                    null,

                shift_two_start:
                    document.getElementById(
                        "shiftTwoStart"
                    ).value ||
                    null,

                shift_two_end:
                    document.getElementById(
                        "shiftTwoEnd"
                    ).value ||
                    null,

                shift_three_start:
                    document.getElementById(
                        "shiftThreeStart"
                    ).value ||
                    null,

                shift_three_end:
                    document.getElementById(
                        "shiftThreeEnd"
                    ).value ||
                    null,

                post_supervisor_id:
                    postSupervisor.value ||
                    null,

                service_start_date:
                    document.getElementById(
                        "serviceStartDate"
                    ).value ||
                    null,

                service_end_date:
                    document.getElementById(
                        "serviceEndDate"
                    ).value ||
                    null,

                status:
                    document.getElementById(
                        "postStatus"
                    ).value,

                special_instructions:
                    document.getElementById(
                        "specialInstructions"
                    ).value.trim()

            };


            await apiRequest(
                "/posts",
                {
                    method: "POST",
                    body:
                        JSON.stringify(
                            postData
                        )
                }
            );


            postForm.reset();

            postMessageStatus.textContent =
                "✔ Security post created successfully.";

            await loadPosts();


        } catch (error) {

            console.error(
                "Error creating post:",
                error
            );

            postMessageStatus.textContent =
                error.message ||
                "Unable to create security post. Please try again.";

        }

    }
);


// ==========================================
// LOAD POSTS
// ==========================================

async function loadPosts() {

    try {

        const result =
            await apiRequest(
                "/posts"
            );

        posts = result.posts || [];

        updatePostStatistics();
        renderFilteredPosts();

        populateAssignmentPosts(
            posts
        );

    } catch (error) {

        console.error(
            "Error loading posts:",
            error
        );

        postsList.innerHTML = `
            <p>
                ${escapeHTML(
                    error.message ||
                    "Unable to load security posts."
                )}
            </p>
        `;

    }
}

function populatePostClientFilter() {
    postClientFilter.replaceChildren(new Option("All clients", ""));
    clients.forEach(client => {
        postClientFilter.add(new Option(client.client_name, client.id));
    });
}

function updatePostStatistics() {
    document.getElementById("totalPostsStat").textContent = String(posts.length);
    document.getElementById("activePostsStat").textContent =
        String(posts.filter(post => post.status === "Active").length);
    document.getElementById("inactivePostsStat").textContent =
        String(posts.filter(post => post.status === "Inactive").length);
    document.getElementById("suspendedPostsStat").textContent =
        String(posts.filter(post => post.status === "Suspended").length);
}

function renderFilteredPosts() {
    const query = postSearch.value.trim().toLowerCase();
    const status = postStatusFilter.value;
    const clientId = postClientFilter.value;
    const filtered = posts.filter(post => {
        const clientName = post.clients?.client_name || "";
        const searchable = [post.post_name, post.location, post.county, clientName]
            .join(" ").toLowerCase();

        return (!query || searchable.includes(query)) &&
            (!status || post.status === status) &&
            (!clientId || post.client_id === clientId);
    });

    renderPosts(filtered);
}


// ==========================================
// RENDER POSTS
// ==========================================

function renderPosts(posts) {

    postsList.innerHTML = "";


    if (!posts.length) {

        postsList.innerHTML = `
            <p>
                ${posts.length === 0 && (postSearch.value || postStatusFilter.value || postClientFilter.value)
                    ? "No security posts match the current search or filters."
                    : "No security posts have been created yet."}
            </p>
        `;

        return;

    }


    posts.forEach(post => {

        const clientName =
            post.clients?.client_name ||
            "No Client";


        const supervisor =
            officers.find(
                officer =>
                    officer.id ===
                    post.post_supervisor_id
            );


        const supervisorName =
            supervisor?.name ||
            "Not Assigned";


        const item =
            document.createElement(
                "div"
            );

        item.className =
            "communication-history-item";


        item.innerHTML = `

            <div>

                <h3>
                    <a
                        href="./post-details.html?id=${encodeURIComponent(post.id)}"
                        class="post-details-link"
                    >
                        ${escapeHTML(
                            post.post_name
                        )}
                    </a>
                </h3>

                <p>
                    <strong>Client:</strong>
                    ${escapeHTML(
                        clientName
                    )}
                </p>

                <p>
                    <strong>Location:</strong>
                    ${escapeHTML(
                        post.location
                    )}
                </p>

                <p>
                    <strong>Required Officers:</strong>
                    ${post.required_officers}
                </p>

                <p>
                    <strong>Shift System:</strong>
                    ${escapeHTML(
                        post.shift_system
                    )}
                </p>

                <p>
                    <strong>Supervisor:</strong>
                    ${escapeHTML(
                        supervisorName
                    )}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${escapeHTML(
                        post.status
                    )}
                </p>

            </div>

        `;


        postsList.appendChild(
            item
        );

    });

}


// ==========================================
// POPULATE ASSIGNMENT POSTS
// ==========================================

function populateAssignmentPosts(
    posts
) {

    assignmentPost.innerHTML = `
        <option value="">
            Select Security Post
        </option>
    `;

    posts.forEach(post => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            post.id;

        option.textContent =
            `${post.post_name} — ${post.location}`;

        assignmentPost.appendChild(
            option
        );

    });

}


// ==========================================
// POPULATE ASSIGNMENT OFFICERS
// ==========================================

function populateAssignmentOfficers() {

    assignmentOfficer.innerHTML = `
        <option value="">
            Select Officer
        </option>
    `;

    officers.forEach(officer => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            officer.id;

        option.textContent =
            `${officer.name || ""} — ${officer.officer_id}`;

        assignmentOfficer.appendChild(
            option
        );

    });

}


// ==========================================
// ASSIGNMENT FORM
// ==========================================

assignmentForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        assignmentMessageStatus.textContent =
            "Assigning officer...";


        try {

            const selectedPost =
                assignmentPost.value;


            const assignmentData = {

                officer_id:
                    assignmentOfficer.value,

                shift_number:
                    Number(
                        document.getElementById(
                            "assignmentShift"
                        ).value
                    ),

                assigned_date:
                    document.getElementById(
                        "assignmentDate"
                    ).value ||
                    null,

                end_date:
                    document.getElementById(
                        "assignmentEndDate"
                    ).value ||
                    null,

                assignment_status:
                    document.getElementById(
                        "assignmentStatus"
                    ).value,

                notes:
                    document.getElementById(
                        "assignmentNotes"
                    ).value.trim()

            };


            await apiRequest(
                `/posts/${encodeURIComponent(
                    selectedPost
                )}/assignments`,
                {
                    method: "POST",
                    body:
                        JSON.stringify(
                            assignmentData
                        )
                }
            );


            assignmentMessageStatus.textContent =
                "✔ Officer assigned successfully.";


            assignmentForm.reset();


            assignmentPost.value =
                selectedPost;


            await loadAssignmentHistory(
                selectedPost
            );


        } catch (error) {

            console.error(
                "Error assigning officer:",
                error
            );

            assignmentMessageStatus.textContent =
                error.message ||
                "Unable to assign officer. Please try again.";

        }

    }
);


// ==========================================
// ASSIGNMENT POST CHANGE
// ==========================================

assignmentPost.addEventListener(
    "change",
    async function () {

        const postId =
            this.value;


        if (!postId) {

            assignmentHistory.innerHTML = `
                <p>
                    Select a security post to view deployments.
                </p>
            `;

            return;

        }


        await loadAssignmentHistory(
            postId
        );

    }
);


// ==========================================
// LOAD ASSIGNMENT HISTORY
// ==========================================

async function loadAssignmentHistory(
    postId
) {

    assignmentHistory.innerHTML = `
        <p>
            Loading deployment records...
        </p>
    `;


    try {

        const result =
            await apiRequest(
                `/posts/${encodeURIComponent(
                    postId
                )}/assignments`
            );


        const assignments =
            result.assignments || [];


        renderAssignmentHistory(
            assignments
        );


    } catch (error) {

        console.error(
            "Error loading assignments:",
            error
        );

        assignmentHistory.innerHTML = `
            <p>
                ${escapeHTML(
                    error.message ||
                    "Unable to load deployment records."
                )}
            </p>
        `;

    }

}


// ==========================================
// RENDER ASSIGNMENT HISTORY
// ==========================================

function renderAssignmentHistory(
    assignments
) {

    assignmentHistory.innerHTML = "";


    if (!assignments.length) {

        assignmentHistory.innerHTML = `
            <p>
                No deployment records found.
            </p>
        `;

        return;

    }


    assignments.forEach(
        assignment => {

            const officer =
                assignment.officers;


            const officerName =
                officer?.name ||
                "Unknown Officer";


            const officerId =
                officer?.officer_id ||
                "";


            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "communication-history-item";


            item.innerHTML = `

                <div>

                    <h3>
                        ${escapeHTML(
                            officerName
                        )}
                    </h3>

                    <p>
                        <strong>Officer ID:</strong>
                        ${escapeHTML(
                            officerId
                        )}
                    </p>

                    <p>
                        <strong>Shift:</strong>
                        ${assignment.shift_number}
                    </p>

                    <p>
                        <strong>Status:</strong>
                        ${escapeHTML(
                            assignment.assignment_status
                        )}
                    </p>

                    <p>
                        <strong>Assigned Date:</strong>
                        ${escapeHTML(
                            assignment.assigned_date ||
                            "Not specified"
                        )}
                    </p>

                    <p>
                        <strong>End Date:</strong>
                        ${escapeHTML(
                            assignment.end_date ||
                            "Not specified"
                        )}
                    </p>

                    ${
                        assignment.notes
                            ? `
                                <p>
                                    <strong>Notes:</strong>
                                    ${escapeHTML(
                                        assignment.notes
                                    )}
                                </p>
                            `
                            : ""
                    }

                </div>

            `;


            assignmentHistory.appendChild(
                item
            );

        }
    );

}


// ==========================================
// BASIC HTML SECURITY
// ==========================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ==========================================
// INITIALIZE
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await Promise.all([
            loadClients(),
            loadOfficers()
        ]);


        populateAssignmentOfficers();


        await loadPosts();


        console.log(
            "✔ Posts Management Ready"
        );

    }
);