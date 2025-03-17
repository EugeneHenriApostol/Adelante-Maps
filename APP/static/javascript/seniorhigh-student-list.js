const apiUrl = "/api/senior-high-students";
let page = 1;
const pageSize = 10;

document.getElementById("listTitle").textContent = "Senior High Students List";

async function fetchStudents() {
    try {
        // Show loading state
        document.getElementById("studentsTableBody").innerHTML = `
            <tr class="animate-pulse">
                <td class="px-6 py-4 whitespace-nowrap"><div class="h-4 bg-gray-200 rounded w-8"></div></td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="h-4 bg-gray-200 rounded w-24"></div></td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="h-4 bg-gray-200 rounded w-48"></div></td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="h-4 bg-gray-200 rounded w-8"></div></td>
            </tr>
            <tr class="animate-pulse">
                <td class="px-6 py-4 whitespace-nowrap"><div class="h-4 bg-gray-200 rounded w-8"></div></td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="h-4 bg-gray-200 rounded w-24"></div></td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="h-4 bg-gray-200 rounded w-48"></div></td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="h-4 bg-gray-200 rounded w-8"></div></td>
            </tr>
        `;
        
        const response = await fetch(`${apiUrl}?page=${page}&page_size=${pageSize}`);
        const data = await response.json();
        
        const studentsTableBody = document.getElementById("studentsTableBody");
        studentsTableBody.innerHTML = "";

        // Show/hide no results message
        const noResultsMessage = document.getElementById("noResultsMessage");
        if (data.students.length === 0) {
            noResultsMessage.classList.remove("hidden");
        } else {
            noResultsMessage.classList.add("hidden");
            
            data.students.forEach((student, index) => {
                const row = document.createElement("tr");
                row.className = index % 2 === 0 ? "bg-white" : "bg-gray-50";
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.year}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.strand}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.previous_school}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.age}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${student.full_address}</td>
                `;
                studentsTableBody.appendChild(row);
            });
        }

        // Update pagination
        const totalPages = Math.ceil(data.total / data.page_size);
        document.getElementById("paginationInfo").textContent = `Page ${data.page} of ${totalPages}`;
        document.getElementById("prevPage").disabled = page <= 1;
        document.getElementById("nextPage").disabled = page >= totalPages;
    } catch (error) {
        console.error("Error fetching senior high students:", error);
        document.getElementById("studentsTableBody").innerHTML = `
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