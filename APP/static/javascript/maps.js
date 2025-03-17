// Global variables
let selectedAreaType = null; 
let map; 
let markersLayer; 
let markers; 
let routesLayer; 
let currentRoute = null; 
let currentRouteControl = null; 
let currentRouteMarker = null; 
let allMarkers = [];
let populationLayers = []; 
let currentCircle = null;
let currentStudentData = [];
let clusterStatsChart;

let currentFilters = {
    course: new Set(),
    strand: new Set(),
    previous_school: new Set(),
    yearLevel: null,
    age: null,
};
let shapeAreas = []; 
let activeCluster = null; 
let drawControl; 
let drawnItems; 
// tracks drawn areas, arrays are populated when user draws a shape and select its area type
let affectedAreas = {
    flood: [],
    strike: [],
    restricted: [],
    fire: []
};
// track students affected by flood, strike or mobility restrictions, data is populated based on affected of students
let affectedStudents = {
    flood: [],
    strike: [],
    restricted: [],
    fire: []
};
let drawControlVisible = false;
// api and ic0n url
const SENIOR_HIGH_API_URL = 'http://localhost:8000/api/senior-high-student-data';
const COLLEGE_API_URL = 'http://localhost:8000/api/college-student-data';
const SCHOOL_ICON_URL = 'static/img/usjr.png';
const STUDENT_ICON_URL = 'static/img/student-icons.png';

const SHS_DEPARTMENTS = {
    "S.T.E.M.": ["S.T.E.M.-Engg", "S.T.E.M.-SciMed", "S.T.E.M.-Tech",],
    "A.B.M.": ["A.B.M.-Acctcy", "A.B.M.-Mktg/Mgt"],
    "Hum.S.S": ["Hum.S.S"],
    "TVL": ["TVL-Food Mgt.", "TVL-H.T.M.", "TVL-I.C.T."],
};

const COLLEGE_DEPARTMENTS = {
    SAS: ["A.B.- PHILO.", "BS Psych", "BA Com", "BA Journ", "BA MarCom", "BA PoS", "BAELS", "BLIS", "ABIS"],
    SAMS: ["BSMLS", "B.S.N.", "BS Bio-Medical", "BS Bio-Microbiology"],
    SBM: ["B.S.A.", "B.S.M.A.", "BSBA-MM", "BSBA-FM", "BSTM", "BS Entrep", "BSBA - OM", "BSBA-HRM", "BSHM", "BSHM - F and B"],
    SCS: ["B.S.C.S.", "B.S.I.T.", "B.S. E.M.C.", "B.S.G.D.", "BSIS", "A.C.T. - S.D."],
    SED: ["B.E.ED.", "BECEd", "BPEd", "BSEd-English", "BSEd-Math", "BSEd-Filipino", "BSEd-Science", "BSNEd-Generalist", "BSNEd-ECEd"],
    SOE: ["B.S.C.E.", "B.S.M.E.", "B.S.Cp.E.", "B.S.E.E.", "B.S.E.c.E.", "B.S.I.E."],
};

// school coordinates 
const schools = [
    {name: "USJ-R Main Campus", lat: 10.29442, lng: 123.89785},
    {name: "USJ-R Basak Campus", lat: 10.287451009936149, lng: 123.86271681110225}
];

// asynchronous function to fetch data
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

