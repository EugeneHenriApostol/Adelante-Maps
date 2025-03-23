const apiUrl = "/api/college-students";
let page = 1;
const pageSize = 10;

document.getElementById("listTitle").textContent = "College Students List";

async function fetchStudents() {
    try {
        const studentsTableBody = document.getElementById("studentsTableBody");
        
        // Smooth fade-out animation
        studentsTableBody.style.opacity = "0";
        
        const response = await fetch(`${apiUrl}?page=${page}&page_size=${pageSize}`);
        const data = await response.json();

        // Clear previous rows
        studentsTableBody.innerHTML = "";

        const noResultsMessage = document.getElementById("noResultsMessage");
        if (data.students.length === 0) {
            noResultsMessage.classList.remove("hidden");
        } else {
            noResultsMessage.classList.add("hidden");

            // Add the new rows
            data.students.forEach((student, index) => {
                const row = document.createElement("tr");
                row.className = index % 2 === 0 ? "bg-white" : "bg-gray-50";
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.year}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.course}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.strand}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.previous_school}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.age}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.full_address}</td>
                `;
                studentsTableBody.appendChild(row);
            });
        }

        // Smooth fade-in animation
        studentsTableBody.style.opacity = "1";

        // Update pagination
        const totalPages = Math.ceil(data.total / data.page_size);
        document.getElementById("paginationInfo").textContent = `Page ${data.page} of ${totalPages}`;
        document.getElementById("prevPage").disabled = page <= 1;
        document.getElementById("nextPage").disabled = page >= totalPages;
    } catch (error) {
        console.error("Error fetching senior high students:", error);
        studentsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-red-500">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    Error loading data. Please try again.
                </td>
            </tr>
        `;
    }
}


document.getElementById("prevPage").addEventListener("click", () => {
    if (page > 1) {
        page--;
        fetchStudents();
    }
});

document.getElementById("nextPage").addEventListener("click", () => {
    page++;
    fetchStudents();
});

// Initial data fetch
fetchStudents();