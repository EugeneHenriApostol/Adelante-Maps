// routing.js

// Utility to calculate distance between two coordinates (in km)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Determine campus based on student info
function determineCampus(student) {
    const isCollege = studentType(student);
    if (isCollege) {
        const courseInSCS = COLLEGE_DEPARTMENTS.SCS.includes(student.course);
        const courseInSED = COLLEGE_DEPARTMENTS.SED.includes(student.course);
        if (courseInSCS || courseInSED) {
            return schools.find(s => s.name === "USJ-R Basak Campus");
        }
        return schools.find(s => s.name === "USJ-R Main Campus");
    }

    return schools.reduce((nearest, school) => {
        const dist = calculateDistance(student.latitude, student.longitude, school.lat, school.lng);
        return !nearest || dist < nearest.distance ? { school, distance: dist } : nearest;
    }, null)?.school;
}

// Find nearest campus to a point
function findNearestCampus(point) {
    let nearest = null, minDistance = Infinity;
    schools.forEach(school => {
        const dist = calculateDistance(point.lat, point.lng, school.lat, school.lng);
        if (dist < minDistance) {
            minDistance = dist;
            nearest = school;
        }
    });
    return nearest;
}

// Handle Student → Campus routing
function handleStudentRoute(student, focusRoute = true) {
    const studentLat = parseFloat(student.latitude);
    const studentLng = parseFloat(student.longitude);
    if (isNaN(studentLat) || isNaN(studentLng)) return;

    if (previouslySelectedStudent === student) {
        clearRoute();
        return;
    }

    clearRoute();
    previouslySelectedStudent = student;

    const campus = determineCampus(student);
    if (!campus) return;

    const waypoints = [
        L.latLng(studentLat, studentLng),
        L.latLng(campus.lat, campus.lng)
    ];
    const routeColor = studentType(student) ? 'blue' : 'green';

    currentRouteControl = L.Routing.control({
        waypoints,
        routeWhileDragging: false,
        showAlternatives: true,
        fitSelectedRoutes: focusRoute,
        createMarker: (i, wp, nWps) => {
            if (i === 0 || i === nWps - 1) {
                return L.marker(wp.latLng, {
                    icon: i === 0 ? L.divIcon({
                        className: 'custom-div-icon',
                        html: "<div style='background-color:#4a83ec;' class='marker-pin'></div>",
                        iconSize: [30, 42],
                        iconAnchor: [15, 42]
                    }) : L.icon({
                        iconUrl: SCHOOL_ICON_URL,
                        iconSize: [40, 40],
                        iconAnchor: [20, 40]
                    })
                }).bindPopup(i === 0 ? `Student: ${student.name}` : `Campus: ${campus.name}`);
            }
        },
        lineOptions: {
            styles: [{ color: routeColor, weight: 5, opacity: 0.8 }]
        },
        altLineOptions: {
            styles: [
                { color: '#800000', weight: 4, opacity: 0.7, dashArray: '5,10' },
                { color: '#000080', weight: 4, opacity: 0.6, dashArray: '5,10' },
                { color: '#006400', weight: 4, opacity: 0.5, dashArray: '5,10' }
            ]
        }
    }).addTo(map);

    currentRouteControl.on('routesfound', e => {
        routesLayer.clearLayers();
        e.routes.forEach((route, i) => {
            const style = i === 0
                ? { color: routeColor, weight: 5, opacity: 0.8 }
                : currentRouteControl.options.altLineOptions.styles[i - 1];

            const routeLine = L.polyline(route.coordinates, style)
                .bindTooltip(`Route ${i + 1}: ${(route.summary.totalDistance / 1000).toFixed(1)} km, ${Math.round(route.summary.totalTime / 60)} min`);

            routeLine.on('click', () => {
                routesLayer.removeLayer(routeLine);
                routesLayer.addLayer(routeLine);
                currentRouteControl._plan.setWaypoints(route.waypoints);
            });

            routesLayer.addLayer(routeLine);
        });
    });

    currentRouteControl.on('routingerror', e => {
        console.error('Routing error:', e.error);
        alert(`Could not calculate route: ${e.error.message}`);
    });

    currentRouteMarker = markers.getLayers().find(m => m.options.studentData === student);
    if (currentRouteMarker?.isPopupOpen()) {
        currentRouteMarker.setPopupContent(generatePopupContent(student, isStudentAffected(student)));
    }
}