// initialize leaflet map
async function initializeMap() {
    map = L.map('map').setView([10.3157, 123.8854], 11); // map view (Cebu)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    // layers for markers, routes and population data
    markersLayer = L.layerGroup().addTo(map); // layer for school markers
    markers = L.markerClusterGroup(); // layer for cluster student markers
    routesLayer = L.layerGroup().addTo(map); // layer for student routes
    populationLayer = L.layerGroup().addTo(map); // layer for campus proximity

    addSchoolMarkers(); // add school markers to the map
    // control overlay layer
    const overlayLayers = {
        "Schools": markersLayer,
        "Toggle Route Display": routesLayer,
        "Near Campus Radius": populationLayer
    };
    const layerControl = L.control.layers({}, overlayLayers).addTo(map); // add layer control to the map.
    
    map.on('overlayadd', function (eventLayer) {
        if (eventLayer.name === 'Toggle Route Display') {
            toggleRouteVisibility(true);
        }
    });

    map.on('overlayremove', function (eventLayer) {
        if (eventLayer.name === 'Toggle Route Display') {
            toggleRouteVisibility(false);
        }
    });

    const studentRoutesCheckbox = document.querySelector('input[name="Toggle Route Display"]');
    if (studentRoutesCheckbox) {
        studentRoutesCheckbox.addEventListener('change', function() {
            toggleRouteVisibility(this.checked);
        });
    }

    // check for report_id in URL and handle it
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get('report_id');
    if (reportId) {
        await fetchAndRenderGeoJSON(reportId);

        // remove the report_id parameter from the URL
        const newUrl = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState({}, document.title, newUrl);
    }

    map.on('overlayadd overlayremove', function(e) {
        if (e.name === 'Toggle Route Display') {
            toggleRouteVisibility(e.type === 'overlayadd');
        }
    });
    // initialize drawn items group for managing shapes drawn on map
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // initialize leaflet draw control with custom options
    drawControl = new L.Control.Draw({
        draw: {
            polygon: {
                allowIntersection: false,
                drawError: {
                    color: '#e1e100',
                    message: '<strong>Oh snap!<strong> you can\'t draw that!'
                },
                shapeOptions: {
                    color: '#97009c'
                }
            },
            polyline: false,
            rectangle: {
                shapeOptions: {
                    color: '#004a80'
                }
            },
            circle: {
                shapeOptions: {
                    color: '#004a80'
                }
            },
            marker: false,
            circlemarker: false
        },
        edit: {
            featureGroup: drawnItems, 
            remove: true 
        }
    });
    function toggleDrawControl() {
        if (drawControlVisible) {
            map.removeControl(drawControl); // remove draw control from the map
        } else {
            map.addControl(drawControl); // add draw control to the map
        }
        drawControlVisible = !drawControlVisible; // update visibility state
    }
    
    document.getElementById("toggleDrawControl").addEventListener("click", toggleDrawControl);

    // function for when a shape is created on the map
    map.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
        drawnItems.addLayer(layer);
    
        // Clear previous shape areas
        shapeAreas = []; // reset shapeAreas to clear previous data
    
        // Calculate the area of the newly drawn shape
        const areaInSquareMeters = calculateArea(layer);
        const areaInSquareKilometers = areaInSquareMeters / 1e6; // convert to square kilometers
    
        // Store only the current shape's area
        shapeAreas.push(areaInSquareKilometers);
    
        // Prompt user for the type of affected area
        const areaType = prompt("Enter the type of affected area (flood, strike, restricted, or fire):");
        if (areaType && ['flood', 'strike', 'restricted', 'fire'].includes(areaType.toLowerCase())) {
            selectedAreaType = areaType.toLowerCase(); // Update the global variable
            layer.areaType = selectedAreaType;
            affectedAreas[selectedAreaType] = [layer.toGeoJSON()]; // Reset and store only the current shape
            updateAffectedStudents();
    
            // Display the affected area info
            displayAffectedAreaInfo(areaInSquareKilometers);
            displayTotalAreaInfo(); // Display total area (will only reflect the current shape)
        } else {
            drawnItems.removeLayer(layer); // Remove invalid shapes
            alert("Invalid area type. The shape was not added.");
        }
    });
}

function initializeChatbot() {
    const chatbotLink = document.getElementById('chatbot');
    const chatbotWidget = document.getElementById('chatbot-widget');
    const chatbotButton = document.getElementById('chatbot-widget-button');
    const closeChatbotBtn = document.getElementById('close-chatbot');

    // Widget button click
    chatbotButton.addEventListener('click', (e) => {
        e.preventDefault();
        chatbotWidget.classList.toggle('d-none');
        chatbotButton.style.display = chatbotWidget.classList.contains('d-none') ? 'flex' : 'none';
    });

    // Navbar link click
    chatbotLink.addEventListener('click', (e) => {
        e.preventDefault();
        chatbotWidget.classList.toggle('d-none');
        chatbotButton.style.display = chatbotWidget.classList.contains('d-none') ? 'flex' : 'none';
    });

    // Close button
    closeChatbotBtn.addEventListener('click', () => {
        chatbotWidget.classList.add('d-none');
        chatbotButton.style.display = 'flex';
    });
}

