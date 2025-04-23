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
                    <button type="button" id="cancelCampusBtn" class="btn btn-secondary btn-sm" style="margin-left: 5px;">Cancel</button>
                </form>
            `).openPopup();

        setTimeout(() => {
            // submit 
            document.getElementById('campusForm').addEventListener('submit', async function (event) {
                event.preventDefault();

                const name = document.getElementById('campusName').value;
                const latitude = campusMarker.getLatLng().lat;
                const longitude = campusMarker.getLatLng().lng;

                const payload = { name, latitude, longitude };

                try {
                    const response = await fetch('/api/campuses', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
                    }

                    const result = await response.json();
                    alert('Campus saved successfully!');

                    // reset state
                    map.removeLayer(campusMarker);
                    campusMarker = null;
                    isAddingCampus = false;

                } catch (error) {
                    alert(`Error saving campus: ${error.message}`);
                }
            });

            // cancel
            document.getElementById('cancelCampusBtn').addEventListener('click', function () {
                map.removeLayer(campusMarker);
                campusMarker = null;
                isAddingCampus = false;
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

let floodPolygon = null;
let startPoint = null;
let endPoint = null;

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
    map.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
    
        if (e.layerType === 'circle') {
            if (incidentCircle) {
                drawnItems.removeLayer(incidentCircle);
            }
            incidentCircle = e.layer;
            drawnItems.addLayer(incidentCircle);
    
            // Get the coordinates of the shape
            window.incidentLocation = incidentCircle.getLatLng();
            console.log(window.incidentLocation = incidentCircle.getLatLng());
    
            // Convert the circle to a GeoJSON polygon using Turf.js
            const radiusInKm = incidentCircle.getRadius() / 1000; // Convert radius from meters to kilometers
            const floodGeoJSON = turf.circle([incidentCircle.getLatLng().lng, incidentCircle.getLatLng().lat], radiusInKm, {
                steps: 64, // Number of points around the circle
                units: 'kilometers'
            });
    
            // Store the flood polygon globally
            floodPolygon = floodGeoJSON.geometry;
            console.log(floodPolygon); // Check the GeoJSON
    
            incidentCircle.bindTooltip("Incident Location", {
                permanent: true,
                direction: "center",
                className: "incident-tooltip"
            }).openTooltip();
    
            incidentCircle.on('click', function () {
                const confirmDelete = confirm('Do you want to remove this incident circle?');
                if (confirmDelete) {
                    drawnItems.removeLayer(incidentCircle);
                    incidentCircle = null;
                    window.incidentLocation = null;
                }
            });
        } else {
            drawnItems.addLayer(layer);
    
            shapeAreas = []; // Reset shape areas
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
        
        console.log("OSRM Request URL:", url);
        
        if (floodPolygon) {
            console.log("Flood Polygon:", floodPolygon);
            
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    console.log("OSRM Response Data:", data);
                    
                    if (data.routes && data.routes.length > 0) {
                        const route = data.routes[0];
                        console.log("Route found:", route);
                        
                        // Check if the route intersects with the flood polygon
                        if (route.geometry && route.geometry.coordinates) {
                            const routeLine = turf.lineString(route.geometry.coordinates);
                            const intersects = turf.booleanIntersects(routeLine, floodPolygon);
                            
                            if (intersects) {
                                console.log("Route intersects with flood area, calculating detour...");
                                calculateDetour(startPoint, endPoint);
                            } else {
                                console.log("Route does not intersect with flood area, using direct route");
                                displayRoute(data);
                            }
                        } else {
                            console.error("No geometry found in route");
                        }
                    } else {
                        console.error("No routes found in response");
                    }
                })
                .catch(error => console.error('Error fetching route data:', error));
        } else {
            // No flood polygon defined, just calculate the direct route
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    displayRoute(data);
                })
                .catch(error => console.error('Error fetching route data:', error));
        }
    }
    
    function calculateDetour(startPoint, endPoint) {
        console.log("Calculating detour waypoints...");
        
        // Create points around the flood polygon to use as waypoints
        const center = incidentCircle.getLatLng();
        const radius = incidentCircle.getRadius();
        console.log("Circle center:", center, "radius:", radius);
        
        // Create potential waypoints around the flood area
        const numPoints = 16; // Increase number of points to try
        const waypoints = [];
        
        // Create multiple rings of waypoints at different distances
        const distanceFactors = [1.5, 2.0, 3.0]; // Multiple of radius
        
        distanceFactors.forEach(factor => {
            for (let i = 0; i < numPoints; i++) {
                const angle = (2 * Math.PI * i) / numPoints;
                
                // Calculate point on circle
                const waypointLat = center.lat + (radius * factor / 111000) * Math.cos(angle); // 111000 meters is roughly 1 degree of latitude
                const waypointLng = center.lng + (radius * factor / (111000 * Math.cos(center.lat * (Math.PI/180)))) * Math.sin(angle);
                
                waypoints.push({
                    lng: waypointLng, 
                    lat: waypointLat
                });
            }
        });
        
        console.log(`Generated ${waypoints.length} waypoints for detour calculation`);
        
        // Find the best waypoint to route through
        findBestDetour(startPoint, endPoint, waypoints);
    }
    
    function findBestDetour(startPoint, endPoint, waypoints) {
        let bestRoute = null;
        let bestDistance = Infinity;
        let promises = [];
        
        console.log(`Trying ${waypoints.length} possible detour points around flood area`);
        
        // Try each waypoint and find the best route
        waypoints.forEach((waypoint, index) => {
            console.log(`Trying waypoint ${index+1}:`, waypoint);
            
            const url = `http://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${waypoint.lng},${waypoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson`;
            
            const promise = fetch(url)
                .then(response => response.json())
                .then(data => {
                    console.log(`Waypoint ${index+1} response:`, data);
                    
                    if (data.routes && data.routes.length > 0) {
                        const route = data.routes[0];
                        console.log(`Waypoint ${index+1} route:`, route);
                        
                        // Check if this route intersects with the flood polygon
                        if (route.geometry && route.geometry.coordinates) {
                            const routeLine = turf.lineString(route.geometry.coordinates);
                            const intersects = turf.booleanIntersects(routeLine, floodPolygon);
                            
                            console.log(`Waypoint ${index+1} - Route intersects flood area: ${intersects}`);
                            console.log(`Waypoint ${index+1} - Route distance: ${route.distance}`);
                            
                            if (!intersects && route.distance < bestDistance) {
                                bestRoute = data;
                                bestDistance = route.distance;
                                console.log(`Waypoint ${index+1} is now the best route with distance ${bestDistance}`);
                            }
                        } else {
                            console.error(`Waypoint ${index+1} has no valid geometry`);
                        }
                    } else {
                        console.error(`No routes found for waypoint ${index+1}`);
                    }
                })
                .catch(error => console.error(`Error fetching detour route for waypoint ${index+1}:`, error));
            
            promises.push(promise);
        });
        
        // After all waypoints have been tried
        Promise.all(promises).then(() => {
            if (bestRoute) {
                console.log("Found best detour route:", bestRoute);
                displayRoute(bestRoute);
            } else {
                console.error("Could not find a valid detour route");
                // Fall back to displaying the original route with a warning
                console.log("Falling back to original route with warning");
                
                // Get original route
                const originalUrl = `http://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson`;
                
                fetch(originalUrl)
                    .then(response => response.json())
                    .then(data => {
                        if (data.routes && data.routes.length > 0) {
                            // Display with warning
                            console.warn("WARNING: This route passes through flood area!");
                            displayRoute(data, true); // Pass true to indicate this is through flood area
                        }
                    })
                    .catch(error => console.error('Error fetching original route data:', error));
            }
        });
    }
    function findBestDetour(startPoint, endPoint, waypoints) {
        console.log(`Trying ${waypoints.length} possible detour points around flood area`);
        
        // Process waypoints one at a time instead of all at once
        tryNextWaypoint(startPoint, endPoint, waypoints, 0);
    }
    
    function tryNextWaypoint(startPoint, endPoint, waypoints, index) {
        // Base case: we've tried all waypoints
        if (index >= waypoints.length) {
            console.error("Could not find a valid detour route after trying all waypoints");
            // Fall back to displaying the original route with a warning
            console.log("Falling back to original route with warning");
            
            const originalUrl = `http://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson`;
            
            fetch(originalUrl)
                .then(response => response.json())
                .then(data => {
                    if (data.routes && data.routes.length > 0) {
                        console.warn("WARNING: This route passes through flood area!");
                        displayRoute(data, true); // Pass true to indicate this is through flood area
                    }
                })
                .catch(error => console.error('Error fetching original route data:', error));
            return;
        }
        
        const waypoint = waypoints[index];
        console.log(`Trying waypoint ${index+1}/${waypoints.length}:`, waypoint);
        
        const url = `http://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${waypoint.lng},${waypoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    
                    // Check if this route intersects with the flood polygon
                    if (route.geometry && route.geometry.coordinates) {
                        const routeLine = turf.lineString(route.geometry.coordinates);
                        const intersects = turf.booleanIntersects(routeLine, floodPolygon);
                        
                        console.log(`Waypoint ${index+1} - Route intersects flood area: ${intersects}`);
                        
                        if (!intersects) {
                            // Found a valid route! Display it and stop looking
                            console.log(`Found valid detour route through waypoint ${index+1}`);
                            displayRoute(data);
                            return; // Stop processing more waypoints
                        }
                    }
                }
                
                // If we get here, this waypoint didn't work, try the next one
                tryNextWaypoint(startPoint, endPoint, waypoints, index + 1);
            })
            .catch(error => {
                console.error(`Error fetching detour route for waypoint ${index+1}:`, error);
                // Even if there's an error, try the next waypoint
                tryNextWaypoint(startPoint, endPoint, waypoints, index + 1);
            });
    }
    
    
    // Function to display the route on the map
    function displayRoute(routeData, isWarningRoute = false) {
        if (routeData && routeData.routes && routeData.routes.length > 0) {
            const route = routeData.routes[0];
            if (route.geometry) {
                console.log("Adding route to map:", route.geometry);
                
                // Create route layer with appropriate styling
                const routeStyle = isWarningRoute ? 
                    { color: 'red', weight: 6, opacity: 0.7, dashArray: '10, 10' } : 
                    { color: 'blue', weight: 6, opacity: 0.7 };
                
                const routeLayer = L.geoJSON(route.geometry, {
                    style: routeStyle
                }).addTo(map);
                
                // Add warning popup if needed
                if (isWarningRoute) {
                    routeLayer.bindPopup(
                        "<strong>Warning!</strong><br>This route passes through a flood area.<br>Travel at your own risk.", 
                        { autoClose: false }
                    ).openPopup();
                }
            } else {
                console.error("No geometry found in route");
            }
        } else {
            console.error("No valid route data found");
        }
    }
    
    function enableRoutingSupport() {
        startPoint = null;
        endPoint = null;
    
        function onMapClick(e) {
            if (!startPoint) {
                startPoint = e.latlng;
    
                L.marker(startPoint).addTo(map).bindPopup("Start Point").openPopup();
            } else if (!endPoint) {
                endPoint = e.latlng;
    
                L.marker(endPoint).addTo(map).bindPopup("End Point").openPopup();
                calculateRoute(startPoint, endPoint);
    
                map.off('click', onMapClick);
            }
        }
    
        map.on('click', onMapClick);
    }

    document.getElementById("provideSupport").addEventListener("click", function () {
        enableRoutingSupport();
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

const clusterColors = [
    'blue', 'red', 'green', 'purple', 'orange', 'cyan', 'yellow', 'pink', 'violet', 'brown',
    'lime', 'indigo', 'teal', 'gold', 'maroon', 'navy', 'olive', 'gray', 'slateblue', 'turquoise',
    'crimson', 'aquamarine', 'darkgreen', 'darkviolet', 'darkorange', 'coral', 'lightsalmon', 
    'fuchsia', 'mediumslateblue', 'darkseagreen', 'mediumvioletred'
];

// function to add all markers to the map from the dataset
function addMarkers(data) {
    markers.clearLayers(); // reset the marker cluster group

    allMarkers = data.reduce((markerArray, item) => {
        const { latitude, longitude } = item;

        if (latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
            const latlng = [parseFloat(latitude), parseFloat(longitude)];
            const marker = createStudentMarker(item, latlng); // 👈 use helper

            marker.on('click', () => {
                console.log('Marker clicked:', item);
                handleStudentRoute(item);
            });

            markerArray.push(marker);
            markers.addLayer(marker);
        }
        return markerArray;
    }, []);

    map.addLayer(markers);

    // Filter + Chart setup
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

// helper function to create custom marker 
function createStudentMarker(studentData, latlng, isAffected = false) {
    const clusterColor = clusterColors[(studentData.cluster - 1) % clusterColors.length];

    return L.marker(latlng, {
        studentData: studentData,
        icon: L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color:${clusterColor}; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white;"></div>`,
            iconSize: [30, 30]
        })
    }).bindPopup(() => generatePopupContent(studentData, isAffected));
}


