let editingStrandId = null;

const strandTableBody = document.querySelector("#strandTable tbody");
const campusSelect = document.getElementById("campusSelect");
const strandFormModal = document.getElementById("strandFormModal");
const strandForm = document.getElementById("strandForm");

function showStrandForm() {
    strandFormModal.style.display = "flex";
}
  
function hideStrandForm() {
    strandFormModal.style.display = "none";
    strandForm.reset();
    editingStrandId = null;
}

function editStrand(id, name, campus_id) {
    editingStrandId = id;
    document.getElementById("strandName").value = name;
    document.getElementById("campusSelect").value = campus_id;
    strandFormModal.style.display = "flex";
}
   

async function fetchCampuses() {
    const response = await fetch("/api/retrieve/campuses");
    const campuses = await response.json();

    campusSelect.innerHTML = "";
    campuses.forEach(campus => {
        const option = document.createElement("option");
        option.value = campus.campus_id;
        option.textContent = campus.name;
        campusSelect.appendChild(option);
    });
}

async function fetchStrands() {
    const [strandResponse, campusResponse] = await Promise.all([
        fetch("/api/retrieve/strands"),
        fetch("/api/retrieve/campuses")
    ]);

    const strands = await strandResponse.json();
    const campuses = await campusResponse.json();

    // Create a campus_id to name map
    const campusMap = {};
    campuses.forEach(c => campusMap[c.campus_id] = c.name);

    strandTableBody.innerHTML = "";
    for (const strand of strands) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${strand.name}</td>
            <td>${campusMap[strand.campus_id] || 'Unknown'}</td>
            <td>
                <button onclick="editStrand(${strand.strand_id}, '${strand.name}', ${strand.campus_id})">Edit</button>
                <button onclick="deleteStrand(${strand.strand_id})">Delete</button>
            </td>
        `;
        strandTableBody.appendChild(row);
    }
}

strandForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("strandName").value;
    const campus_id = parseInt(document.getElementById("campusSelect").value);

    if (editingStrandId) {
        // Edit existing strand
        const response = await fetch(`/api/strands/${editingStrandId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, campus_id }),
        });

        if (response.ok) {
        editingStrandId = null;
        hideStrandForm();
        fetchStrands();
        } else {
        const data = await response.json();
        alert(data.detail || "Error updating strand.");
        }
    } else {
        // Create new strand
        const response = await fetch("/api/strands", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, campus_id }),
        });

        if (response.ok) {
            hideStrandForm();
            fetchStrands();
        } else {
            const data = await response.json();
            alert(data.detail || "Error creating strand.");
        }
    }
});
  

async function deleteStrand(id) {
    if (!confirm("Are you sure you want to delete this strand?")) return;
    const response = await fetch(`/api/strands/${id}`, { method: "DELETE" });
    if (response.ok) {
        fetchStrands();
    } else {
        alert("Error deleting strand.");
    }
}

window.onload = async () => {
    await fetchCampuses();
    await fetchStrands();
};