function initializePopulationDistribution() {
    const radiusSlider = document.getElementById('radius-slider');
    const radiusValue = document.getElementById('radius-value');

    radiusSlider.addEventListener('input', () => {
        const newRadius = parseInt(radiusSlider.value, 10);
        radiusValue.textContent = newRadius;
    
        // Update the radius for all population circles
        populationLayer.eachLayer(layer => {
            if (layer instanceof L.Circle) {
                layer.setRadius(newRadius);
                updateCirclePopup(layer, layer.school, currentStudentData);
            }
        });
    });
    
}

// async function to fetch and render geojson (restore shape on map)
async function fetchAndRenderGeoJSON(reportId) {
    try {
        // Fetch the report data from the API
        const response = await fetch(`/api/event-reports/${reportId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch report: ${response.statusText}`);
        }
        const report = await response.json();

        // Parse and render GeoJSON on the map
        const geojsonLayer = L.geoJSON(report.geojson, {
            style: {
                color: report.type === 'flood' ? 'blue' : 
                       report.type === 'strike' ? 'red' : 
                       report.type === 'restricted' ? 'green' : 
                       report.type === 'fire' ? 'orange' : 'gray',
                weight: 2,
                fillOpacity: 0.5
            }
        });
        geojsonLayer.addTo(map);

        // Adjust map view to fit the GeoJSON bounds
        map.fitBounds(geojsonLayer.getBounds());
    } catch (error) {
        console.error('Error fetching or rendering GeoJSON:', error);
    }
}

// async function to store affected area, types, number of students affected
async function storeAffectedData() {
    if (!selectedAreaType || !affectedStudents[selectedAreaType]) {
        console.error("Error: selectedAreaType or affectedStudents[selectedAreaType] is not properly defined.");
        return;
    }

    const numberOfStudentsAffected = affectedStudents[selectedAreaType].length; // get the count for the selected type
    const totalArea = calculateTotalArea(); // calculate total area
    const geojsonData = affectedAreas[selectedAreaType][0];

    // only send data for the selected area type
    if (numberOfStudentsAffected > 0 || totalArea > 0) {
        const payload = {
            type: selectedAreaType,
            number_of_students_affected: numberOfStudentsAffected,
            total_area: totalArea,
            geojson_data: geojsonData
        };

        try {
            const response = await fetch('http://localhost:8000/api/affected-areas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Data stored successfully:', result);
        } catch (error) {
            console.error('Error storing data:', error);
        }
    }
}

// function to update list of students based on drawn areas
function updateAffectedStudents() {
    affectedStudents = {
        flood: [],
        strike: [],
        restricted: [],
        fire: []
    };

    allMarkers.forEach(marker => {
        const studentPoint = turf.point([marker.getLatLng().lng, marker.getLatLng().lat]);
        const studentData = marker.options.studentData;

        for (const areaType in affectedAreas) {
            if (affectedAreas[areaType]) { // Check if areaType array exists
                affectedAreas[areaType].forEach(area => {
                    if (turf.booleanPointInPolygon(studentPoint, area)) {
                        affectedStudents[areaType].push(studentData);
                    }
                });
            }
        }
    });

    if (Object.values(affectedStudents).some(arr => arr.length > 0)) {
        displayAffectedStudentsInfo();
        updateMarkers(); // this updates the map to show affected students
        storeAffectedData(); // only store if there are affected students
    }
}
// function to calculate the area.
function calculateArea(layer) {
    if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
        // convert Leaflet layer to GeoJSON format
        const geoJsonLayer = layer.toGeoJSON();
        // calculate area using Turf.js (area in square meters)
        const area = turf.area(geoJsonLayer);
        return area; // return area in square meters
    } else if (layer instanceof L.Circle) {
        // for circles, the area is π * radius^2
        const radius = layer.getRadius();
        return Math.PI * Math.pow(radius, 2); // return area in square meters
    }
    return 0; // return 0 if not a supported shape
}

// function to display affected area info in the console
function displayAffectedAreaInfo(areaInSquareKilometers) {
    console.log(`Last Added Area: ${areaInSquareKilometers.toFixed(2)} square kilometers`);
}