// Campus → Affected Area routing
function calculateCampusToAffectedRoute(campus, affectedPoint, avoidPolygon) {
    clearRoute();

    const waypoints = [
        L.latLng(campus.lat, campus.lng),
        L.latLng(affectedPoint.lat, affectedPoint.lng)
    ];

    currentRouteControl = L.Routing.control({
        waypoints,
        routeWhileDragging: false,
        showAlternatives: true,
        fitSelectedRoutes: true,
        createMarker: (i, wp, nWps) => {
            if (i === 0) {
                return L.marker(wp.latLng, {
                    icon: L.icon({
                        iconUrl: SCHOOL_ICON_URL,
                        iconSize: [40, 40],
                        iconAnchor: [20, 40]
                    })
                }).bindPopup(`Campus: ${campus.name}`);
            } else if (i === nWps - 1) {
                return L.marker(wp.latLng, {
                    icon: L.divIcon({
                        className: 'custom-div-icon',
                        html: "<div style='background-color:#ff0000;' class='marker-pin'></div>",
                        iconSize: [30, 42],
                        iconAnchor: [15, 42]
                    })
                }).bindPopup("Affected Area");
            }
        },
        lineOptions: {
            styles: [{ color: 'purple', weight: 5, opacity: 0.8 }]
        },
        router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: 'driving'
        })
    }).addTo(map);

    currentRouteControl.on('routesfound', e => {
        routesLayer.clearLayers();
        e.routes.forEach((route, i) => {
            const style = i === 0
                ? { color: 'purple', weight: 5, opacity: 0.8 }
                : { color: '#800080', weight: 4, opacity: 0.6, dashArray: '5,10' };

            const routeLine = L.polyline(route.coordinates, style)
                .bindTooltip(`Route ${i + 1}: ${(route.summary.totalDistance / 1000).toFixed(1)} km, ${Math.round(route.summary.totalTime / 60)} min`);

            routeLine.on('click', () => {
                routesLayer.removeLayer(routeLine);
                routesLayer.addLayer(routeLine);
                currentRouteControl._plan.setWaypoints(route.waypoints);
            });

            routesLayer.addLayer(routeLine);
        });
    });

    currentRouteControl.on('routingerror', e => {
        console.error('Routing error:', e.error);
        alert(`Could not calculate route: ${e.error.message}`);
    });
}

// Clear all route data
function clearRoute() {
    if (currentRouteControl) {
        map.removeControl(currentRouteControl);
        currentRouteControl = null;
    }
    routesLayer.clearLayers();

    if (currentRouteMarker?.isPopupOpen()) {
        currentRouteMarker.setPopupContent(
            generatePopupContent(currentRouteMarker.options.studentData,
            isStudentAffected(currentRouteMarker.options.studentData))
        );
    }
    currentRouteMarker = null;
    previouslySelectedStudent = null;
    currentRoute = null;
}

// Toggle route layer visibility
function toggleRouteVisibility(isVisible) {
    if (currentRouteControl) {
        currentRouteControl.getContainer().style.display = isVisible ? 'block' : 'none';

        document.querySelectorAll('.leaflet-routing-alt').forEach(el => {
            el.style.display = isVisible ? 'block' : 'none';
        });

        routesLayer.eachLayer(layer => {
            layer.setStyle({ opacity: isVisible ? 0.8 : 0 });
        });

        if (currentRouteMarker?.isPopupOpen()) {
            currentRouteMarker.setPopupContent(
                generatePopupContent(currentRouteMarker.options.studentData,
                isStudentAffected(currentRouteMarker.options.studentData))
            );
        }
    }

    if (!isVisible) clearRoute();
}
