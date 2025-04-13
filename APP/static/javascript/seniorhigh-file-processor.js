const form = document.getElementById('upload-form');
const preprocessFile = document.getElementById('preprocess-file');
const statusMessage = document.getElementById('preprocess-status');
const errorMessage = document.getElementById('preprocess-error');

const preprocessFileInput = document.getElementById('preprocess-file');
const preprocessFileLabel = document.getElementById('preprocess-file-label');

preprocessFileInput.addEventListener('change', function () {
    if (this.files.length > 0) {
        preprocessFileLabel.textContent = this.files[0].name; // show file name inside the dashed box
        preprocessFileLabel.classList.add('text-green-600', 'font-semibold'); // update the style
    } else {
        preprocessFileLabel.textContent = "Choose file"; // reset if no file selected
        preprocessFileLabel.classList.remove('text-green-600', 'font-semibold');
    }
});

form.addEventListener('submit', async (event) => {
    event.preventDefault(); 
    statusMessage.textContent = "";
    errorMessage.textContent = "";

    const file = preprocessFile.files[0];
    if (!file) {
        alert("Please select a file to upload.");
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        // upload file
        const response = await fetch('/api/upload/raw/seniorhigh-file', {
            method: 'POST', 
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            errorMessage.textContent = `Error: ${errorData.detail}`;
            return;
        }

        // download the file
        const blob = await response.blob();
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = '[1]_preprocessed_seniorhigh_file.csv';
        downloadLink.click();

        statusMessage.textContent = "File preprocessed and downloaded successfully.";
    } catch (error) {
        console.error('Error uploading file.', error);
        errorMessage.textContent = "An error occurred while uploading the file";
    }
});

const removeColumnForm = document.getElementById('removeColumn-form');
const removeColumnFile = document.getElementById('removeColumn-file');
const removeColumnStatus = document.getElementById('removeColumn-status');
const removeColumnError = document.getElementById('removeColumn-error');

const removeColumnfileInput = document.getElementById('removeColumn-file');
const removeColumnFileLabel = document.getElementById('removeColumn-file-label');

removeColumnfileInput.addEventListener('change', function () {
    if (this.files.length > 0) {
        removeColumnFileLabel.textContent = this.files[0].name; 
        removeColumnFileLabel.classList.add('text-green-600', 'font-semibold'); 
    } else {
        removeColumnFileLabel.textContent = "Choose file"; 
        removeColumnFileLabel.classList.remove('text-green-600', 'font-semibold');
    }
});

removeColumnForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    removeColumnStatus.textContent = "";
    removeColumnError.textContent = "";

    const file = removeColumnFile.files[0];
    if (!file) {
        alert('Please select a file to upload.');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/remove-column', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            removeColumnError.textContent = `Error: ${errorData.detail}`;
            return;
        }

        // download the update file
        const blob = await response.blob();
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = '[2]_updated_seniorhigh_file.csv';
        downloadLink.click();


        removeColumnStatus.textContent = "Column removed and file downloaded successfully.";
    } catch (error) {
        console.error('Error uploading file.', error);
        removeColumnError.textContent = 'An error occurred while uploading the file.';
    }
});

const geocodeForm = document.getElementById('geocode-form');
const geocodeFile = document.getElementById('geocode-file');
const geocodeStatus = document.getElementById('geocode-status');
const geocodeError = document.getElementById('geocode-error');

const geocodeSpinnerContainer = document.querySelector('.spinner-container');
const loadingMessage = document.getElementById('geocode-loading-message');

const geocodeFileInput = document.getElementById('geocode-file');
const geocodeFileLabel = document.getElementById('geocode-file-label');

geocodeFileInput.addEventListener('change', function () {
    if (this.files.length > 0) {
        geocodeFileLabel.textContent = this.files[0].name; 
        geocodeFileLabel.classList.add('text-green-600', 'font-semibold'); 
    } else {
        geocodeFileLabel.textContent = "Choose file"; 
        geocodeFileLabel.classList.remove('text-green-600', 'font-semibold');
    }
});

geocodeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    geocodeStatus.textContent = "";
    geocodeError.textContent = "";

    // Show spinner and loading message
    geocodeSpinnerContainer.classList.remove("hidden");
    loadingMessage.classList.remove("hidden");

    const file = geocodeFile.files[0];
    if (!file) {
        alert("Please select a file to upload.");

        // Hide spinner and loading message
        geocodeSpinnerContainer.classList.add("hidden");
        loadingMessage.classList.add("hidden");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch('/api/geocode/seniorhigh-file', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            geocodeError.textContent = `Error: ${errorData.detail}`;
            
            // Hide spinner and loading message
            geocodeSpinnerContainer.classList.add("hidden");
            loadingMessage.classList.add("hidden");
            return;
        }

        const blob = await response.blob();
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = '[3]_geocoded_seniorhigh_file.csv';
        downloadLink.click();

        geocodeStatus.textContent = "Geocoding completed and file downloaded successfully!";
    } catch (error) {
        console.error("Error uploading file for geocoding:", error);
        geocodeError.textContent = "An error occurred while processing the file.";
    } finally {
        // Hide spinner and loading message
        geocodeSpinnerContainer.classList.add("hidden");
        loadingMessage.classList.add("hidden");
    }
});

const clusterForm = document.getElementById('cluster-form');
const clusterFile = document.getElementById('cluster-file');
const clusterStatus = document.getElementById('cluster-status');
const clusterError = document.getElementById('cluster-error');

const clusterFileInput = document.getElementById('cluster-file');
const clusterFileLabel = document.getElementById('cluster-file-label');

clusterFileInput.addEventListener('change', function () {
    if (this.files.length > 0) {
        clusterFileLabel.textContent = this.files[0].name; // Show file name inside the dashed box
        clusterFileLabel.classList.add('text-green-600', 'font-semibold'); // Style update
    } else {
        clusterFileLabel.textContent = "Choose file"; // Reset if no file selected
        clusterFileLabel.classList.remove('text-green-600', 'font-semibold');
    }
});

clusterForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clusterStatus.textContent = "";
    clusterError.textContent = "";

    const file = clusterFile.files[0];
    if (!file) {
        alert("Please select a file to upload.");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch('/api/seniorhigh-cluster-file', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            clusterError.textContent = `Error: ${errorData.detail}`;
            return;
        }

        const blob = await response.blob();
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = '[ready_to_upload]_clustered_seniorhigh_file.csv';
        downloadLink.click();

        clusterStatus.textContent = "Clustering completed and file downloaded successfully!";
    } catch (error) {
        console.error("Error uploading file for clustering:", error);
        clusterError.textContent = "An error occurred while processing the file.";
    }
});