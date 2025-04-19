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
let currentCircle = null;
let currentStudentData = [];
let clusterStatsChart;
let previouslySelectedStudent = null;

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
// tracks drawn areas
let affectedAreas = {
    flood: [],
    strike: [],
    restricted: [],
    fire: []
};
// track students affected by flood, strike or mobility restrictions
let affectedStudents = {
    flood: [],
    strike: [],
    restricted: [],
    fire: []
};

let drawControlVisible = false;

let currentRoutingMode = 'studentToCampus'; // 'studentToCampus' or 'campusToAffected'
let hazardZone = null; // Store the hazard zone polygon
// api and ic0n url
const SENIOR_HIGH_API_URL = '/api/senior-high-student-data';
const COLLEGE_API_URL = '/api/college-student-data';
const PREVIOUS_SCHOOL_API_URL = '/api/previous-schools';
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
let schools = [];
async function loadCampuses() {
    try {
        const response = await fetch('/api/retrieve/campuses');
        if (!response.ok) {
            throw new Error('Failed to fetch campuses');
        }

        const campuses = await response.json();

        schools = campuses.map(campus => ({
            name: campus.name,
            lat: campus.latitude,
            lng: campus.longitude
        }));

        schools.forEach(campus => {
            const schoolIcon = L.icon({
                iconUrl: 'static/img/usjr.png',
                iconSize: [40, 40],
                iconAnchor: [20, 40],
                popupAnchor: [0, -40]
            });

            const marker = L.marker([campus.lat, campus.lng], { icon: schoolIcon }).addTo(map);
            marker.bindPopup(`<b>${campus.name}</b>`);
        });

    } catch (error) {
        console.error('Error loading campuses:', error);
    }
}

let campusMarker = null;
let isAddingCampus = false;

document.getElementById('addCampusBtn').addEventListener('click', () => {
    isAddingCampus = true;
    alert('Click on the map to place the campus location.');

    map.once('click', function (e) {
        if (campusMarker) {
            map.removeLayer(campusMarker);
        }

        const { lat, lng } = e.latlng;

        const schoolIcon = L.icon({
            iconUrl: 'static/img/usjr.png',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });

        campusMarker = L.marker([lat, lng], { icon: schoolIcon, draggable: true }).addTo(map)
            .bindPopup(`
                <form id="campusForm" style="min-width: 250px; max-width: 300px;">
                    <div style="margin-bottom: 10px;">
                        <label for="campusName">Campus Name:</label><br>
                        <input type="text" id="campusName" class="form-control" style="width: 100%;" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-sm">Save Campus</button>
                </form>
            `).openPopup();

        // Submit logic
        setTimeout(() => {
            document.getElementById('campusForm').addEventListener('submit', async function (event) {
                event.preventDefault();

                const name = document.getElementById('campusName').value;
                const latitude = campusMarker.getLatLng().lat;
                const longitude = campusMarker.getLatLng().lng;

                const payload = {
                    name,
                    latitude,
                    longitude
                };

                try {
                    const response = await fetch('/api/campuses', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
                    }

                    const result = await response.json();
                    alert('Campus saved successfully!');

                    // ✅ Reset the state
                    map.removeLayer(campusMarker); // remove marker from map
                    campusMarker = null;           // reset marker variable
                    isAddingCampus = false;        // reset adding state

                } catch (error) {
                    alert(`Error saving campus: ${error.message}`);
                }
            });
        }, 100);
    });
});

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