// function to calculate and display the total area of all shapes in the console
function displayTotalAreaInfo() {
    const totalArea = calculateTotalArea();
    console.log(`Total Affected Area: ${totalArea.toFixed(2)} square kilometers`);
}

// function to calculate the total area of all drawn shapes
function calculateTotalArea() {
    return shapeAreas.length > 0 ? shapeAreas[0] : 0; // Return the area of the current shape
}
// function to display affected students info in the console
function displayAffectedStudentsInfo() {
    console.log(`Affected Students Information:`);
    console.log(`Flood: ${affectedStudents.flood.length} students`);
    console.log(`Transport Strikes: ${affectedStudents.strike.length} students`);
    console.log(`Mobility Restrictions: ${affectedStudents.restricted.length} students`);
    console.log(`Fire: ${affectedStudents.fire.length} students`);
}

// function to determine if student is affected
function isStudentAffected(student) {
    return affectedStudents.flood.includes(student) ||
           affectedStudents.strike.includes(student) ||
           affectedStudents.restricted.includes(student) ||
           affectedStudents.fire.includes(student)
}

function getMarkerColor(isAffected) {
    return isAffected ? '#ff6666' : '#3388ff'; // affected: red, not affected: blue
}

// function to add school markers on the map
function addSchoolMarkers() {
    const schoolIcon = L.icon({
        iconUrl: SCHOOL_ICON_URL,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });

    schools.forEach(school => {
        const marker = L.marker([school.lat, school.lng], { icon: schoolIcon })
            .bindPopup(`<b>${school.name}</b>`);
        markersLayer.addLayer(marker);
    });
}

// function to add filter controls
function addFilterControls() {
    const filterControls = L.control({ position: 'topright' });
    filterControls.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'leaflet-control leaflet-bar filter-controls');
        return div;
    };
    filterControls.addTo(map);
}

// function to generates filter checkboxes dynamically based on clustered student and appends them to a container
function generateFilterCheckboxes(containerId, items, filterType, isGrouped = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (isGrouped) {
        Object.keys(items).forEach(department => {
            const departmentDiv = document.createElement('div');
            departmentDiv.classList.add('department-group');

            const departmentHeader = document.createElement('div');
            departmentHeader.textContent = department;
            departmentHeader.classList.add('department-header');
            departmentDiv.appendChild(departmentHeader);

            items[department].forEach(item => {
                const div = document.createElement('div');
                div.classList.add('form-check');
                const checkbox = document.createElement('input');
                checkbox.classList.add('form-check-input');
                checkbox.type = 'checkbox';
                checkbox.id = `${filterType}-${item}`;
                checkbox.dataset[filterType] = item;

                const label = document.createElement('label');
                label.classList.add('form-check-label');
                label.htmlFor = checkbox.id;
                label.textContent = item;

                div.appendChild(checkbox);
                div.appendChild(label);
                departmentDiv.appendChild(div);
            });

            container.appendChild(departmentDiv);
        });
    } else {
        items.forEach(item => {
            const div = document.createElement('div');
            div.classList.add('form-check');
            const checkbox = document.createElement('input');
            checkbox.classList.add('form-check-input');
            checkbox.type = 'checkbox';
            checkbox.id = `${filterType}-${item}`;
            checkbox.dataset[filterType] = item;

            const label = document.createElement('label');
            label.classList.add('form-check-label');
            label.htmlFor = checkbox.id;
            label.textContent = item;

            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
        });
    }
}

// Function to toggle clustering
let activeButton = null; // Store the currently active button

async function toggleClustering(apiUrl, clusterType, buttonId) {
    console.log(`Fetching: ${apiUrl}?cluster_type=${clusterType}`);

    const button = document.getElementById(buttonId);

    if (activeCluster === `${apiUrl}-${clusterType}`) {
        clearRoute();
        markers.clearLayers();
        activeCluster = null;
        button.textContent = button.dataset.defaultText; // Reset button text
        activeButton = null; // No active button now
        return;
    }

    // Reset the previous active button before switching
    if (activeButton && activeButton !== button) {
        activeButton.textContent = activeButton.dataset.defaultText;
    }

    clearRoute();
    markers.clearLayers();
    activeCluster = `${apiUrl}-${clusterType}`;
    activeButton = button; // Set new active button

    const data = await fetchData(`${apiUrl}?cluster_type=${clusterType}`);
    console.log("Cluster data received:", data);

    addMarkers(data);
    map.addLayer(markers);
    createPopulationDistribution(data);

    // Update button text to hide
    button.textContent = `Hide ${button.dataset.defaultText}`;
}

