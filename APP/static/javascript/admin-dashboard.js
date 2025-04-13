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

document.addEventListener("DOMContentLoaded", async function () {
    try {
        // fetch Senior High Students Count
        const seniorHighResponse = await fetch("/api/senior-high-students/count");
        const seniorHighData = await seniorHighResponse.json();
        document.getElementById("seniorHighCount").textContent = seniorHighData.count || 0;

        // fetch College Students Count
        const collegeResponse = await fetch("/api/college-students/count");
        const collegeData = await collegeResponse.json();
        document.getElementById("collegeCount").textContent = collegeData.count || 0;
    } catch (error) {
        console.error("Error fetching student counts:", error);
    }
});



// fetch users and update users registered table dynamically
document.addEventListener("DOMContentLoaded", function () {
    let currentPage = 1;
    const usersPerPage = 5;
    const usersTableBody = document.querySelector("#usersTableBody");
    const paginationContainer = document.querySelector("#pagination");

    async function fetchUsers(page = 1) {
        const offset = (page - 1) * usersPerPage;

        try {
            const response = await fetch(`/users?limit=${usersPerPage}&offset=${offset}&t=${Date.now()}`, { 
                method: 'GET',
                credentials: 'include',
            });                               

            if (!response.ok) {
                throw new Error("Failed to fetch users");
            }

            const data = await response.json();
            renderUsers(data.users);
            renderPagination(data.total_users, page);
        } catch (error) {
            console.error("Error loading users:", error);
        }
    }
    // render users
    function renderUsers(users) {
        usersTableBody.innerHTML = ""; // Clear table before adding new rows
    
        users.forEach(user => {
            const row = document.createElement("tr");
            row.classList.add("border-t");
            row.innerHTML = `
                <td class="py-2 md:py-3">${user.email}</td>
                <td>${user.first_name} ${user.last_name}</td>
                <td>
                    <a href="#" class="edit-user text-purple-600 hover:text-purple-800 mr-2 md:mr-3" data-id="${user.user_id}">Edit</a>
                    <a href="#" class="delete-user text-red-600 hover:text-red-800" data-id="${user.user_id}">Delete</a>
                </td>
            `;
    
            usersTableBody.append(row);
        });

        // add event listener to edit button
        document.querySelectorAll(".edit-user").forEach(button => {
            button.addEventListener("click", (e) => {
                e.preventDefault();
                const userId = e.target.getAttribute("data-id");
                openEditModal(userId, users);
            });
        });
        
        // add event listener to delete button
        document.querySelectorAll(".delete-user").forEach(button => {
            button.addEventListener("click", (e) => {
                e.preventDefault();
                const userId = e.target.getAttribute("data-id");
                openDeleteModal(userId, users);
            });
        });
    }

    // render pagination
    function renderPagination(totalUsers, currentPage) {
        const totalPages = Math.ceil(totalUsers / usersPerPage);
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
                fetchUsers(i);
            });
    
            paginationContainer.appendChild(button);
        }
    }
    
    fetchUsers(1); // fetch users
});

// function to open edit modal
async function openEditModal(userId, users) {
    const user = users.find(u => u.user_id == userId);
    if (!user) return;

    const currentUserResponse = await fetch('/current-user', { credentials: 'include' });
    const currentUser = await currentUserResponse.json();

    if (currentUser.role_id === 2 && user.role_id >= 2) {
        alert("You are not allowed to edit this user.");
        return;
    }

    document.getElementById("editUserId").value = userId;
    document.getElementById("editFirstName").value = user.first_name;
    document.getElementById("editLastName").value = user.last_name;
    document.getElementById("editEmail").value = user.email;  
    document.getElementById("editRoleId").value = user.role_id;

    document.getElementById("editModal").classList.remove("hidden");
}

// function to open delete modal
async function openDeleteModal(userId, users) {
    const user = users.find(u => u.user_id == userId);
    if (!user) return;

    const currentUserResponse = await fetch('/current-user', { credentials: 'include' });
    const currentUser = await currentUserResponse.json();

    if (currentUser.role_id === 2 && user.role_id >= 2) {
        alert("You are not allowed to delete this user.");
        return;
    }

    document.getElementById("deleteUserId").value = userId;
    document.getElementById("deleteModal").classList.remove("hidden");
}


// close Modal
document.getElementById("closeEditModal").addEventListener("click", () => {
    document.getElementById("editModal").classList.add("hidden");
});

// save edited user
document.getElementById("saveEditUser").addEventListener("click", async () => {
    const userId = document.getElementById("editUserId").value;
    const updatedUser = {
        email: document.getElementById("editEmail").value,
        first_name: document.getElementById("editFirstName").value,
        last_name: document.getElementById("editLastName").value,
        role_id: parseInt(document.getElementById("editRoleId").value)
    };

    try {
        const response = await fetch(`/users/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(updatedUser)
        });

        if (!response.ok) throw new Error("Failed to update user");

        document.getElementById("editModal").classList.add("hidden");
        fetchUsers(1);
    } catch (error) {
        console.error("Error updating user:", error);
    }
});

// close Modal
document.getElementById("closeDeleteModal").addEventListener("click", () => {
    document.getElementById("deleteModal").classList.add("hidden");
});

// confirm Delete User
document.getElementById("confirmDeleteUser").addEventListener("click", async () => {
    const userId = document.getElementById("deleteUserId").value;

    try {
        const response = await fetch(`/users/${userId}`, {
            method: "DELETE",
            credentials: "include"
        });

        if (!response.ok) throw new Error("Failed to delete user");

        document.getElementById("deleteModal").classList.add("hidden");
        // remove user from table without reloading the entire page
        document.querySelector(`.delete-user[data-id="${userId}"]`).closest("tr").remove();
        // refresh the users list dynamically
        fetchUsers(1);

    } catch (error) {
        console.error("Error deleting user:", error);
    }
});