function enhanceGeocoder() {
    // prioritize location search in the Philippines
    const customGeocoder = L.Control.Geocoder.nominatim({
        geocodingQueryParams: {
            countrycodes: 'ph',
            addressdetails: 1,
            format: 'json',
            // improve Cebu-specific results
            viewbox: '122.5,9.0,126.0,11.5',
            bounded: 1
        }
    });
    
    // custom name formatting for philippine locations
    const enhancedGeocoder = {
        geocode: function(query, cb, context) {
            customGeocoder.geocode(query, function(results) {
                // filter results to prioritize boundaries
                const enhancedResults = results.map(result => {
                    // display name for barangay level searches
                    if (result.properties && result.properties.address) {
                        const address = result.properties.address;
                        // format specifically for barangays
                        if (address.hamlet || address.suburb || address.village) {
                            const barangay = address.hamlet || address.suburb || address.village;
                            const city = address.city || address.town || address.municipality || '';
                            const province = address.province || address.state || '';
                            result.properties.displayName = `Barangay ${barangay}, ${city}, ${province}`;
                        }
                    }
                    return result;
                });
                
                cb.call(context, enhancedResults);
            }, context);
        },
        suggest: function(query, cb, context) {
            customGeocoder.suggest(query, cb, context);
        },
        abort: function() {
            customGeocoder.abort();
        }
    };
    
    return enhancedGeocoder;
}

let circleDrawControlVisible = false;
let incidentCircle = null;

let startPoint = null;
let endPoint = null;

let floodPolygon = null;