function handleSeniorHighCluster(clusterType, buttonId) {
    toggleClustering(SENIOR_HIGH_API_URL, clusterType, buttonId);

    document.getElementById('strand-filter-section').style.display = activeCluster ? 'block' : 'none';
    document.getElementById('course-filter-section').style.display = 'none';
    document.getElementById('previous-school-filter-section').style.display = activeCluster ? 'block' : 'none';
}

function handleCollegeCluster(clusterType, buttonId) {
    toggleClustering(COLLEGE_API_URL, clusterType, buttonId);

    document.getElementById('course-filter-section').style.display = activeCluster ? 'block' : 'none';
    document.getElementById('strand-filter-section').style.display = 'none';
    document.getElementById('previous-school-filter-section').style.display = activeCluster ? 'block' : 'none';
}

function setupEventListeners() {
    const clusterButtons = [
        { id: 'seniorhighclusterbyaddress', clusterType: 'cluster_address', handler: handleSeniorHighCluster },
        { id: 'seniorhighclusterbyproximity', clusterType: 'cluster_proximity', handler: handleSeniorHighCluster },
        { id: 'collegeclusterbyaddress', clusterType: 'cluster_address', handler: handleCollegeCluster },
        { id: 'collegeclusterbyproximity', clusterType: 'cluster_proximity', handler: handleCollegeCluster }
    ];

    clusterButtons.forEach(({ id, clusterType, handler }) => {
        const button = document.getElementById(id);
        button.dataset.defaultText = button.textContent; // Store original text
        button.addEventListener('click', () => handler(clusterType, id));
    });

    document.getElementById('strand-checks').addEventListener('change', updateStrandFilters);
    document.getElementById('course-checks').addEventListener('change', updateCourseFilters);
    document.getElementById('previous-school-checks').addEventListener('change', updatePreviousSchoolFilters);
    document.getElementById('year-checks').addEventListener('change', updateYearFilter);
    document.getElementById('age-input').addEventListener('input', updateAgeFilter);
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    document.getElementById('clear-filters').addEventListener('click', clearFilters);
}

function updateStrandFilters() {
    const checkboxes = document.querySelectorAll('#strand-checks .form-check-input');
    currentFilters.strand.clear();
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            currentFilters.strand.add(checkbox.dataset.strand);
        }
    });
}

function updateCourseFilters() {
    const checkboxes = document.querySelectorAll('#course-checks .form-check-input');
    currentFilters.course.clear();
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            currentFilters.course.add(checkbox.dataset.course);
        }
    });
}

function updatePreviousSchoolFilters() {
    const checkboxes = document.querySelectorAll('#previous-school-checks .form-check-input');
    currentFilters.previous_school.clear();
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            currentFilters.previous_school.add(checkbox.dataset.previous_school);
        }
    });
}

function updateYearFilter() {
    const checkboxes = document.querySelectorAll('#year-checks .form-check-input');
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            currentFilters.yearLevel = parseInt(checkbox.dataset.year);
        }
    });
}

function updateAgeFilter(event) {
    currentFilters.age = event.target.value ? parseInt(event.target.value) : null;
}

function clearFilters() {
    currentFilters.course.clear();
    currentFilters.strand.clear();
    currentFilters.previous_school.clear();
    currentFilters.yearLevel = null;
    currentFilters.age = null;
    
    document.querySelectorAll('#strand-checks .form-check-input').forEach(checkbox => checkbox.checked = false);
    document.querySelectorAll('#course-checks .form-check-input').forEach(checkbox => checkbox.checked = false);
    document.querySelectorAll('#previous-school-checks .form-check-input').forEach(checkbox => checkbox.checked = false);
    document.querySelectorAll('#year-checks .form-check-input').forEach(checkbox => checkbox.checked = false);
    document.getElementById('age-input').value = '';
    
    applyFilters();
}

