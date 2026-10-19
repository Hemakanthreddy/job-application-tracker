
const API_URL = "/applications";

const form = document.getElementById("application-form");
const applicationsBody = document.getElementById("applications-body");
const message = document.getElementById("message");
const submitButton = document.getElementById("submit-button");
const cancelEditButton = document.getElementById("cancel-edit");

let applications = [];
let editingId = null;

const today = new Date();
const localToday = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
).toISOString().split("T")[0];

document.getElementById("applied_on").value = localToday;

function showMessage(text, type = "success") {
    message.textContent = text;
    message.className = `message ${type}`;
    message.hidden = false;
}

function clearMessage() {
    message.hidden = true;
    message.textContent = "";
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        let errorMessage = `Request failed (${response.status})`;

        try {
            const errorData = await response.json();

            if (Array.isArray(errorData.detail)) {
                errorMessage = errorData.detail
                    .map(error => error.msg)
                    .join(", ");
            } else if (typeof errorData.detail === "string") {
                errorMessage = errorData.detail;
            }
        } catch {
            // Keep the fallback error message.
        }

        throw new Error(errorMessage);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

async function loadApplications() {
    applicationsBody.innerHTML = `
        <tr>
            <td colspan="5" class="empty-state">Loading applications...</td>
        </tr>
    `;

    try {
        applications = await apiRequest(API_URL);
        renderApplications();
        updateStatistics();
    } catch (error) {
        applicationsBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    Could not load applications. Check that the API is running.
                </td>
            </tr>
        `;
        showMessage(error.message, "error");
    }
}

function renderApplications() {
    applicationsBody.replaceChildren();

    if (applications.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.className = "empty-state";
        cell.textContent = "No applications yet. Add your first application above.";

        row.appendChild(cell);
        applicationsBody.appendChild(row);
    }

    applications.forEach(application => {
        const row = document.createElement("tr");

        const companyCell = document.createElement("td");
        const companyName = document.createElement("span");
        const roleName = document.createElement("span");

        companyName.className = "company-name";
        companyName.textContent = application.company;

        roleName.className = "role-name";
        roleName.textContent = application.role;

        if (application.job_url) {
            const jobLink = document.createElement("a");
            jobLink.href = application.job_url;
            jobLink.target = "_blank";
            jobLink.rel = "noopener noreferrer";
            jobLink.textContent = "View job posting";
            jobLink.className = "role-name";
            companyCell.append(companyName, roleName, jobLink);
        } else {
            companyCell.append(companyName, roleName);
        }

        const dateCell = document.createElement("td");
        dateCell.textContent = application.applied_on;

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = `status-badge status-${application.status.toLowerCase()}`;
        badge.textContent = application.status;
        statusCell.appendChild(badge);

        const notesCell = document.createElement("td");
        notesCell.textContent = application.notes || "—";
        notesCell.style.maxWidth = "180px";

        const actionsCell = document.createElement("td");
        const actionGroup = document.createElement("div");
        actionGroup.className = "action-group";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "edit-button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editApplication(application.id));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteApplication(application.id));

        actionGroup.append(editButton, deleteButton);
        actionsCell.appendChild(actionGroup);

        row.append(
            companyCell,
            dateCell,
            statusCell,
            notesCell,
            actionsCell
        );

        applicationsBody.appendChild(row);
    });

    document.getElementById("result-count").textContent =
        `${applications.length} application${applications.length === 1 ? "" : "s"}`;
}

function updateStatistics() {
    document.getElementById("total-count").textContent = applications.length;

    document.getElementById("interview-count").textContent =
        applications.filter(item => item.status === "Interview").length;

    document.getElementById("offer-count").textContent =
        applications.filter(item => item.status === "Offer").length;

    document.getElementById("rejected-count").textContent =
        applications.filter(item => item.status === "Rejected").length;
}

form.addEventListener("submit", async event => {
    event.preventDefault();
    clearMessage();

    const applicationData = {
        company: document.getElementById("company").value.trim(),
        role: document.getElementById("role").value.trim(),
        job_url: document.getElementById("job_url").value.trim() || null,
        status: document.getElementById("status").value,
        applied_on: document.getElementById("applied_on").value,
        notes: document.getElementById("notes").value.trim() || null
    };

    if (!applicationData.company || !applicationData.role) {
        showMessage("Please enter both company name and job role.", "error");
        return;
    }

    if (!applicationData.applied_on) {
        showMessage("Please select the application date.", "error");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = editingId === null ? "Saving..." : "Updating...";

    try {
        if (editingId === null) {
            await apiRequest(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(applicationData)
            });

            showMessage("Application added successfully.");
        } else {
            await apiRequest(`${API_URL}/${editingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(applicationData)
            });

            showMessage("Application updated successfully.");
        }

        resetForm();
        await loadApplications();
    } catch (error) {
        showMessage(error.message, "error");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = editingId === null
            ? "Save application"
            : "Update application";
    }
});

function editApplication(id) {
    const application = applications.find(item => item.id === id);

    if (!application) {
        showMessage("Application not found.", "error");
        return;
    }

    editingId = id;

    document.getElementById("company").value = application.company;
    document.getElementById("role").value = application.role;
    document.getElementById("job_url").value = application.job_url || "";
    document.getElementById("status").value = application.status;
    document.getElementById("applied_on").value = application.applied_on;
    document.getElementById("notes").value = application.notes || "";

    document.getElementById("form-heading").textContent = "Edit application";
    submitButton.textContent = "Update application";
    cancelEditButton.hidden = false;

    clearMessage();
    document.getElementById("add-application").scrollIntoView({
        behavior: "smooth"
    });
}

async function deleteApplication(id) {
    const application = applications.find(item => item.id === id);

    if (!application) {
        showMessage("Application not found.", "error");
        return;
    }

    const confirmed = window.confirm(
        `Delete the application for ${application.company}? This cannot be undone.`
    );

    if (!confirmed) {
        return;
    }

    clearMessage();

    try {
        await apiRequest(`${API_URL}/${id}`, { method: "DELETE" });

        if (editingId === id) {
            resetForm();
        }

        showMessage("Application deleted successfully.");
        await loadApplications();
    } catch (error) {
        showMessage(error.message, "error");
    }
}

function resetForm() {
    form.reset();
    editingId = null;

    document.getElementById("form-heading").textContent =
        "Add a new application";

    submitButton.textContent = "Save application";
    cancelEditButton.hidden = true;
    document.getElementById("applied_on").value = localToday;
}

cancelEditButton.addEventListener("click", () => {
    resetForm();
    clearMessage();
});

document.getElementById("refresh-button").addEventListener("click", () => {
    clearMessage();
    loadApplications();
});

loadApplications();
