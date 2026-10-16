import { apiRequest } from "../../backend/services/api.js";
import {
    populateLiberiaCountySelect,
    setLiberiaCountySelectValue
} from "../../assests/js/liberiaCounties.js";

const editPostCounty = document.getElementById("editPostCounty");
populateLiberiaCountySelect(editPostCounty);

const postTitle =
    document.getElementById("postTitle");

const postSubtitle =
    document.getElementById("postSubtitle");

const deploymentRoster =
    document.getElementById("deploymentRoster");

const shiftSchedule =
    document.getElementById("shiftSchedule");

let currentPost = null;
let clients = [];
let officers = [];
let assignments = [];


// ==========================================
// GET POST ID
// ==========================================

const params =
    new URLSearchParams(
        window.location.search
    );

const postId =
    params.get("id");


// ==========================================
// LOAD OFFICERS
// ==========================================

async function loadOfficers() {

    try {

        const result =
            await apiRequest("/officers");

        officers =
            result.officers || [];

    } catch (error) {

        console.error(
            "Error loading officers:",
            error
        );

    }

}


// ==========================================
// POPULATE EDIT SUPERVISORS
// ==========================================

function populateEditSupervisors() {

    const select =
        document.getElementById(
            "editPostSupervisor"
        );

    select.innerHTML =
        `<option value="">No Supervisor</option>`;

    officers.forEach(officer => {

        const option =
            document.createElement("option");

        option.value =
            officer.id;

        option.textContent =
            `${officer.name} — ${officer.officer_id}`;

        select.appendChild(option);

    });

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

        populateEditClients();

    } catch (error) {

        console.error(
            "Error loading clients:",
            error
        );

    }

}


// ==========================================
// POPULATE EDIT CLIENTS
// ==========================================

function populateEditClients() {

    const select =
        document.getElementById(
            "editPostClient"
        );

    select.innerHTML =
        `<option value="">Select Client</option>`;

    clients.forEach(client => {

        const option =
            document.createElement("option");

        option.value =
            client.id;

        option.textContent =
            client.client_name;

        select.appendChild(option);

    });

}


// ==========================================
// LOAD POST
// ==========================================

async function loadPost() {

    try {

        const result =
            await apiRequest("/posts");

        const posts =
            result.posts || [];

        const post =
            posts.find(
                item =>
                    item.id === postId
            );

        currentPost =
            post;

        if (!post) {

            postTitle.textContent =
                "Post Not Found";

            postSubtitle.textContent =
                "The requested security post could not be found.";

            return;

        }

        displayPost(post);

        await loadAssignments(post.id);

    } catch (error) {

        console.error(
            "Error loading post:",
            error
        );

    }

}


// ==========================================
// POPULATE EDIT POST FORM
// ==========================================

function populateEditPostForm(post) {

    document.getElementById(
        "editPostClient"
    ).value =
        post.client_id || "";

    document.getElementById(
        "editPostName"
    ).value =
        post.post_name || "";

    document.getElementById(
        "editPostLocation"
    ).value =
        post.location || "";

    setLiberiaCountySelectValue(editPostCounty, post.county);

    document.getElementById(
        "editRequiredOfficers"
    ).value =
        post.required_officers || 1;

    document.getElementById(
        "editShiftSystem"
    ).value =
        post.shift_system || "2 Shifts";

    document.getElementById(
        "editPostSupervisor"
    ).value =
        post.post_supervisor_id || "";

    document.getElementById(
        "editPostStatus"
    ).value =
        post.status || "Active";

    document.getElementById(
        "editServiceStartDate"
    ).value =
        post.service_start_date || "";

    document.getElementById(
        "editServiceEndDate"
    ).value =
        post.service_end_date || "";

    document.getElementById(
        "editSpecialInstructions"
    ).value =
        post.special_instructions || "";

}


// ==========================================
// SAVE POST CHANGES
// ==========================================

