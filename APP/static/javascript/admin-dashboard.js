// admin dashboard.js

// responsive functionalities
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const main = document.querySelector('main');

menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('open');
});

// close sidebar when clicking outside
document.addEventListener('click', (e) => {
    const isSidebar = e.target.closest('#sidebar');
    const isMenuToggle = e.target.closest('#menu-toggle');
    if (!isSidebar && !isMenuToggle && window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
});

// prevent sidebar from closing when clicking inside it
sidebar.addEventListener('click', (e) => {
    e.stopPropagation();
});

// close sidebar when resizing to larger screen
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        sidebar.classList.remove('open');
    }
});

// fetch student counts
document.addEventListener("DOMContentLoaded", async function () {
    try {
        const seniorHighResponse = await fetch("/api/senior-high-students/count");
        const seniorHighData = await seniorHighResponse.json();
        document.getElementById("seniorHighCount").textContent = seniorHighData.count || 0;

        const collegeResponse = await fetch("/api/college-students/count");
        const collegeData = await collegeResponse.json();
        document.getElementById("collegeCount").textContent = collegeData.count || 0;
    } catch (error) {
        console.error("Error fetching student counts:", error);
    }
});

let currentPage = 1;
const campusesPerPage = 5;
const campusesTableBody = document.querySelector("#campusesTableBody");
const paginationContainer = document.querySelector("#pagination");

async function fetchCampuses(page = 1) {
    try {
        const response = await fetch(`/api/retrieve/campuses`, {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) throw new Error("Failed to fetch campuses");

        const campuses = await response.json();
        const startIndex = (page - 1) * campusesPerPage;
        const endIndex = startIndex + campusesPerPage;
        const paginatedCampuses = campuses.slice(startIndex, endIndex);

        renderCampuses(paginatedCampuses, campuses);
        renderPagination(campuses.length, page);
    } catch (error) {
        console.error("Error loading campuses:", error);
    }
}

function renderCampuses(campuses, allCampuses) {
    campusesTableBody.innerHTML = "";

    campuses.forEach(campus => {
        const row = document.createElement("tr");
        row.classList.add("border-t");
        row.innerHTML = `
            <td class="py-2 md:py-3">${campus.name}</td>
            <td>${campus.latitude}</td>
            <td>${campus.longitude}</td>
            <td>
                <a href="#" class="edit-campus text-purple-600 hover:text-purple-800 mr-2 md:mr-3"
                    data-id="${campus.campus_id}" 
                    data-name="${campus.name}"
                    data-lat="${campus.latitude}"
                    data-lng="${campus.longitude}">Edit</a>
                <a href="#" class="delete-campus text-red-600 hover:text-red-800" data-id="${campus.campus_id}">Delete</a>
            </td>
        `;
        campusesTableBody.append(row);
    });

    document.querySelectorAll(".edit-campus").forEach(button => {
        button.addEventListener("click", (e) => {
            e.preventDefault();
            const campusId = e.target.getAttribute("data-id");
            openEditModal(campusId, allCampuses);
        });
    });

    document.querySelectorAll(".delete-campus").forEach(button => {
        button.addEventListener("click", (e) => {
            e.preventDefault();
            const campusId = e.target.getAttribute("data-id");
            openDeleteModal(campusId);
        });
    });
}

function renderPagination(totalCampuses, currentPage) {
    const totalPages = Math.ceil(totalCampuses / campusesPerPage);
    paginationContainer.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement("button");
        button.textContent = i;
        button.classList.add("px-3", "py-1", "rounded", "ml-2");

        if (i === currentPage) {
            button.classList.add("bg-black", "text-white");
        } else {
            button.classList.add("bg-blue-500", "text-white");
        }

        button.addEventListener("click", () => {
            currentPage = i;
            fetchCampuses(currentPage);
        });

        paginationContainer.appendChild(button);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    fetchCampuses(currentPage);

    document.getElementById("addCampusBtn").addEventListener("click", () => {
        window.location.href = "/maps";
    });
});

let map;

function openEditModal(campusId, campuses) {
    const campus = campuses.find(c => c.campus_id == campusId);
    if (!campus) return;

    document.getElementById("editCampusId").value = campusId;
    document.getElementById("editCampusName").value = campus.name;
    document.getElementById("editLatitude").value = campus.latitude;
    document.getElementById("editLongitude").value = campus.longitude;

    document.getElementById("editModal").classList.remove("hidden");

    if (map) map.remove();

    map = L.map('mapContainer').setView([campus.latitude, campus.longitude], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const schoolIcon = L.icon({
        iconUrl: 'static/img/usjr.png',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });

    const campusMarker = L.marker([campus.latitude, campus.longitude], {
        icon: schoolIcon,
        draggable: true
    }).addTo(map);

    campusMarker.on('dragend', function () {
        const latLng = campusMarker.getLatLng();
        document.getElementById("editLatitude").value = latLng.lat;
        document.getElementById("editLongitude").value = latLng.lng;
    });

    document.getElementById('closeEditModal').addEventListener('click', () => {
        document.getElementById("editModal").classList.add("hidden");
        map.removeLayer(campusMarker);
    });
}

function openDeleteModal(campusId) {
    document.getElementById("deleteCampusId").value = campusId;
    document.getElementById("deleteModal").classList.remove("hidden");
}

document.getElementById("closeEditModal").addEventListener("click", () => {
    document.getElementById("editModal").classList.add("hidden");
});

document.getElementById("saveEditCampus").addEventListener("click", async () => {
    const campusId = document.getElementById("editCampusId").value;
    const updatedCampus = {
        name: document.getElementById("editCampusName").value,
        latitude: parseFloat(document.getElementById("editLatitude").value),
        longitude: parseFloat(document.getElementById("editLongitude").value)
    };

    try {
        const response = await fetch(`/api/campuses/${campusId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(updatedCampus)
        });

        if (!response.ok) throw new Error("Failed to update campus");

        document.getElementById("editModal").classList.add("hidden");
        fetchCampuses(currentPage);
    } catch (error) {
        console.error("Error updating campus:", error);
    }
});

document.getElementById("closeDeleteModal").addEventListener("click", () => {
    document.getElementById("deleteModal").classList.add("hidden");
});

document.getElementById("confirmDeleteCampus").addEventListener("click", async () => {
    const campusId = document.getElementById("deleteCampusId").value;

    try {
        const response = await fetch(`/api/campuses/${campusId}`, {
            method: "DELETE",
            credentials: "include"
        });

        if (!response.ok) throw new Error("Failed to delete campus");

        document.getElementById("deleteModal").classList.add("hidden");
        fetchCampuses(1);
    } catch (error) {
        console.error("Error deleting campus:", error);
    }
});