// function to update markers on the map.
function updateMarkers() {
    markers.clearLayers();

    allMarkers.forEach(marker => {
        const studentData = marker.options.studentData;
        if (showMarker(studentData)) {
            const isAffected = isStudentAffected(studentData);
            const newMarker = createStudentMarker(studentData, marker.getLatLng(), isAffected);

            newMarker.on('click', () => {
                console.log('Marker clicked:', studentData);
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

    // validate student coordinates
    if (isNaN(studentLat) || isNaN(studentLng)) {
        console.error('Invalid student coordinates:', student.latitude, student.longitude);
        return;
    }

    // check if clicking the same student
    if (previouslySelectedStudent === student) {
        // Clear the route when clicking the same student
        clearRoute();
        return;
    }

    // clear any existing route first
    clearRoute();

    // set the newly selected student
    previouslySelectedStudent = student;

    const selectedCampus = determineCampus(student);
    if (!selectedCampus) {
        console.error('Unable to determine campus for student:', student);
        return;
    }

    const campusLat = selectedCampus.lat;
    const campusLng = selectedCampus.lng;

    // create waypoints array
    const waypoints = [
        L.latLng(studentLat, studentLng),
        L.latLng(campusLat, campusLng)
    ];

    const routeColor = studentType(student) ? 'blue' : 'green';

    // configure the routing control
    currentRouteControl = L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: false,
        showAlternatives: true,
        fitSelectedRoutes: focusRoute,
        createMarker: function(i, wp, nWps) {
            // ensures that start and end points are consistent (student loc to respective campuses)
            if (i === 0 || i === nWps - 1) {
                return L.marker(wp.latLng, {
                    icon: i === 0 ? 
                        L.divIcon({
                            className: 'custom-div-icon',
                            html: "<div style='background-color:#4a83ec;' class='marker-pin'></div>",
                            iconSize: [30, 42],
                            iconAnchor: [15, 42]
                        }) : 
                        L.icon({
                            iconUrl: SCHOOL_ICON_URL, 
                            iconSize: [40, 40],
                            iconAnchor: [20, 40]
                        })
                }).bindPopup(i === 0 ? `Student: ${student.name}` : `Campus: ${selectedCampus.name}`);
            }
            return null;
        },
        lineOptions: {
            styles: [{color: routeColor, weight: 5, opacity: 0.8}]
        },
        altLineOptions: {
            styles: [
                {color: '#800000', weight: 4, opacity: 0.7, dashArray: '5,10'},
                {color: '#000080', weight: 4, opacity: 0.6, dashArray: '5,10'},
                {color: '#006400', weight: 4, opacity: 0.5, dashArray: '5,10'}
            ]
        }
    }).addTo(map);

    // handle routes found
    currentRouteControl.on('routesfound', function(e) {
        const routes = e.routes;
        console.log('Found routes:', routes);

        if (routes && routes.length > 0) {
            try {
                // distances and times for all found routes
                const distances = routes.map(route => (route.summary.totalDistance / 1000).toFixed(2));
                const times = routes.map(route => (route.summary.totalTime / 60).toFixed(2));
                
                // create payload to be sent to be
                const payload = {
                    student_name: student.name || "Unknown Student",
                    campus_name: selectedCampus.name || "Unknown Campus",
                    distances: distances.map(Number),
                    times: times.map(Number)
                };
    
                fetch('/evaluate-routes-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => {
                            throw new Error(`API error: ${JSON.stringify(err)}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                   
                    // payload error handling
                })
                .catch(error => { 
                    console.error("Fetch API call failed:", error);
                });

            } catch (error) {
                console.error("Error occurred inside routesfound before fetch:", error);
            }
        } else {
            console.warn("routesfound fired, but no routes available.");
        }
        
        // clear previous routes
        routesLayer.clearLayers();
        
        // add all routes to the map layer
        routes.forEach((route, index) => {
            const isMainRoute = index === 0;
            const style = isMainRoute ? 
                {color: routeColor, weight: 5, opacity: 0.8} : 
                currentRouteControl.options.altLineOptions.styles[index - 1];
            
            const routeLine = L.polyline(route.coordinates, style);
            
            // add routes info
            routeLine.bindTooltip(
                `${isMainRoute ? 'Main' : 'Alt'} route: ${(route.summary.totalDistance / 1000).toFixed(1)} km, ` +
                `${Math.round(route.summary.totalTime / 60)} min`
            );
            
            // switching to either main or alt routes
            routeLine.on('click', function() {
                routesLayer.removeLayer(routeLine);
                routesLayer.addLayer(routeLine);
                
                if (currentRouteControl._plan) {
                    currentRouteControl._plan.setWaypoints(route.waypoints);
                }
            });
            
            routesLayer.addLayer(routeLine);
        });
    });

    currentRouteControl.on('routingerror', function(e) {
        console.error('Routing error:', e.error);
        alert(`Could not calculate route: ${e.error.message}`);
    });

    // find and store the clicked marker
    const clickedMarker = markers.getLayers().find(marker => 
        marker.options.studentData === student
    );
    
    currentRouteMarker = clickedMarker;
    
    // update the popup content to show the hide route button
    if (clickedMarker && clickedMarker.isPopupOpen()) {
        clickedMarker.setPopupContent(
            generatePopupContent(student, isStudentAffected(student))
        );
    }
}

function clearRoute() {
    if (currentRouteControl) {
        map.removeControl(currentRouteControl);
        currentRouteControl = null;
    }
    routesLayer.clearLayers();
    
    if (currentRouteMarker) {
        // update the popup content when clearing the route
        if (currentRouteMarker.isPopupOpen()) {
            currentRouteMarker.setPopupContent(
                generatePopupContent(currentRouteMarker.options.studentData, 
                isStudentAffected(currentRouteMarker.options.studentData))
            );
        }
        currentRouteMarker = null;
    }
    
    // reset the previously selected student
    previouslySelectedStudent = null;
    currentRoute = null;
}

function toggleRouteVisibility(isVisible) {
    if (currentRouteControl) {
        currentRouteControl.getContainer().style.display = isVisible ? 'block' : 'none';
        
        // toggle visibility of alternatives too
        if (currentRouteControl.options.showAlternatives) {
            const containers = document.querySelectorAll('.leaflet-routing-alt');
            containers.forEach(container => {
                container.style.display = isVisible ? 'block' : 'none';
            });
        }
        
        // toggle the route lines
        if (!isVisible && routesLayer) {
            routesLayer.eachLayer(layer => {
                layer.setStyle({ opacity: 0 });
            });
        } else if (isVisible && routesLayer) {
            routesLayer.eachLayer((layer, index) => {
                if (layer === currentRoute) {
                    layer.setStyle({ opacity: 0.8 });
                } else {
                    // alternative routes
                    const altIndex = index - 1;
                    const opacity = altIndex >= 0 ? 0.7 - (altIndex * 0.1) : 0.7;
                    layer.setStyle({ opacity: opacity });
                }
            });
        }
        
        // update current marker popup if it's open
        if (currentRouteMarker && currentRouteMarker.isPopupOpen()) {
            currentRouteMarker.setPopupContent(
                generatePopupContent(currentRouteMarker.options.studentData, 
                isStudentAffected(currentRouteMarker.options.studentData))
            );
        }
    }
    
    if (!isVisible) clearRoute();
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