let editingCourseId = null;

const courseTableBody = document.querySelector("#courseTable tbody");
const campusSelect = document.getElementById("campusSelect");
const courseFormModal = document.getElementById("courseFormModal");
const courseForm = document.getElementById("courseForm");

function showCourseForm() {
    courseFormModal.style.display = "flex";
}
  
function hideCourseForm() {
    courseFormModal.style.display = "none";
    courseForm.reset();
    editingCourseId = null;
}

function editCourse(id, name, campus_id) {
    editingCourseId = id;
    document.getElementById("courseName").value = name;
    document.getElementById("campusSelect").value = campus_id;
    courseFormModal.style.display = "flex";
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

async function fetchCourses() {
    const [courseResponse, campusResponse] = await Promise.all([
        fetch("/api/retrieve/courses"),
        fetch("/api/retrieve/campuses")
    ]);

    const courses = await courseResponse.json();
    const campuses = await campusResponse.json();

    // Create a campus_id to name map
    const campusMap = {};
    campuses.forEach(c => campusMap[c.campus_id] = c.name);

    courseTableBody.innerHTML = "";
    for (const course of courses) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${course.name}</td>
            <td>${campusMap[course.campus_id] || 'Unknown'}</td>
            <td>
                <button onclick="editCourse(${course.course_id}, '${course.name}', ${course.campus_id})">Edit</button>
                <button onclick="deleteCourse(${course.course_id})">Delete</button>
            </td>
        `;
        courseTableBody.appendChild(row);
    }
}

courseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("courseName").value;
    const campus_id = parseInt(document.getElementById("campusSelect").value);

    if (editingCourseId) {
        // Edit existing course
        const response = await fetch(`/api/courses/${editingCourseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, campus_id }),
        });

        if (response.ok) {
        editingCourseId = null;
        hideCourseForm();
        fetchCourses();
        } else {
        const data = await response.json();
        alert(data.detail || "Error updating course.");
        }
    } else {
        // Create new course
        const response = await fetch("/api/courses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, campus_id }),
        });

        if (response.ok) {
            hideCourseForm();
            fetchCourses();
        } else {
            const data = await response.json();
            alert(data.detail || "Error creating course.");
        }
    }
});
  

async function deleteCourse(id) {
    if (!confirm("Are you sure you want to delete this course?")) return;
    const response = await fetch(`/api/courses/${id}`, { method: "DELETE" });
    if (response.ok) {
        fetchcourses();
    } else {
        alert("Error deleting course.");
    }
}

window.onload = async () => {
    await fetchCampuses();
    await fetchCourses();
};