// initialize leaflet map
async function initializeMap() {
    map = L.map('map').setView([10.3157, 123.8854], 11); // map view (Cebu)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // add geocoder control to the map
    const geocoder = L.Control.geocoder({
        defaultMarkGeocode: false,
        position: 'topleft',
        placeholder: 'Search for location...',
        errorMessage: 'Nothing found.',
        geocoder: L.Control.Geocoder.nominatim({
            // add country context to prioritize ph results
            countrycodes: 'ph',
            // improve results for administrative boundaries
            addressdetails: 1,
            viewbox: [[122.5, 9.0], [126.0, 11.5]], // approximate bounding box for Cebu region
            bounded: 1
        })
    }).addTo(map);
    
    // handle geocodie results
    geocoder.on('markgeocode', function(e) {
        const bbox = e.geocode.bbox;
        const poly = L.polygon([
            bbox.getSouthEast(),
            bbox.getNorthEast(),
            bbox.getNorthWest(),
            bbox.getSouthWest()
        ]).addTo(map);
        
        map.fitBounds(poly.getBounds());
        
        // remove the polygon after 30 seconds
        setTimeout(function() {
            map.removeLayer(poly);
        }, 30000);
    });

    // layers for markers, routes and population data
    markersLayer = L.layerGroup().addTo(map); // layer for school markers
    markers = L.layerGroup(); // layer for cluster student markers
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
            circle: false,
            marker: false,
            circlemarker: false
        }
    });

    circleDrawControl = new L.Control.Draw({
        draw: {
            polygon: false,
            polyline: false,
            rectangle: false,
            marker: false,
            circlemarker: false,
            circle: {
                shapeOptions: {
                    color: '#ff0000',
                    fillOpacity: 0.4
                }
            }
        },
        edit: false
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

    // function to open the modal
    function openAreaTypeModal() {
        const modal = document.getElementById('areaTypeModal');
        modal.style.display = 'flex';
    }

    // function to close the modal
    function closeAreaTypeModal() {
        const modal = document.getElementById('areaTypeModal');
        modal.style.display = 'none';
    }

    // function for when a shape is created on the map
    // Modify your circle draw control handler to store the hazard zone
    map.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
        
        if (e.layerType === 'circle') {
            if (incidentCircle) {
                drawnItems.removeLayer(incidentCircle);
            }
            incidentCircle = e.layer;
            drawnItems.addLayer(incidentCircle);
            
            const { lat, lng } = incidentCircle.getLatLng();
            const radiusInKm = incidentCircle.getRadius() / 1000;
            
            // Store the hazard zone globally
            hazardZone = turf.circle([lng, lat], radiusInKm, {
                steps: 64,
                units: 'kilometers'
            });
            
            incidentCircle.bindTooltip("Hazard Zone", {
                permanent: true,
                direction: "center",
                className: "incident-tooltip"
            }).openTooltip();
            
            incidentCircle.on('click', function () {
                const confirmDelete = confirm('Do you want to remove this hazard zone?');
                if (confirmDelete) {
                    drawnItems.removeLayer(incidentCircle);
                    incidentCircle = null;
                    hazardZone = null;
                }
            });
        } else {
            // Existing polygon creation logic
            drawnItems.addLayer(layer);
            shapeAreas = [];
            const areaInSquareMeters = calculateArea(layer);
            const areaInSquareKilometers = areaInSquareMeters / 1e6;
            shapeAreas.push(areaInSquareKilometers);
            window.currentLayer = layer;
            openAreaTypeModal();
        }
    });
    
    function toggleCircleDrawControl() {
        if (circleDrawControlVisible) {
            map.removeControl(circleDrawControl);
        } else {
            map.addControl(circleDrawControl);
        }
        circleDrawControlVisible = !circleDrawControlVisible;
    }
    
    document.getElementById("toggleCircleDrawControl").addEventListener("click", toggleCircleDrawControl);
    
    // Calculate route function (using the floodPolygon globally)
    function calculateRoute(startPoint, endPoint) {
        const url = `http://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson`;
    
        console.log("OSRM Request URL:", url); // Log the request URL
    
        if (floodPolygon) {
            console.log("Flood Polygon:", floodPolygon); // Log the flood polygon
    
            fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log("OSRM Response Data:", data);
                
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    console.log("Route found:", route);
                    
                    // Pass the entire data object to displayRoute
                    displayRoute(data);
                } else {
                    console.error("No routes found in response");
                }
            })
            .catch(error => console.error('Error fetching route data:', error));
        } else {
            console.error("Flood polygon not defined!");
        }
    }
    
    
    
    // Function to display the route on the map
    function displayRoute(routeData) {
        if (routeData && routeData.routes && routeData.routes.length > 0) {
            const route = routeData.routes[0];
            if (route.geometry) {
                console.log("Adding route to map:", route.geometry);
                L.geoJSON(route.geometry).addTo(map);
            } else {
                console.error("No geometry found in route");
            }
        } else {
            console.error("No valid route data found");
        }
    }
    
    // Modify your map click handler to handle both routing modes
    map.on('click', function(e) {
        if (currentRoutingMode === 'studentToCampus') {
            // Existing student to campus routing logic
            if (!startPoint) {
                startPoint = e.latlng;
            } else if (!endPoint) {
                endPoint = e.latlng;
                calculateRoute(startPoint, endPoint);
            }
        } else {
            // New campus to affected area routing logic
            if (!hazardZone) {
                alert('Please draw a hazard zone first using the Incident Location tool');
                return;
            }
            
            const clickedPoint = e.latlng;
            const nearestCampus = findNearestCampus(clickedPoint);
            
            if (nearestCampus) {
                calculateCampusToAffectedRoute(nearestCampus, clickedPoint, hazardZone);
            }
        }
    });

    // handle area type selection
    document.getElementById('confirmAreaType').addEventListener('click', () => {
        const selectedRadio = document.querySelector('input[name="areaType"]:checked');

        if (selectedRadio) {
            const areaType = selectedRadio.value;
            selectedAreaType = areaType;  // store the selected area type
            window.currentLayer.areaType = areaType;  // add type to layer
            affectedAreas[areaType] = [window.currentLayer.toGeoJSON()];  // Store shape data

            updateAffectedStudents();
            displayAffectedAreaInfo(shapeAreas[0]);
            displayTotalAreaInfo();

            closeAreaTypeModal();
        } else {
            alert("Please select an area type.");
        }
    });

    // modal cancel
    document.getElementById('cancelAreaType').addEventListener('click', () => {
        if (window.currentLayer) {
            drawnItems.removeLayer(window.currentLayer);  // remove the shape if cancelled
        }
        closeAreaTypeModal();
    });

    // Add this in your initializeMap function after other event listeners
    document.getElementById('routingModeToggle').addEventListener('change', function(e) {
        currentRoutingMode = e.target.checked ? 'campusToAffected' : 'studentToCampus';
        document.getElementById('routingModeLabel').textContent = 
            currentRoutingMode === 'studentToCampus' ? 'Student to Campus' : 'Campus to Affected Area';
        clearRoute();
    });
}