document
    .getElementById("editPostForm")
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const message =
                document.getElementById(
                    "editPostMessageStatus"
                );

            try {

                message.textContent =
                    "Saving changes...";

                await apiRequest(
                    `/posts/${currentPost.id}`,
                    {
                        method: "PATCH",

                        body: JSON.stringify({

                            client_id:
                                document.getElementById(
                                    "editPostClient"
                                ).value,

                            post_name:
                                document.getElementById(
                                    "editPostName"
                                ).value.trim(),

                            location:
                                document.getElementById(
                                    "editPostLocation"
                                ).value.trim(),

                            county:
                                editPostCounty.value,

                            required_officers:
                                Number(
                                    document.getElementById(
                                        "editRequiredOfficers"
                                    ).value
                                ),

                            shift_system:
                                document.getElementById(
                                    "editShiftSystem"
                                ).value,

                            post_supervisor_id:
                                document.getElementById(
                                    "editPostSupervisor"
                                ).value,

                            status:
                                document.getElementById(
                                    "editPostStatus"
                                ).value,

                            service_start_date:
                                document.getElementById(
                                    "editServiceStartDate"
                                ).value,

                            service_end_date:
                                document.getElementById(
                                    "editServiceEndDate"
                                ).value,

                            special_instructions:
                                document.getElementById(
                                    "editSpecialInstructions"
                                ).value.trim()

                        })

                    }
                );

                message.textContent =
                    "Post updated successfully.";

                await loadPost();

                if (currentPost) {
                    populateEditPostForm(
                        currentPost
                    );
                }

            } catch (error) {

                console.error(error);

                message.textContent =
                    error.message ||
                    "Unable to update post. Please try again.";

            }

        }
    );


// ==========================================
// DISPLAY POST
// ==========================================

function displayPost(post) {

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

    postTitle.textContent =
        post.post_name;

    postSubtitle.textContent =
        post.location;

    document.getElementById(
        "detailClient"
    ).textContent =
        clientName;

    document.getElementById(
        "detailLocation"
    ).textContent =
        post.location || "—";

    document.getElementById(
        "detailCounty"
    ).textContent =
        post.county || "—";

    document.getElementById(
        "detailRequiredOfficers"
    ).textContent =
        post.required_officers;

    document.getElementById(
        "detailShiftSystem"
    ).textContent =
        post.shift_system;

    document.getElementById(
        "detailSupervisor"
    ).textContent =
        supervisorName;

    document.getElementById(
        "detailStartDate"
    ).textContent =
        post.service_start_date || "—";

    document.getElementById(
        "detailEndDate"
    ).textContent =
        post.service_end_date || "—";

    document.getElementById(
        "detailStatus"
    ).textContent =
        post.status || "—";

    document.getElementById(
        "detailInstructions"
    ).textContent =
        post.special_instructions ||
        "No special instructions.";

    renderShiftSchedule(post);

}


// ==========================================
// SHIFT SCHEDULE
// ==========================================

function renderShiftSchedule(post) {

    shiftSchedule.innerHTML = "";

    const shifts = [
        {
            number: 1,
            start: post.shift_one_start,
            end: post.shift_one_end
        },
        {
            number: 2,
            start: post.shift_two_start,
            end: post.shift_two_end
        },
        {
            number: 3,
            start: post.shift_three_start,
            end: post.shift_three_end
        }
    ];

    shifts.forEach(shift => {

        if (
            !shift.start &&
            !shift.end
        ) {
            return;
        }

        const item =
            document.createElement(
                "div"
            );

        item.className =
            "communication-history-item";

        item.innerHTML = `

            <div>

                <h3>
                    Shift ${shift.number}
                </h3>

                <p>
                    <strong>Start:</strong>
                    ${escapeHTML(
                        shift.start || "—"
                    )}
                </p>

                <p>
                    <strong>End:</strong>
                    ${escapeHTML(
                        shift.end || "—"
                    )}
                </p>

            </div>

        `;

        shiftSchedule.appendChild(
            item
        );

    });

    if (
        !shiftSchedule.children.length
    ) {

        shiftSchedule.innerHTML = `
            <p>
                No shift schedule has been configured.
            </p>
        `;

    }

}


// ==========================================
// LOAD ASSIGNMENTS
// ==========================================

async function loadAssignments(postId) {

    deploymentRoster.innerHTML = `
        <p>
            Loading deployment roster...
        </p>
    `;

    try {

        const result =
            await apiRequest(
                `/posts/${postId}/assignments`
            );

        const postAssignments =
            result.assignments || [];

        renderDeploymentRoster(
            postAssignments
        );

    } catch (error) {

        console.error(
            "Error loading assignments:",
            error
        );

        deploymentRoster.innerHTML = `
            <p>
                Unable to load deployment roster.
            </p>
        `;

    }

}


// ==========================================
// DEPLOYMENT ROSTER
// ==========================================

