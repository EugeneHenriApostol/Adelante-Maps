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


// fetch users and update users registered table dynamically
document.addEventListener("DOMContentLoaded", function () {
    let currentPage = 1;
    const usersPerPage = 5;
    const usersTableBody = document.querySelector("#usersTableBody");
    const paginationContainer = document.querySelector("#pagination");

    async function fetchUsers(page = 1) {
        const offset = (page - 1) * usersPerPage;

        try {
            const response = await fetch(`/users?limit=${usersPerPage}&offset=${offset}`, {
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

    function renderUsers(users) {
        usersTableBody.innerHTML = ""; // clear table before adding new rows

        users.forEach(user => {
            const row = document.createElement("tr");
            row.classList.add("border-t");
            row.innerHTML = `
                <td class="py-2 md:py-3">${user.email}</td>
                <td>${user.first_name} ${user.last_name}</td>
                <td>
                    <a href="#" class="text-purple-600 hover:text-purple-800 mr-2 md:mr-3">Edit</a>
                    <a href="#" class="text-purple-600 hover:text-purple-800">Delete</a>
                </td>
            `;
            usersTableBody.appendChild(row);
        });
    }

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
                currentPage = i;
                fetchUsers(currentPage);
            });
    
            paginationContainer.appendChild(button);
        }
    }
    

    fetchUsers(currentPage); // fetch users
});