function initializePopulationDistribution() {
    const radiusSlider = document.getElementById('radius-slider');
    const radiusValue = document.getElementById('radius-value');

    radiusSlider.addEventListener('input', () => {
        const newRadius = parseInt(radiusSlider.value, 10);
        radiusValue.textContent = newRadius;
    
        // treat each campus radius as individual for size slider
        if (currentCircle) {
            currentCircle.setRadius(newRadius);
            updateCirclePopup(currentCircle, currentCircle.school, currentStudentData);
        }
    });
    
}

// async function to fetch and render geojson to restore shape on map
async function fetchAndRenderGeoJSON(reportId) {
    try {
        // fetch the report data from the API
        const response = await fetch(`/api/event-reports/${reportId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch report: ${response.statusText}`);
        }
        const report = await response.json();

        // parse and render geojson on the map
        const geojsonLayer = L.geoJSON(report.geojson, {
            style: {
                color: report.type === 'flood' ? 'blue' : 
                       report.type === 'strike' ? 'red' : 
                       report.type === 'mobility restriction' ? 'green' : 
                       report.type === 'fire' ? 'orange' : 'gray',
                weight: 2,
                fillOpacity: 0.5
            }
        });
        geojsonLayer.addTo(map);

        // adjust map view to fit the geojson look
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

    const numberOfStudentsAffected = affectedStudents[selectedAreaType].length; 
    const totalArea = calculateTotalArea(); 
    const geojsonData = affectedAreas[selectedAreaType][0];

    console.log("GeoJSON data:", geojsonData);

    if (numberOfStudentsAffected > 0 || totalArea > 0) {
        const payload = {
            type: selectedAreaType === 'restricted' ? 'mobility restriction' : selectedAreaType,
            number_of_students_affected: numberOfStudentsAffected,
            total_area: totalArea,
            geojson_data: geojsonData,
            clustering_type: currentClusterType,          
            education_level: currentEducationLevel    
        };

        console.log("Payload being sent:", JSON.stringify(payload, null, 2));

        try {
            const response = await fetch('/api/affected-areas', {
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
            if (affectedAreas[areaType]) { // check if areaType array exists
                affectedAreas[areaType].forEach((geoJsonArea) => {
                    if (geoJsonArea && geoJsonArea.geometry && turf.booleanPointInPolygon(studentPoint, geoJsonArea)) {
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
    }
    return 0; // return 0 if not a supported shape
}

// function to display affected area info in the console log
function displayAffectedAreaInfo(areaInSquareKilometers) {
    console.log(`Last Added Area: ${areaInSquareKilometers.toFixed(2)} square kilometers`);
}

// function to calculate and display the total area of all shapes in the console log
function displayTotalAreaInfo() {
    const totalArea = calculateTotalArea();
    console.log(`Total Affected Area: ${totalArea.toFixed(2)} square kilometers`);
}

// function to calculate the total area of all drawn shapes
function calculateTotalArea() {
    return shapeAreas.length > 0 ? shapeAreas[0] : 0; // return the area of the current shape
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

const schoolIcon = L.icon({
    iconUrl: '/static/img/university.png', // update with your actual path
    iconSize: [30, 40], // width, height in pixels
    iconAnchor: [15, 40], // point of the icon which will correspond to marker's location
    popupAnchor: [0, -40] // point from which the popup should open relative to the iconAnchor
});


// add previous school
async function plotPreviousSchools() {
    clearRoute();  // clear any previous polylines/routes if applicable
    markers.clearLayers();  // clear other markers
    activeCluster = null;  // reset cluster state
    currentClusterType = null;
    currentEducationLevel = null;

    const schools = await fetchData(PREVIOUS_SCHOOL_API_URL);
    console.log("Previous schools:", schools);

    // Group schools by latitude and longitude to avoid duplicating markers
    const groupedSchools = {};

    schools.forEach((school) => {
        const { latitude, longitude, name, senior_high_count, college_count } = school;
        const key = `${latitude.toFixed(4)}-${longitude.toFixed(4)}`;  // Unique key for each coordinate

        if (!groupedSchools[key]) {
            groupedSchools[key] = {
                name: name,
                latitude: latitude,
                longitude: longitude,
                senior_high_count: 0,
                college_count: 0,
            };
        }

        // Increment the counts for schools with the same coordinates
        groupedSchools[key].senior_high_count += senior_high_count;
        groupedSchools[key].college_count += college_count;
    });

    // Plot the markers for each unique school location
    Object.values(groupedSchools).forEach((school) => {
        const { latitude, longitude, name, senior_high_count, college_count } = school;

        if (
            latitude && longitude &&
            !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))
        ) {
            const popupContent = `
                <strong>${name}</strong><br/>
                📍 ${latitude.toFixed(4)}, ${longitude.toFixed(4)}<br/>
                👨‍🎓 Senior High: ${senior_high_count}<br/>
                🎓 College: ${college_count}
            `;

            const marker = L.marker([parseFloat(latitude), parseFloat(longitude)], {
                icon: schoolIcon
            }).bindPopup(popupContent);

            markers.addLayer(marker);
        }
    });

    map.addLayer(markers); // show the school markers
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

function addMarkers(data) {
    markers.clearLayers(); // reset the marker cluster group

    allMarkers = data.reduce((markerArray, item) => {
        const { latitude, longitude } = item;

        if (latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
            const marker = L.marker([parseFloat(latitude), parseFloat(longitude)], {
                studentData: item
            }).bindPopup(() => generatePopupContent(item));

            marker.on('click', () => {
                console.log('Marker clicked:', item); // log the data being fetched
                handleStudentRoute(item);
            });

            markerArray.push(marker);
            markers.addLayer(marker); // add marker to the cluster group
        }
        return markerArray;
    }, []);

    map.addLayer(markers); // add the cluster group to the map

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

// function to toggle clustering
let activeButton = null; // store the currently active button
let currentClusterType = null;  // store current cluster type (address or proximity)
let currentEducationLevel = null;  // store current educational level (senior high or college)


async function toggleClustering(apiUrl, clusterType, buttonId) {
    console.log(`Fetching: ${apiUrl}?cluster_type=${clusterType}`);

    const button = document.getElementById(buttonId);

    if (activeCluster === `${apiUrl}-${clusterType}`) {
        clearRoute();
        markers.clearLayers();
        activeCluster = null;
        button.textContent = button.dataset.defaultText; // reset button text
        activeButton = null; // no active button now
        currentClusterType = null;
        currentEducationLevel = null;
        return;
    }

    // reset the previous active button before switching
    if (activeButton && activeButton !== button) {
        activeButton.textContent = activeButton.dataset.defaultText;
    }

    clearRoute();
    markers.clearLayers();
    activeCluster = `${apiUrl}-${clusterType}`;
    activeButton = button; // set new active button

    // capture the current cluster type
    currentClusterType = clusterType;

    // capture the current educational level 
    currentEducationLevel = apiUrl.includes("senior") ? "senior_high" : "college";

    const data = await fetchData(`${apiUrl}?cluster_type=${clusterType}`);
    console.log("Cluster data received:", data);

    addMarkers(data);
    map.addLayer(markers);
    createPopulationDistribution(data);

    // update button text to hide
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
        { id: 'seniorhighcluster', clusterType: 'cluster', handler: handleSeniorHighCluster },
        { id: 'collegecluster', clusterType: 'cluster', handler: handleCollegeCluster }
    ];

    clusterButtons.forEach(({ id, clusterType, handler }) => {
        const button = document.getElementById(id);
        button.dataset.defaultText = button.textContent; // store original text
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
    if (!student) {
        console.error('Student data is undefined in generatePopupContent');
        return "Error loading student data";
    }

    let content = "<div class='student-popup'>";

    // Add a header with student name if available
    if (student.name) {
        content += `<h4>${student.name}</h4>`;
    } else {
        content += `<h4>Student Information</h4>`;
    }

    // Add educational information
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

    // Display affected status if applicable
    if (isAffected) {
        content += '<div class="affected-status"><b>Affected by:</b> ';
        if (affectedStudents.flood.includes(student)) content += '<span class="flood-tag">Flood</span> ';
        if (affectedStudents.strike.includes(student)) content += '<span class="strike-tag">Transport Strike</span> ';
        if (affectedStudents.restricted.includes(student)) content += '<span class="restricted-tag">Mobility Restriction</span> ';
        if (affectedStudents.fire.includes(student)) content += '<span class="fire-tag">Fire</span>';
        content += '</div>';
    }

    // Check if this student is the one with an active route
    const isActiveRoute = previouslySelectedStudent === student;
    
    // Add route controls
    content += '<div class="route-controls">';
    if (isActiveRoute) {
        content += `<button class="route-btn hide-route-btn" onclick="clearRoute()">Hide Route</button>`;
    } else {
        content += `<button class="route-btn show-route-btn" onclick="handleStudentRoute(${JSON.stringify(student)})">Show Route to Campus</button>`;
    }
    content += '</div>';

    content += '</div>';

    // Return the HTML content for the popup
    return content;
}

//populationDistribution
function createPopulationDistribution(data) {
    // Store the current student data
    currentStudentData = data;
    
    populationLayer.clearLayers();
    const radiusSlider = document.getElementById('radius-slider');
    const initialRadius = parseInt(radiusSlider.value, 10);
    
    // Track the currently selected circle
    let currentCircle = null;

    schools.forEach(school => {
        const circle = L.circle([school.lat, school.lng], {
            color: '#065F46',
            fillColor: '#065F46',
            fillOpacity: 0.2,
            radius: initialRadius
        }).addTo(map);

        circle.school = school;
        updateCirclePopup(circle, school, currentStudentData);

        circle.on('click', () => {
            // set circle as currently selected one
            currentCircle = circle;
            
            // match slider with radius circle
            radiusSlider.value = circle.getRadius();
            document.getElementById('radius-value').textContent = circle.getRadius();
            
            // highlight clicked circle
            populationLayer.eachLayer(layer => {
                if (layer === circle) {
                    layer.setStyle({ color: '#ff0000', fillColor: '#ff0000' });
                } else {
                    layer.setStyle({ color: '#065F46', fillColor: '#065F46' });
                }
            });
            
            updateCirclePopup(circle, school, currentStudentData);
        });

        populationLayer.addLayer(circle);
    });
    
    // update only clicked circle
    radiusSlider.addEventListener('input', function() {
        const radius = parseInt(this.value, 10);
        document.getElementById('radius-value').textContent = radius;
        
        if (currentCircle) {
            currentCircle.setRadius(radius);
            
            // update popup for clicked
            updateCirclePopup(currentCircle, currentCircle.school, currentStudentData);
        }
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

document.addEventListener('DOMContentLoaded', async () => {
    initializeMap();
    setupEventListeners();
    addFilterControls();
    initializePopulationDistribution();
    loadCampuses();
});

document.getElementById('previousSchool').addEventListener('click', async (e) => {
    e.preventDefault();
    await plotPreviousSchools();
});


document.getElementById('dataAnalytics').addEventListener('click', function() {
    window.location.href = '/students/data-analytics';
});

document.getElementById('eventReportsLink').addEventListener('click', function () {
    window.location.href = '/event-reports';
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