function renderDeploymentRoster(
    assignments
) {

    deploymentRoster.innerHTML = "";

    if (!assignments.length) {

        deploymentRoster.innerHTML = `
            <p>
                No officers are currently assigned to this post.
            </p>
        `;

        return;

    }

    const shifts = {};

    assignments.forEach(
        assignment => {

            const shift =
                assignment.shift_number;

            if (!shifts[shift]) {
                shifts[shift] = [];
            }

            shifts[shift].push(
                assignment
            );

        }
    );

    Object.keys(shifts)
        .sort(
            (a, b) =>
                Number(a) -
                Number(b)
        )
        .forEach(
            shiftNumber => {

                const heading =
                    document.createElement(
                        "div"
                    );

                heading.innerHTML = `
                    <h3>
                        Shift ${shiftNumber}
                    </h3>
                `;

                deploymentRoster.appendChild(
                    heading
                );

                shifts[shiftNumber]
                    .forEach(
                        assignment => {

                            const officer =
                                assignment.officers;

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
                                            officer?.name ||
                                            "Unknown Officer"
                                        )}
                                    </h3>

                                    <p>
                                        <strong>Officer ID:</strong>
                                        ${escapeHTML(
                                            officer?.officer_id ||
                                            "—"
                                        )}
                                    </p>

                                    <p>
                                        <strong>Position:</strong>
                                        ${escapeHTML(
                                            officer?.position ||
                                            "—"
                                        )}
                                    </p>

                                    <p>
                                        <strong>Department:</strong>
                                        ${escapeHTML(
                                            officer?.department ||
                                            "—"
                                        )}
                                    </p>

                                    <p>
                                        <strong>Phone:</strong>
                                        ${escapeHTML(
                                            officer?.phone ||
                                            "—"
                                        )}
                                    </p>

                                    <p>
                                        <strong>Assignment Status:</strong>
                                        ${escapeHTML(
                                            assignment.assignment_status ||
                                            "—"
                                        )}
                                    </p>

                                    <p>
                                        <strong>Assigned Date:</strong>
                                        ${escapeHTML(
                                            assignment.assigned_date ||
                                            "—"
                                        )}
                                    </p>

                                </div>

                            `;

                            deploymentRoster.appendChild(
                                item
                            );

                        }
                    );

            }
        );

}


// ==========================================
// DEPLOYMENT MANAGEMENT
// ==========================================

async function loadDeploymentManagement(
    postId
) {

    const container =
        document.getElementById(
            "deploymentManagement"
        );

    try {

        const result =
            await apiRequest(
                `/posts/${postId}/assignments`
            );

        assignments =
            result.assignments || [];

        if (!assignments.length) {

            container.innerHTML = `
                <div class="communication-history-item">
                    <p>
                        No officers are currently assigned to this post.
                    </p>
                </div>
            `;

            return;

        }

        container.innerHTML =
            assignments
                .map(
                    assignment => {

                        const officer =
                            assignment.officers ||
                            {};

                        return `
                            <div class="communication-history-item deployment-management-item">

                                <div>

                                    <strong>
                                        ${escapeHTML(
                                            officer.name ||
                                            "Unknown Officer"
                                        )}
                                    </strong>

                                    <p>
                                        ID:
                                        ${escapeHTML(
                                            officer.officer_id ||
                                            "-"
                                        )}<br>

                                        Position:
                                        ${escapeHTML(
                                            officer.position ||
                                            "-"
                                        )}<br>

                                        Department:
                                        ${escapeHTML(
                                            officer.department ||
                                            "-"
                                        )}<br>

                                        Phone:
                                        ${escapeHTML(
                                            officer.phone ||
                                            "-"
                                        )}
                                    </p>

                                </div>

                                <div class="communication-form-grid">

                                    <div class="form-group">

                                        <label>
                                            Shift
                                        </label>

                                        <select
                                            class="assignment-shift"
                                            data-id="${assignment.id}"
                                        >

                                            <option
                                                value="1"
                                                ${
                                                    assignment.shift_number === 1
                                                        ? "selected"
                                                        : ""
                                                }
                                            >
                                                Shift 1
                                            </option>

                                            <option
                                                value="2"
                                                ${
                                                    assignment.shift_number === 2
                                                        ? "selected"
                                                        : ""
                                                }
                                            >
                                                Shift 2
                                            </option>

                                            <option
                                                value="3"
                                                ${
                                                    assignment.shift_number === 3
                                                        ? "selected"
                                                        : ""
                                                }
                                            >
                                                Shift 3
                                            </option>

                                        </select>

                                    </div>

                                    <div class="form-group">

                                        <label>
                                            Status
                                        </label>

                                        <select
                                            class="assignment-status"
                                            data-id="${assignment.id}"
                                        >

                                            <option
                                                value="Active"
                                                ${
                                                    assignment.assignment_status === "Active"
                                                        ? "selected"
                                                        : ""
                                                }
                                            >
                                                Active
                                            </option>

                                            <option
                                                value="Inactive"
                                                ${
                                                    assignment.assignment_status === "Inactive"
                                                        ? "selected"
                                                        : ""
                                                }
                                            >
                                                Inactive
                                            </option>

                                            <option
                                                value="Ended"
                                                ${
                                                    assignment.assignment_status === "Ended"
                                                        ? "selected"
                                                        : ""
                                                }
                                            >
                                                Ended
                                            </option>

                                        </select>

                                    </div>

                                    <div class="form-group">

                                        <label>
                                            Assigned Date
                                        </label>

                                        <input
                                            type="date"
                                            class="assignment-date"
                                            data-id="${assignment.id}"
                                            value="${assignment.assigned_date || ""}"
                                        >

                                    </div>

                                    <div class="form-group">

                                        <label>
                                            End Date
                                        </label>

                                        <input
                                            type="date"
                                            class="assignment-end-date"
                                            data-id="${assignment.id}"
                                            value="${assignment.end_date || ""}"
                                        >

                                    </div>

                                    <div class="form-group communication-full-width">

                                        <label>
                                            Notes
                                        </label>

                                        <textarea
                                            class="assignment-notes"
                                            data-id="${assignment.id}"
                                            rows="3"
                                        >${escapeHTML(
                                            assignment.notes ||
                                            ""
                                        )}</textarea>

                                    </div>

                                </div>

                                <div class="deployment-actions">

                                    <button
                                        type="button"
                                        class="dashboard-btn update-assignment-btn"
                                        data-id="${assignment.id}"
                                    >
                                        Save Changes
                                    </button>

                                    ${
                                        assignment.assignment_status !== "Ended"
                                            ? `
                                                <button
                                                    type="button"
                                                    class="dashboard-btn end-assignment-btn"
                                                    data-id="${assignment.id}"
                                                >
                                                    End Deployment
                                                </button>
                                            `
                                            : ""
                                    }

                                </div>

                            </div>
                        `;

                    }
                )
                .join("");

        attachAssignmentActions();

    } catch (error) {

        console.error(
            "Error loading deployment management:",
            error
        );

        container.innerHTML = `
            <div class="communication-history-item">
                <p>
                    Unable to load deployment records.
                </p>
            </div>
        `;

    }

}


// ==========================================
// ASSIGNMENT ACTIONS
// ==========================================

function attachAssignmentActions() {

    document
        .querySelectorAll(
            ".update-assignment-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const assignmentId =
                        button.dataset.id;

                    const shift =
                        document.querySelector(
                            `.assignment-shift[data-id="${assignmentId}"]`
                        ).value;

                    const status =
                        document.querySelector(
                            `.assignment-status[data-id="${assignmentId}"]`
                        ).value;

                    const assignedDate =
                        document.querySelector(
                            `.assignment-date[data-id="${assignmentId}"]`
                        ).value;

                    const endDate =
                        document.querySelector(
                            `.assignment-end-date[data-id="${assignmentId}"]`
                        ).value;

                    const notes =
                        document.querySelector(
                            `.assignment-notes[data-id="${assignmentId}"]`
                        ).value.trim();

                    try {

                        button.disabled =
                            true;

                        button.textContent =
                            "Saving...";

                        await apiRequest(
                            `/posts/${currentPost.id}/assignments/${assignmentId}`,
                            {
                                method: "PATCH",

                                body:
                                    JSON.stringify({

                                        shift_number:
                                            Number(
                                                shift
                                            ),

                                        assignment_status:
                                            status,

                                        assigned_date:
                                            assignedDate,

                                        end_date:
                                            endDate,

                                        notes

                                    })

                            }
                        );

                        await loadDeploymentManagement(
                            currentPost.id
                        );

                        await loadAssignments(
                            currentPost.id
                        );

                    } catch (error) {

                        console.error(
                            error
                        );

                        alert(
                            error.message ||
                            "Unable to update this deployment."
                        );

                        button.disabled =
                            false;

                        button.textContent =
                            "Save Changes";

                    }

                }
            );

        });


    document
        .querySelectorAll(
            ".end-assignment-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const assignmentId =
                        button.dataset.id;

                    const confirmed =
                        confirm(
                            "Are you sure you want to end this officer's deployment?"
                        );

                    if (!confirmed) {
                        return;
                    }

                    try {

                        button.disabled =
                            true;

                        button.textContent =
                            "Ending...";

                        await apiRequest(
                            `/posts/${currentPost.id}/assignments/${assignmentId}/end`,
                            {
                                method: "POST"
                            }
                        );

                        await loadDeploymentManagement(
                            currentPost.id
                        );

                        await loadAssignments(
                            currentPost.id
                        );

                        await loadPost();

                    } catch (error) {

                        console.error(
                            error
                        );

                        alert(
                            error.message ||
                            "Unable to end this deployment."
                        );

                        button.disabled =
                            false;

                        button.textContent =
                            "End Deployment";

                    }

                }
            );

        });

}


// ==========================================
// POPULATE ASSIGNMENT OFFICERS
// ==========================================

function populateAssignmentOfficers() {

    const select =
        document.getElementById(
            "detailAssignmentOfficer"
        );

    select.innerHTML = `
        <option value="">
            Select Officer
        </option>
    `;

    officers
        .filter(
            officer =>
                officer.status !== "Suspended" &&
                officer.status !== "Expired"
        )
        .forEach(
            officer => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    officer.id;

                option.textContent =
                    `${officer.name} — ${officer.officer_id}`;

                select.appendChild(
                    option
                );

            }
        );

}


// ==========================================
// ASSIGN OFFICER TO POST
// ==========================================

document
    .getElementById(
        "detailAssignmentForm"
    )
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const button =
                document.getElementById(
                    "detailAssignOfficerBtn"
                );

            const message =
                document.getElementById(
                    "detailAssignmentMessageStatus"
                );

            const officerId =
                document.getElementById(
                    "detailAssignmentOfficer"
                ).value;

            const shiftNumber =
                Number(
                    document.getElementById(
                        "detailAssignmentShift"
                    ).value
                );

            const assignedDate =
                document.getElementById(
                    "detailAssignmentDate"
                ).value;

            const status =
                document.getElementById(
                    "detailAssignmentStatus"
                ).value;

            const notes =
                document.getElementById(
                    "detailAssignmentNotes"
                ).value.trim();

            if (!officerId) {

                message.textContent =
                    "Please select an officer.";

                return;

            }

            try {

                button.disabled =
                    true;

                button.textContent =
                    "Assigning...";

                message.textContent =
                    "";

                await apiRequest(
                    `/posts/${currentPost.id}/assignments`,
                    {
                        method: "POST",

                        body:
                            JSON.stringify({

                                officer_id:
                                    officerId,

                                shift_number:
                                    shiftNumber,

                                assignment_status:
                                    status,

                                assigned_date:
                                    assignedDate ||
                                    new Date()
                                        .toISOString()
                                        .split("T")[0],

                                notes

                            })

                    }
                );

                message.textContent =
                    "Officer assigned successfully.";

                document
                    .getElementById(
                        "detailAssignmentForm"
                    )
                    .reset();

                await loadDeploymentManagement(
                    currentPost.id
                );

                await loadAssignments(
                    currentPost.id
                );

                await loadPost();

            } catch (error) {

                console.error(
                    error
                );

                if (
                    error.message &&
                    (
                        error.message
                            .toLowerCase()
                            .includes("duplicate") ||
                        error.message
                            .toLowerCase()
                            .includes("already assigned")
                    )
                ) {

                    message.textContent =
                        "This officer is already assigned to this shift.";

                } else {

                    message.textContent =
                        error.message ||
                        "Unable to assign officer.";

                }

            } finally {

                button.disabled =
                    false;

                button.textContent =
                    "Assign Officer";

            }

        }
    );


// ==========================================
// HTML SECURITY
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

        if (!postId) {

            postTitle.textContent =
                "No Post Selected";

            return;

        }

        await loadOfficers();

        populateEditSupervisors();

        populateAssignmentOfficers();

        await loadClients();

        await loadPost();

        if (currentPost) {

            populateEditPostForm(
                currentPost
            );

            await loadDeploymentManagement(
                currentPost.id
            );

        }

    }
);