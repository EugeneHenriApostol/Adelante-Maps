// style to display the file name display
const seniorhighFileInput = document.getElementById('seniorHighFile');
const seniorhighFileLabel = document.getElementById('seniorhigh-file-label');

seniorhighFileInput.addEventListener('change', function () {
    if (this.files.length > 0) {
        const file = this.files[0];
        if (file.type !== "text/csv") {
            alert("Please upload a valid CSV file.");
            this.value = ""; // Reset file input
            seniorhighFileLabel.textContent = "Choose processed SHS file";
            seniorhighFileLabel.classList.remove('text-green-600', 'font-semibold');
            return;
        }
        seniorhighFileLabel.textContent = file.name;
        seniorhighFileLabel.classList.add('text-green-600', 'font-semibold');
    } else {
        seniorhighFileLabel.textContent = "Choose processed SHS file";
        seniorhighFileLabel.classList.remove('text-green-600', 'font-semibold');
    }
});

// style to display the file name display
const collegeFileInput = document.getElementById('collegeFile');
const collegeFileLabel = document.getElementById('college-file-label'); 

collegeFileInput.addEventListener('change', function () {
    if (this.files.length > 0) {
        const file = this.files[0];
        if (file.type !== "text/csv") {
            alert("Please upload a valid CSV file.");
            this.value = ""; // Reset file input
            collegeFileLabel.textContent = "Choose processed college file";
            collegeFileLabel.classList.remove('text-green-600', 'font-semibold');
            return;
        }
        collegeFileLabel.textContent = file.name;
        collegeFileLabel.classList.add('text-green-600', 'font-semibold');
    } else {
        collegeFileLabel.textContent = "Choose processed college file";
        collegeFileLabel.classList.remove('text-green-600', 'font-semibold');
    }
});

const seniorHighUploadForm = document.getElementById('seniorHighFileUploadForm');
const collegeUploadForm = document.getElementById('collegeUploadForm');
const removeSeniorHigh = document.getElementById('removeSeniorHigh');
const removeCollege = document.getElementById('removeCollege');

// upload senior high file
seniorHighUploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fileInput = document.getElementById('seniorHighFile');
    const file = fileInput.files[0];

    if (file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload/senior-high-data', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            alert(result.message || 'Upload successful');
        } catch (error) {
            alert('Failed to upload senior high data');
        }
    }
});


// upload college file
collegeUploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fileInput = document.getElementById('collegeFile');
    const file = fileInput.files[0];

    if (file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload/college-data', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            alert(result.message || 'Upload successful');
        } catch (error) {
            alert('Failed to upload college data');
        }
    }
});

// remove senior high data
removeSeniorHigh.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/remove-senior-high-data', {
            method: 'POST',
        });
        const result = await response.json();
        alert(result.message || 'Senior high data removed');
    } catch (error) {
        alert('Failed to remove senior high data');
    }
});

// remove college data
removeCollege.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/remove-college-data', {
            method: 'POST',
        });
        const result = await response.json();
        alert(result.message || 'College data removed');
    } catch (error) {
        alert('Failed to remove college data');
    }
});