function applyFilters() {
    const filteredMarkers = allMarkers.filter(marker => {
        const studentData = marker.options.studentData;
        return showMarker(studentData);
    });

    markers.clearLayers();

    // If there are no filters applied, show all markers
    if (currentFilters.strand.size === 0 && currentFilters.course.size === 0 && currentFilters.previous_school.size === 0 && !currentFilters.yearLevel && !currentFilters.age) {
        allMarkers.forEach(marker => markers.addLayer(marker));
    } else {
        filteredMarkers.forEach(marker => markers.addLayer(marker));
    }

    map.addLayer(markers);
    updateMarkers();
}

function showMarker(student) {
    if (currentFilters.course.size > 0 && !currentFilters.course.has(student.course)) return false;
    if (currentFilters.strand.size > 0 && !currentFilters.strand.has(student.strand)) return false;
    if (currentFilters.previous_school.size > 0 && !currentFilters.previous_school.has(student.previous_school)) return false;
    if (currentFilters.yearLevel && student.year !== currentFilters.yearLevel) return false;
    if (currentFilters.age && student.age !== currentFilters.age) return false;
    return true;
}

function updateMarkers() {
    markers.clearLayers();
    allMarkers.forEach(marker => {
        const studentData = marker.options.studentData;
        if (showMarker(studentData)) {
            const isAffected = isStudentAffected(studentData);

            // Create a new marker with the default icon or a custom icon for affected students
            const newMarker = L.marker(marker.getLatLng(), {
                studentData: studentData
            }).bindPopup(() => generatePopupContent(studentData, isAffected));

            newMarker.on('click', () => {
                console.log('Marker clicked:', studentData); // Log the data being fetched
                handleStudentRoute(studentData);
            });
            markers.addLayer(newMarker);
        }
    });
    map.addLayer(markers);
}

function getAffectedIcon() {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style='background-color:red;' class='marker-pin'></div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42]
    });
}

function generatePopupContent(student, isAffected) {
    let content = "";

    if (student.strand && !student.course) {
        content += `<b>Strand:</b> ${student.strand}<br>`;
    }
    if (student.course) {
        content += `<b>Course:</b> ${student.course}<br>`;
    }

    content += `<b>Year Level:</b> ${student.year}<br>`;
    content += `<b>Age:</b> ${student.age}<br>`;
    content += `<b>Coordinates:</b> (${student.latitude}, ${student.longitude})<br>`;
    content += `<b>Previous School:</b> ${student.previous_school}<br>`;

    if (isAffected) {
        content += '<b>Affected by:</b> ';
        if (affectedStudents.flood.includes(student)) content += 'Flood ';
        if (affectedStudents.strike.includes(student)) content += 'Transport Strike ';
        if (affectedStudents.restricted.includes(student)) content += 'Mobility Restriction';
        if (affectedStudents.fire.includes(student)) content += 'Fire';
    }

    return content;
}

//populationDistribution
function createPopulationDistribution(data) {
    // Store the current student data
    currentStudentData = data;
    
    populationLayer.clearLayers();
    const radiusSlider = document.getElementById('radius-slider');
    const initialRadius = parseInt(radiusSlider.value, 10);

    schools.forEach(school => {
        const circle = L.circle([school.lat, school.lng], {
            color: '#FF0000',
            fillColor: '#FF0000',
            fillOpacity: 0.2,
            radius: initialRadius
        }).addTo(map);

        circle.school = school;
        updateCirclePopup(circle, school, currentStudentData);

        circle.on('click', () => {
            currentCircle = circle;
            radiusSlider.value = circle.getRadius();
            document.getElementById('radius-value').textContent = circle.getRadius();
            updateCirclePopup(circle, school, currentStudentData);
        });

        populationLayer.addLayer(circle);
    });
}

function updateCirclePopup(circle, school, data) {
    const radius = circle.getRadius();
    let studentCount = 0;

    // Count students based on active cluster type
    if (data && data.length > 0) {
        studentCount = data.filter(student => {
            // Check if coordinates are valid
            if (!student.latitude || !student.longitude || 
                isNaN(parseFloat(student.latitude)) || 
                isNaN(parseFloat(student.longitude))) {
                return false;
            }

            const distance = calculateDistance(
                school.lat, 
                school.lng,
                parseFloat(student.latitude), 
                parseFloat(student.longitude)
            ) * 1000; // convert km to meters
            
            return distance <= radius;
        }).length;
    }

    // Update popup content with student type indicator
    const studentType = data && data[0]?.strand ? 'Senior High' : 'College';
    const popupContent = 
        `<b>${school.name}</b><br>` +
        `<b>${studentType} Students</b> within ${(radius / 1000).toFixed(1)}km: ${studentCount}`;

    circle.bindPopup(popupContent);
    
    // Update popup if it's currently open
    if (circle.isPopupOpen()) {
        circle.getPopup().setContent(popupContent);
    }
}

