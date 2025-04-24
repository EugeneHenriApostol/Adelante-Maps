async function fetchTopSchools() { 
    const response = await fetch('/api/students/all-schools');
    const schools = await response.json();
  
    const schoolsWithCounts = schools
    .filter(school => school.name.toLowerCase() !== 'unknown')
    .map(school => {
      const totalStudents = (school.students_senior_high?.length || 0) + (school.students_college?.length || 0);
      return {
        id: school.id,
        name: school.name,
        latitude: school.latitude,
        longitude: school.longitude,
        totalStudents: totalStudents
      };
    });
  
    const top10Schools = schoolsWithCounts
      .sort((a, b) => b.totalStudents - a.totalStudents)
      .slice(0, 10);
  
    console.log("Top 10 Schools:", top10Schools);
  }
  
  fetchTopSchools();
  
  function displaySchools(schools) {
    const tableBody = document.querySelector("#schools-table tbody");
    tableBody.innerHTML = ""; // clear if any previous rows
  
    schools.forEach((school, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${school.name}</td>
        <td>${school.totalStudents}</td>
      `;
      tableBody.appendChild(row);
    });
  }
   