//calculate Distance covers both routing and students within campus radius
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
}


const originalAddMarkers = addMarkers;
function addMarkers(data) {
    markers.clearLayers(); // Reset the marker cluster group

    allMarkers = data.reduce((markerArray, item) => {
        const { latitude, longitude, cluster } = item;

        // Exclude students outside Cebu when cluster_proximity is active
        if (activeCluster.includes("cluster_proximity") && cluster === -1) {
            return markerArray; // Skip non-Cebu students
        }

        if (latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
            const marker = L.marker([parseFloat(latitude), parseFloat(longitude)], {
                studentData: item
            }).bindPopup(() => generatePopupContent(item));

            marker.on('click', () => {
                console.log('Marker clicked:', item); // Log the data being fetched
                handleStudentRoute(item);
            });

            markerArray.push(marker);
            markers.addLayer(marker); // Add marker to the cluster group
        }
        return markerArray;
    }, []);

    map.addLayer(markers); // Add the cluster group to the map

    const yearLevels = [...new Set(data.map(item => item.year).filter(Boolean))];
    const previousSchools = [...new Set(data.map(item => item.previous_school).filter(Boolean))];

    generateFilterCheckboxes('strand-checks', SHS_DEPARTMENTS, 'strand', true);
    generateFilterCheckboxes('year-checks', yearLevels, 'year');
    generateFilterCheckboxes('course-checks', COLLEGE_DEPARTMENTS, 'course', true);
    generateFilterCheckboxes('previous-school-checks', previousSchools, 'previous_school');
    createPopulationDistribution(data);
    updateAffectedStudents();

    applyFilters();
}

function studentType(student) {
    if (student.course) {
        return true;
    }

    if (student.strand) {
        return false;
    }
    
    if (student.department) {
        return Object.values(COLLEGE_DEPARTMENTS).some(depts => 
            depts.includes(student.department)
        );
    }
    
    return false;
}

// function calculateDistance(lat1, lng1, lat2, lng2) {
//     const R = 6371; // Radius of Earth in kilometers
//     const dLat = ((lat2 - lat1) * Math.PI) / 180;
//     const dLng = ((lng2 - lng1) * Math.PI) / 180;

//     const a =
//         Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//         Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
//         Math.sin(dLng / 2) * Math.sin(dLng / 2);

//     return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // Distance in kilometers
// }

function determineCampus(student) {
    const isCollege = studentType(student);
    
    if (isCollege) {
        const courseInSCS = COLLEGE_DEPARTMENTS.SCS.includes(student.course);
        const courseInSED = COLLEGE_DEPARTMENTS.SED.includes(student.course);
        
        if (courseInSCS || courseInSED) {
            return schools.find(school => school.name === "USJ-R Basak Campus");
        }
        
        return schools.find(school => school.name === "USJ-R Main Campus");
    }
    
    return schools.reduce((nearest, school) => {
        const distance = calculateDistance(student.latitude, student.longitude, school.lat, school.lng);
        return !nearest || distance < nearest.distance ? { school, distance } : nearest;
    }, null)?.school;
}

function handleStudentRoute(student, focusRoute = true) {
    const studentLat = parseFloat(student.latitude);
    const studentLng = parseFloat(student.longitude);

    if (isNaN(studentLat) || isNaN(studentLng)) {
        console.error(`Invalid lat/lng for student: ${student.name}`);
        return;
    }

    const selectedCampus = determineCampus(student);
    if (!selectedCampus) {
        console.error('Unable to determine the campus for:', student);
        return;
    }

    const routeColor = studentType(student) ? 'blue' : 'green';

    // Find the marker for this student
    const clickedMarker = markers.getLayers().find(marker => 
        marker.options.studentData === student
    );

    // If clicking on the same marker, clear the route and reset the icon
    if (currentRouteMarker === clickedMarker) {
        console.log('Clearing existing route');
        clearRoute();
        return;
    }

    // Clear any existing route
    clearRoute();

    currentRouteControl = L.Routing.control({
        waypoints: [
            L.latLng(studentLat, studentLng),
            L.latLng(selectedCampus.lat, selectedCampus.lng),
        ],
        lineOptions: {
            styles: [{ color: routeColor, weight: 4 }],
        },
        createMarker: (i, wp, nWps) => {
            if (i === 0) return L.marker(wp.latLng).bindPopup(`Student: ${student.name}`);
            if (i === nWps - 1) return L.marker(wp.latLng, {
                icon: L.icon({ iconUrl: SCHOOL_ICON_URL, iconSize: [40, 40], iconAnchor: [20, 40] })
            }).bindPopup(`Campus: ${selectedCampus.name}`);
        },
    }).addTo(map);

    currentRouteControl.on('routesfound', e => {
        const routes = e.routes;
        console.log('Route found:', routes);
        currentRoute = L.polyline(routes[0].coordinates, { color: routeColor });
        routesLayer.addLayer(currentRoute);
    });

    // store the current marker and change its icon
    currentRouteMarker = clickedMarker;
    if (currentRouteMarker) {
        currentRouteMarker.setIcon(L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#4a83ec;' class='marker-pin'></div>",
            iconSize: [30, 42],
            iconAnchor: [15, 42]
        }));
    }
    console.log('Current route marker set:', currentRouteMarker);
}

function toggleRouteVisibility(isVisible) {
    if (currentRouteControl) currentRouteControl.getContainer().style.display = isVisible ? 'block' : 'none';
    if (currentRoute) {
        isVisible ? routesLayer.addLayer(currentRoute) : routesLayer.removeLayer(currentRoute);
    }
    if (!isVisible) clearRoute();
}

function clearRoute() {
    if (currentRouteControl) {
        map.removeControl(currentRouteControl);
        currentRouteControl = null;
    }
    if (currentRoute) {
        routesLayer.removeLayer(currentRoute);
        currentRoute = null;
    }
    if (currentRouteMarker) {
        currentRouteMarker.setIcon(L.Icon.Default.prototype);
        currentRouteMarker = null;
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    initializeMap();
    setupEventListeners();
    addFilterControls();
    initializePopulationDistribution();
    initializeChatbot();

    markers = L.markerClusterGroup();
    map.addLayer(markers);
});

document.getElementById('seniorHighData').addEventListener('click', function() {
    window.location.href = '/seniorhigh/data-analytics';
});

document.getElementById('collegeData').addEventListener('click', function() {
    window.location.href = '/college/data-analytics';
});

document.getElementById('eventReportsLink').addEventListener('click', function () {
    window.location.href = '/event-reports';
});

document.getElementById('chatbot').addEventListener('click', function () {
    window.location.href = '/chatbot';
});

document.addEventListener('DOMContentLoaded', () => {
    const filterSidebar = document.getElementById('filterSidebar');
    const map = document.getElementById('map');

    // Bootstrap Offcanvas Events
    filterSidebar.addEventListener('show.bs.offcanvas', () => {
        map.style.transition = 'margin-left 1s ease'; // Smooth transition for map
        map.style.marginLeft = `${filterSidebar.offsetWidth}px`; // Push map right
    });

    filterSidebar.addEventListener('hide.bs.offcanvas', () => {
        map.style.transition = 'margin-left 1s ease'; // Smooth transition for map
        map.style.marginLeft = '0'; // Reset map position to original
    });
});

document.addEventListener('click', async (event) => {
    if (event.target.id === 'logoutButton') {
        event.preventDefault();

        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
            if (response.ok) {
                window.location.href = '/login';
            } else {
                alert('Failed to log out. Please try again.');
            }
        } catch (error) {
            console.error('Logout failed:', error);
            alert('An error occurred during logout.');
        }
    }
});


document.addEventListener('DOMContentLoaded', () => {
    // Check if the page is loaded within an iframe
    if (window.self !== window.top) {
        // Hide the navigation bar
        const navbar = document.getElementById('navbar');
        if (navbar) {
            navbar.style.display = 'none';
        }
    }
});