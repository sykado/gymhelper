// script_v3.js for FlexTrack - Gym Progress Tracker (New Design)

// Storage keys remain the same conceptually
const STORAGE_KEYS = {
    machines: 'flextrack_machines_v1', // New prefix to avoid conflict with old data
    workouts: 'flextrack_workouts_v1'  // New prefix
};

let currentWeekOffset = 0;
let modalConfirmCallback = null;
let modalCancelCallback = null; // For more flexible modal closing

// --- DOM Elements ---
// Navigation & Mobile Menu
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const navButtons = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');

// Log Workout Section
const machineSelect = document.getElementById('machineSelect');
const setsContainer = document.getElementById('setsContainer');
const addSetBtn = document.getElementById('addSetBtn');
const exerciseNotes = document.getElementById('exerciseNotes');
const logExerciseBtn = document.getElementById('logExerciseBtn');
const todaysExercisesContainer = document.getElementById('todaysExercisesContainer');

// View Progress Section
const prevWeekBtn = document.getElementById('prevWeekBtn');
const nextWeekBtn = document.getElementById('nextWeekBtn');
const weekInfo = document.getElementById('weekInfo');
const weeklyWorkoutsContainer = document.getElementById('weeklyWorkoutsContainer');

// Manage Machines Section
const machineNameInput = document.getElementById('machineName');
const machineImageUrlInput = document.getElementById('machineImageUrl');
const addMachineBtn = document.getElementById('addMachineBtn');
const machinesContainer = document.getElementById('machinesContainer');

// Statistics Section
const statsContainer = document.getElementById('statsContainer');
const progressChartsContainer = document.getElementById('progressChartsContainer');
const noChartsMessage = document.getElementById('noChartsMessage');


// Storage Section
const storageInfoContainer = document.getElementById('storageInfo');
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFile');
const clearAllDataBtn = document.getElementById('clearAllDataBtn');

// Modal Elements
const customModalOverlay = document.getElementById('customModalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn'); // For the 'X' button
const customModalButtons = document.getElementById('customModalButtons');


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadInitialData();
    updateCurrentYear();
    addSetField(); // Start with one set field in log workout
});

function initializeEventListeners() {
    // Mobile Menu Toggle
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            mobileMenuBtn.querySelector('i').classList.toggle('fa-bars');
            mobileMenuBtn.querySelector('i').classList.toggle('fa-times');
        });
    }

    // Navigation
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sectionId = button.dataset.section;
            navigateToSection(sectionId);
            // Close mobile menu if open
            if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('hidden');
                mobileMenuBtn.querySelector('i').classList.remove('fa-times');
                mobileMenuBtn.querySelector('i').classList.add('fa-bars');
            }
        });
    });

    // Log Workout
    if (addSetBtn) addSetBtn.addEventListener('click', addSetField);
    if (logExerciseBtn) logExerciseBtn.addEventListener('click', handleLogExercise);

    // View Progress
    if (prevWeekBtn) prevWeekBtn.addEventListener('click', () => navigateWeek(-1));
    if (nextWeekBtn) nextWeekBtn.addEventListener('click', () => navigateWeek(1));

    // Manage Machines
    if (addMachineBtn) addMachineBtn.addEventListener('click', handleAddMachine);

    // Storage
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportDataToFile);
    if (importDataBtn) importDataBtn.addEventListener('click', () => importFileInput.click());
    if (importFileInput) importFileInput.addEventListener('change', importDataFromFile);
    if (clearAllDataBtn) clearAllDataBtn.addEventListener('click', confirmClearAllData);

    // Modal
    if (modalConfirmBtn) modalConfirmBtn.addEventListener('click', handleModalConfirm);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', handleModalCancel);
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', hideModal); // 'X' button
    if (customModalOverlay) { // Click outside modal to close
      customModalOverlay.addEventListener('click', (e) => {
        if (e.target === customModalOverlay) {
            handleModalCancel(); // Treat like a cancel
        }
      });
    }
}

function loadInitialData() {
    loadMachines();
    // Workouts are not loaded globally but fetched as needed or for today's view
    renderTodaysExercises();
    updateWeekInfo(); // This will also trigger renderWeeklyWorkouts if on that tab
    renderStatistics();
    calculateAndDisplayStorage();
}

function updateCurrentYear() {
    const yearSpan = document.getElementById('currentYear');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

// --- Navigation ---
function navigateToSection(sectionId) {
    sections.forEach(section => {
        if (section.id === sectionId) {
            section.classList.add('active');
            section.classList.remove('hidden'); // Ensure it's not hidden by Tailwind
        } else {
            section.classList.remove('active');
            section.classList.add('hidden'); // Hide with Tailwind
        }
    });
    navButtons.forEach(btn => {
        if (btn.dataset.section === sectionId) {
            btn.classList.add('bg-slate-700', 'text-sky-400', 'active'); // Active style for new design
        } else {
            btn.classList.remove('bg-slate-700', 'text-sky-400', 'active');
        }
    });

    // Trigger specific renders for sections
    if (sectionId === 'view-progress') renderWeeklyWorkouts();
    if (sectionId === 'statistics') renderStatistics();
    if (sectionId === 'manage-machines') loadMachines(); // Refresh machine list
    if (sectionId === 'log-workout' && setsContainer.children.length === 0) addSetField(); // Ensure a set field
}


// --- Modal Functions ---
function showModal(title, message, confirmCb, cancelCb, confirmText = 'Confirm', cancelText = 'Cancel', showCancel = true) {
    if (!customModalOverlay) return;
    modalTitle.textContent = title;
    modalMessage.innerHTML = message; // Use innerHTML to allow for simple HTML in messages
    modalConfirmCallback = confirmCb;
    modalCancelCallback = cancelCb;

    modalConfirmBtn.textContent = confirmText;
    modalCancelBtn.textContent = cancelText;

    if (confirmCb) {
        modalConfirmBtn.classList.remove('hidden');
    } else {
        modalConfirmBtn.classList.add('hidden');
    }

    if (showCancel) {
        modalCancelBtn.classList.remove('hidden');
    } else {
        modalCancelBtn.classList.add('hidden');
    }
    
    // Clear any dynamically added buttons
    const extraButtons = customModalButtons.querySelectorAll('.btn-extra-modal');
    extraButtons.forEach(btn => btn.remove());

    customModalOverlay.classList.remove('hidden');
    customModalOverlay.classList.add('flex'); // Use flex for centering
    // Trigger reflow for transition
    void customModalOverlay.offsetWidth;
    customModalOverlay.classList.add('active');
}

function hideModal() {
    if (!customModalOverlay) return;
    customModalOverlay.classList.remove('active');
    // Wait for transition to finish before hiding
    setTimeout(() => {
        customModalOverlay.classList.add('hidden');
        customModalOverlay.classList.remove('flex');
        modalConfirmCallback = null;
        modalCancelCallback = null;
    }, 300); // Match transition duration
}

function handleModalConfirm() {
    if (modalConfirmCallback) {
        modalConfirmCallback();
    }
    hideModal();
}

function handleModalCancel() {
    if (modalCancelCallback) {
        modalCancelCallback();
    }
    hideModal();
}

// --- Utility Functions ---
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return String(unsafe);
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function isValidHttpUrl(string) {
    if (!string) return false;
    let url;
    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
}

function formatImgurUrl(urlOrId) {
    if (typeof urlOrId !== 'string' || !urlOrId.trim()) return null;
    const input = urlOrId.trim();

    const directImgurRegex = /^(https?:\/\/i\.imgur\.com\/)([a-zA-Z0-9]+)(\.(?:jpeg|jpg|png|gif|apng|tiff|mp4|webm|pdf))?$/i;
    let match = input.match(directImgurRegex);
    if (match && match[2]) return `https://i.imgur.com/${match[2]}.jpeg`;

    const imgurPageRegex = /^(https?:\/\/(?:www\.)?imgur\.com\/(?:a\/|gallery\/)?)([a-zA-Z0-9]+)(?:\/?.*)?$/;
    match = input.match(imgurPageRegex);
    if (match && match[2]) return `https://i.imgur.com/${match[2]}.jpeg`;

    const imgurIdRegex = /^([a-zA-Z0-9]{5,10})$/; // Imgur IDs are typically 5 or 7 chars, be a bit flexible
    match = input.match(imgurIdRegex);
    if (match && match[1]) return `https://i.imgur.com/${match[1]}.jpeg`;
    
    if (isValidHttpUrl(input)) return input; // Return as is if it's a generic valid URL
    return null;
}

// --- Local Storage Wrappers ---
function getData(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error(`Error reading ${key} from localStorage:`, e);
        showModal("Storage Error", `Could not read data for ${key}. Data might be corrupted.`, null, null, "OK", null, false);
        return [];
    }
}

function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Error saving ${key} to localStorage:`, e);
        showModal("Storage Error", `Could not save data for ${key}. LocalStorage might be full or unavailable.`, null, null, "OK", null, false);
    }
}

// --- Machine Management ---
function getMachines() {
    return getData(STORAGE_KEYS.machines).map(m => ({
        ...m,
        image: m.image ? formatImgurUrl(m.image) : null
    }));
}

function saveMachines(machines) {
    const machinesToSave = machines.map(m => ({
        ...m,
        image: m.image ? formatImgurUrl(m.image) : null
    }));
    saveData(STORAGE_KEYS.machines, machinesToSave);
}

function loadMachines() {
    const machines = getMachines();
    if (!machineSelect || !machinesContainer) return;

    machineSelect.innerHTML = '<option value="">Choose a machine...</option>';
    machines.forEach(machine => {
        const option = document.createElement('option');
        option.value = machine.id;
        option.textContent = escapeHtml(machine.name);
        machineSelect.appendChild(option);
    });

    machinesContainer.innerHTML = '';
    if (machines.length === 0) {
        machinesContainer.innerHTML = '<p class="no-data-message text-slate-400 italic text-center py-4 md:col-span-full">No machines added yet. Add one above!</p>';
    } else {
        machines.forEach(machine => {
            const displayImage = machine.image ? formatImgurUrl(machine.image) : null;
            const machineCard = `
                <div class="bg-slate-700 p-4 rounded-lg shadow-lg flex flex-col justify-between">
                    <div>
                        <h4 class="text-md font-semibold text-sky-300 mb-2 truncate" title="${escapeHtml(machine.name)}">${escapeHtml(machine.name)}</h4>
                        ${displayImage ? 
                            `<img src="${escapeHtml(displayImage)}" alt="${escapeHtml(machine.name)}" class="w-full h-32 object-cover rounded-md mb-3 bg-slate-600" onerror="this.src='https://placehold.co/300x200/334155/94a3b8?text=Image+Error';">` :
                            `<div class="w-full h-32 bg-slate-600 rounded-md mb-3 flex items-center justify-center text-slate-400"><i class="fas fa-image text-3xl"></i></div>`
                        }
                    </div>
                    <button class="delete-machine-btn w-full mt-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-md shadow-sm transition-colors duration-150 text-xs" data-id="${machine.id}">
                        <i class="fas fa-trash-alt mr-1"></i> Delete
                    </button>
                </div>
            `;
            machinesContainer.insertAdjacentHTML('beforeend', machineCard);
        });
        machinesContainer.querySelectorAll('.delete-machine-btn').forEach(button => {
            button.addEventListener('click', (event) => confirmDeleteMachine(event.target.closest('button').dataset.id));
        });
    }
}

function handleAddMachine() {
    const name = machineNameInput.value.trim();
    const imageUrlInput = machineImageUrlInput.value.trim();

    if (!name) {
        showModal('Input Error', 'Machine name cannot be empty.', null, null, 'OK', null, false);
        return;
    }

    const formattedImageUrl = imageUrlInput ? formatImgurUrl(imageUrlInput) : null;
    if (imageUrlInput && !formattedImageUrl && !isValidHttpUrl(imageUrlInput)) {
        showModal('Input Error', 'Invalid Image URL or ID. Please provide a valid Imgur link/ID or a full image URL (http:// or https://).', null, null, 'OK', null, false);
        return;
    }

    const machines = getMachines();
    if (machines.some(m => m.name.toLowerCase() === name.toLowerCase())) {
        showModal('Duplicate Error', `A machine named "${escapeHtml(name)}" already exists.`, null, null, 'OK', null, false);
        return;
    }

    const newMachine = { id: crypto.randomUUID(), name, image: formattedImageUrl };
    machines.push(newMachine);
    saveMachines(machines);
    loadMachines(); // Refresh lists
    machineNameInput.value = '';
    machineImageUrlInput.value = '';
    showModal('Success!', `Machine "${escapeHtml(name)}" added.`, null, null, 'Great!', null, false);
}

function confirmDeleteMachine(machineId) {
    const machines = getMachines();
    const machine = machines.find(m => m.id === machineId);
    if (!machine) return;
    showModal(
        'Confirm Deletion',
        `Are you sure you want to delete the machine: <strong>${escapeHtml(machine.name)}</strong>? This will also remove all associated workout entries. This action cannot be undone.`,
        () => deleteMachine(machineId)
    );
}

function deleteMachine(machineId) {
    let machines = getMachines();
    machines = machines.filter(m => m.id !== machineId);
    saveMachines(machines);
    loadMachines();

    let workouts = getWorkouts();
    workouts = workouts.map(workout => {
        workout.exercises = workout.exercises.filter(ex => ex.machineId !== machineId);
        return workout;
    }).filter(workout => workout.exercises.length > 0);
    saveWorkouts(workouts);

    showModal('Machine Deleted', 'The machine and its associated workouts have been removed.', null, null, 'OK', null, false);
    renderTodaysExercises(); // Refresh if today's workout was affected
    renderWeeklyWorkouts(); // Refresh weekly view
    renderStatistics(); // Update stats
}

// --- Workout Data Management ---
function getWorkouts() {
    const allMachines = getMachines(); // Get current machine data for names/images
    return getData(STORAGE_KEYS.workouts).map(workout => ({
        ...workout,
        exercises: workout.exercises.map(ex => {
            const machineDetails = allMachines.find(m => m.id === ex.machineId);
            return {
                ...ex,
                machineName: machineDetails ? machineDetails.name : (ex.machineName || 'Unknown Machine'),
                machineImage: machineDetails ? machineDetails.image : (ex.machineImage ? formatImgurUrl(ex.machineImage) : null)
            };
        })
    }));
}

function saveWorkouts(workouts) {
    const workoutsToSave = workouts.map(workout => ({
        ...workout,
        exercises: workout.exercises.map(ex => ({
            ...ex,
            machineImage: ex.machineImage ? formatImgurUrl(ex.machineImage) : null
        }))
    }));
    saveData(STORAGE_KEYS.workouts, workoutsToSave);
}

// --- Workout Logging ---
function addSetField() {
    if (!setsContainer) return;
    const setIndex = setsContainer.children.length;
    const setFieldHTML = `
        <div class="set-fields flex items-center space-x-2 bg-slate-700 p-3 rounded-lg">
            <span class="text-sm text-slate-400 w-6 text-center">${setIndex + 1}.</span>
            <input type="number" placeholder="kg" class="set-weight w-1/3 bg-slate-600 border border-slate-500 text-slate-100 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500" step="0.1" min="0">
            <span class="text-slate-400 text-xs">kg</span>
            <input type="number" placeholder="Reps" class="set-reps w-1/3 bg-slate-600 border border-slate-500 text-slate-100 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500" step="1" min="1">
            <span class="text-slate-400 text-xs">reps</span>
            <button type="button" class="remove-set-btn text-red-400 hover:text-red-300 p-1 rounded-full transition-colors">
                <i class="fas fa-minus-circle text-lg"></i>
            </button>
        </div>
    `;
    setsContainer.insertAdjacentHTML('beforeend', setFieldHTML);
    const newSetField = setsContainer.lastElementChild;
    newSetField.querySelector('.remove-set-btn').addEventListener('click', (e) => {
        e.target.closest('.set-fields').remove();
        // Re-number sets if needed (optional, good for UX)
        setsContainer.querySelectorAll('.set-fields').forEach((field, index) => {
            field.querySelector('span:first-child').textContent = `${index + 1}.`;
        });
        if (setsContainer.children.length === 0) addSetField(); // Ensure at least one
    });
}

function handleLogExercise() {
    const selectedMachineId = machineSelect.value;
    const notes = exerciseNotes.value.trim();
    const workoutDate = new Date().toISOString().split('T')[0];

    if (!selectedMachineId) {
        showModal('Input Error', 'Please select a machine.', null, null, 'OK', null, false);
        return;
    }

    const sets = [];
    let hasValidSet = false;
    document.querySelectorAll('#setsContainer .set-fields').forEach(setField => {
        const weightInput = setField.querySelector('.set-weight');
        const repsInput = setField.querySelector('.set-reps');
        const weight = parseFloat(weightInput.value);
        const reps = parseInt(repsInput.value);

        if (!isNaN(weight) && weight >= 0 && !isNaN(reps) && reps > 0) {
            sets.push({ weight, reps });
            hasValidSet = true;
        }
    });

    if (!hasValidSet) {
        showModal('Input Error', 'Please enter at least one valid set (weight must be 0 or more, reps must be positive).', null, null, 'OK', null, false);
        return;
    }

    let workouts = getWorkouts();
    let todayWorkout = workouts.find(w => w.date === workoutDate);
    if (!todayWorkout) {
        todayWorkout = { date: workoutDate, exercises: [] };
        workouts.push(todayWorkout);
    }

    const machine = getMachines().find(m => m.id === selectedMachineId);
    const newExercise = {
        machineId: selectedMachineId,
        machineName: machine ? machine.name : 'Unknown Machine',
        machineImage: machine ? machine.image : null,
        sets: sets,
        notes: notes
    };

    const existingExerciseIndex = todayWorkout.exercises.findIndex(e => e.machineId === selectedMachineId);
    if (existingExerciseIndex > -1) {
        const existingExercise = todayWorkout.exercises[existingExerciseIndex];
        showModal(
            'Exercise Exists',
            `An exercise for <strong>${escapeHtml(existingExercise.machineName)}</strong> already exists for today. What would you like to do?`,
            () => { // Confirm callback (Replace)
                todayWorkout.exercises[existingExerciseIndex] = newExercise;
                saveWorkouts(workouts);
                renderTodaysExercises();
                resetLogWorkoutForm();
                showModal('Workout Updated', 'Exercise replaced successfully!', null, null, 'OK', null, false);
            },
            null, // No specific cancel callback, default hideModal is fine
            'Replace Existing',
            'Cancel',
            true
        );
        // Add "Add Sets" button dynamically to the modal
        const addSetsBtn = document.createElement('button');
        addSetsBtn.classList.add('btn-extra-modal', 'px-4', 'py-2', 'rounded-lg', 'bg-teal-500', 'hover:bg-teal-600', 'text-white', 'font-semibold', 'transition-colors', 'text-sm');
        addSetsBtn.textContent = 'Add These Sets';
        addSetsBtn.onclick = () => {
            existingExercise.sets.push(...newExercise.sets);
            if (newExercise.notes) existingExercise.notes = newExercise.notes;
            saveWorkouts(workouts);
            renderTodaysExercises();
            resetLogWorkoutForm();
            hideModal();
            showModal('Workout Updated', 'New sets added to existing exercise!', null, null, 'OK', null, false);
        };
        customModalButtons.insertBefore(addSetsBtn, modalCancelBtn); // Insert before cancel

    } else {
        todayWorkout.exercises.push(newExercise);
        saveWorkouts(workouts);
        renderTodaysExercises();
        resetLogWorkoutForm();
        showModal('Workout Logged', `Exercise "${escapeHtml(newExercise.machineName)}" logged successfully!`, null, null, 'Awesome!', null, false);
    }
    renderStatistics(); // Update stats
}

function resetLogWorkoutForm() {
    machineSelect.value = '';
    setsContainer.innerHTML = '';
    addSetField();
    exerciseNotes.value = '';
}

function renderTodaysExercises() {
    if (!todaysExercisesContainer) return;
    const workoutDate = new Date().toISOString().split('T')[0];
    const workouts = getWorkouts();
    const todayWorkout = workouts.find(w => w.date === workoutDate);

    todaysExercisesContainer.innerHTML = '';
    if (!todayWorkout || todayWorkout.exercises.length === 0) {
        todaysExercisesContainer.innerHTML = '<p class="no-data-message text-slate-400 italic text-center py-4">No exercises logged for today yet. Log your first workout above!</p>';
        return;
    }

    todayWorkout.exercises.forEach((exercise, index) => {
        todaysExercisesContainer.appendChild(createExerciseCard(exercise, index, todayWorkout.date, false)); // No edit/delete for today's view directly
    });
}


// --- View Progress (Weekly) ---
function navigateWeek(direction) {
    currentWeekOffset += direction;
    updateWeekInfo();
    renderWeeklyWorkouts();
}

function updateWeekInfo() {
    if (!weekInfo) return;
    const today = new Date();
    let currentDayOfWeek = today.getDay(); // Sunday is 0
    if (currentDayOfWeek === 0) currentDayOfWeek = 7; // Make Sunday 7 for easier Monday start calculation

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDayOfWeek + 1 + (currentWeekOffset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const options = { month: 'short', day: 'numeric' };
    weekInfo.textContent = `${startOfWeek.toLocaleDateString(undefined, options)} - ${endOfWeek.toLocaleDateString(undefined, options)}`;
}

function renderWeeklyWorkouts() {
    if (!weeklyWorkoutsContainer) return;
    const workouts = getWorkouts();
    weeklyWorkoutsContainer.innerHTML = '';

    const today = new Date();
    let currentDayOfWeek = today.getDay();
    if (currentDayOfWeek === 0) currentDayOfWeek = 7;

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDayOfWeek + 1 + (currentWeekOffset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const workoutsInWeek = workouts.filter(workout => {
        const workoutDate = new Date(workout.date + "T00:00:00"); // Ensure local date
        return workoutDate >= startOfWeek && workoutDate <= endOfWeek;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (workoutsInWeek.length === 0) {
        weeklyWorkoutsContainer.innerHTML = '<p class="no-data-message text-slate-400 italic text-center py-4">No workouts logged for this week.</p>';
        return;
    }

    workoutsInWeek.forEach(workout => {
        const workoutDateObj = new Date(workout.date + "T00:00:00");
        const dayCard = document.createElement('div');
        dayCard.className = 'bg-slate-700 p-4 rounded-lg shadow-md';
        dayCard.innerHTML = `<h4 class="text-lg font-semibold text-sky-300 mb-3 border-b border-slate-600 pb-2">${workoutDateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h4>`;
        
        const exercisesList = document.createElement('div');
        exercisesList.className = 'space-y-3';
        workout.exercises.forEach((exercise, index) => {
            exercisesList.appendChild(createExerciseCard(exercise, index, workout.date, true)); // showEditDelete = true
        });
        dayCard.appendChild(exercisesList);
        weeklyWorkoutsContainer.appendChild(dayCard);
    });
}

function createExerciseCard(exercise, index, workoutDate, showEditDelete = false) {
    const card = document.createElement('div');
    card.className = 'exercise-card bg-slate-600 p-3 rounded-md shadow';
    
    const displayImage = exercise.machineImage ? formatImgurUrl(exercise.machineImage) : null;

    let setsHtml = '<ul class="text-xs text-slate-300 list-disc list-inside pl-1 space-y-0.5">';
    exercise.sets.forEach((set, i) => {
        setsHtml += `<li>Set ${i + 1}: ${set.weight}kg x ${set.reps} reps</li>`;
    });
    setsHtml += '</ul>';

    card.innerHTML = `
        <div class="flex items-start space-x-3">
            ${displayImage ? 
                `<img src="${escapeHtml(displayImage)}" alt="${escapeHtml(exercise.machineName)}" class="w-16 h-16 object-cover rounded bg-slate-500 flex-shrink-0" onerror="this.src='https://placehold.co/64x64/475569/94a3b8?text=Err';">` :
                `<div class="w-16 h-16 bg-slate-500 rounded flex items-center justify-center text-slate-400 flex-shrink-0"><i class="fas fa-image text-2xl"></i></div>`
            }
            <div class="flex-grow">
                <h5 class="text-sm font-semibold text-sky-400 truncate" title="${escapeHtml(exercise.machineName)}">${escapeHtml(exercise.machineName)}</h5>
                ${setsHtml}
                ${exercise.notes ? `<p class="text-xs text-slate-400 mt-1 italic">Notes: ${escapeHtml(exercise.notes)}</p>` : ''}
            </div>
            ${showEditDelete ? `
                <div class="flex flex-col space-y-1 flex-shrink-0">
                    <button class="edit-exercise-btn text-blue-400 hover:text-blue-300 p-1 text-xs" data-date="${workoutDate}" data-index="${index}" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="delete-exercise-btn text-red-400 hover:text-red-300 p-1 text-xs" data-date="${workoutDate}" data-index="${index}" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            ` : ''}
        </div>
    `;

    if (showEditDelete) {
        card.querySelector('.edit-exercise-btn')?.addEventListener('click', (e) => {
            const date = e.currentTarget.dataset.date;
            const idx = parseInt(e.currentTarget.dataset.index);
            editExercise(date, idx);
        });
        card.querySelector('.delete-exercise-btn')?.addEventListener('click', (e) => {
            const date = e.currentTarget.dataset.date;
            const idx = parseInt(e.currentTarget.dataset.index);
            confirmDeleteExercise(date, idx);
        });
    }
    return card;
}

function editExercise(date, index) {
    let workouts = getWorkouts();
    const workout = workouts.find(w => w.date === date);
    if (!workout || !workout.exercises[index]) {
        showModal('Error', 'Exercise not found for editing.', null, null, 'OK', null, false);
        return;
    }
    const exerciseToEdit = workout.exercises[index];

    // Populate form
    machineSelect.value = exerciseToEdit.machineId;
    exerciseNotes.value = exerciseToEdit.notes || '';
    setsContainer.innerHTML = '';
    exerciseToEdit.sets.forEach(() => addSetField()); // Add correct number of fields
    
    // Populate set fields (after they are created)
    const setFields = setsContainer.querySelectorAll('.set-fields');
    exerciseToEdit.sets.forEach((set, i) => {
        if(setFields[i]) {
            setFields[i].querySelector('.set-weight').value = set.weight;
            setFields[i].querySelector('.set-reps').value = set.reps;
        }
    });
    if (exerciseToEdit.sets.length === 0) addSetField(); // Ensure one if no sets

    // Change Log button to Save
    logExerciseBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Edited Exercise';
    logExerciseBtn.dataset.editingDate = date;
    logExerciseBtn.dataset.editingIndex = index;
    
    showModal('Editing Exercise', `You are now editing: <strong>${escapeHtml(exerciseToEdit.machineName)}</strong>. Make changes in the "Log Workout" form and click "Save Edited Exercise".`, null, null, 'Got it!', null, false);
    navigateToSection('log-workout');
}

// Modify handleLogExercise to check for editing mode
function handleLogExercise() { // Renamed from original logWorkout to avoid conflict if old script is around
    if (logExerciseBtn.dataset.editingDate && logExerciseBtn.dataset.editingIndex) {
        saveEditedExercise();
    } else {
        // Original log new exercise logic (already refactored above)
        // Call the refactored function for logging a new exercise
        // This function is now the primary one called by the button click
        // The logic for new vs edit is now inside this function
        const selectedMachineId = machineSelect.value;
        const notes = exerciseNotes.value.trim();
        const workoutDate = new Date().toISOString().split('T')[0];

        if (!selectedMachineId) {
            showModal('Input Error', 'Please select a machine.', null, null, 'OK', null, false);
            return;
        }

        const sets = [];
        let hasValidSet = false;
        document.querySelectorAll('#setsContainer .set-fields').forEach(setField => {
            const weight = parseFloat(setField.querySelector('.set-weight').value);
            const reps = parseInt(setField.querySelector('.set-reps').value);
            if (!isNaN(weight) && weight >= 0 && !isNaN(reps) && reps > 0) {
                sets.push({ weight, reps });
                hasValidSet = true;
            }
        });

        if (!hasValidSet) {
            showModal('Input Error', 'Please enter at least one valid set.', null, null, 'OK', null, false);
            return;
        }

        let workouts = getWorkouts();
        let todayWorkout = workouts.find(w => w.date === workoutDate);
        if (!todayWorkout) {
            todayWorkout = { date: workoutDate, exercises: [] };
            workouts.push(todayWorkout);
        }

        const machine = getMachines().find(m => m.id === selectedMachineId);
        const newExercise = {
            machineId: selectedMachineId,
            machineName: machine ? machine.name : 'Unknown Machine',
            machineImage: machine ? machine.image : null,
            sets: sets,
            notes: notes
        };

        const existingExerciseIndex = todayWorkout.exercises.findIndex(e => e.machineId === selectedMachineId);
        if (existingExerciseIndex > -1 && !(logExerciseBtn.dataset.editingDate && todayWorkout.exercises[existingExerciseIndex].machineId === selectedMachineId)) { // Check if not currently editing this exact exercise
            const existingExercise = todayWorkout.exercises[existingExerciseIndex];
             showModal(
                'Exercise Exists',
                `An exercise for <strong>${escapeHtml(existingExercise.machineName)}</strong> already exists for today. What would you like to do?`,
                () => { // Confirm callback (Replace)
                    todayWorkout.exercises[existingExerciseIndex] = newExercise;
                    saveWorkouts(workouts);
                    renderTodaysExercises();
                    resetLogWorkoutForm();
                    showModal('Workout Updated', 'Exercise replaced successfully!', null, null, 'OK', null, false);
                },
                null, 
                'Replace Existing',
                'Cancel',
                true
            );
            const addSetsBtn = document.createElement('button');
            addSetsBtn.className = 'btn-extra-modal px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-semibold transition-colors text-sm';
            addSetsBtn.textContent = 'Add These Sets';
            addSetsBtn.onclick = () => {
                existingExercise.sets.push(...newExercise.sets);
                if (newExercise.notes) existingExercise.notes = newExercise.notes;
                saveWorkouts(workouts);
                renderTodaysExercises();
                resetLogWorkoutForm();
                hideModal();
                showModal('Workout Updated', 'New sets added to existing exercise!', null, null, 'OK', null, false);
            };
            customModalButtons.insertBefore(addSetsBtn, modalCancelBtn);
        } else { // New exercise or saving an edit
            if (logExerciseBtn.dataset.editingDate) { // This means it was an edit flow, but for a different machine or new entry
                 // This case should be handled by saveEditedExercise, but as a fallback:
                 todayWorkout.exercises.push(newExercise); // Add as new if IDs don't match
            } else {
                 todayWorkout.exercises.push(newExercise);
            }
            saveWorkouts(workouts);
            renderTodaysExercises();
            resetLogWorkoutForm();
            showModal('Workout Logged', `Exercise "${escapeHtml(newExercise.machineName)}" logged successfully!`, null, null, 'Awesome!', null, false);
        }
        renderStatistics();
    }
}


function saveEditedExercise() {
    const date = logExerciseBtn.dataset.editingDate;
    const index = parseInt(logExerciseBtn.dataset.editingIndex);

    let workouts = getWorkouts();
    const workout = workouts.find(w => w.date === date);
    if (!workout || !workout.exercises[index]) {
        showModal('Error', 'Could not save. Original exercise not found.', null, null, 'OK', null, false);
        resetEditState();
        return;
    }

    const updatedMachineId = machineSelect.value;
    const updatedNotes = exerciseNotes.value.trim();
    const updatedSets = [];
    let hasValidSet = false;
    document.querySelectorAll('#setsContainer .set-fields').forEach(setField => {
        const weight = parseFloat(setField.querySelector('.set-weight').value);
        const reps = parseInt(setField.querySelector('.set-reps').value);
        if (!isNaN(weight) && weight >= 0 && !isNaN(reps) && reps > 0) {
            updatedSets.push({ weight, reps });
            hasValidSet = true;
        }
    });

    if (!hasValidSet) {
        showModal('Input Error', 'Please enter at least one valid set to save the edited exercise.', null, null, 'OK', null, false);
        return;
    }
    if (!updatedMachineId) {
        showModal('Input Error', 'Please select a machine for the edited exercise.', null, null, 'OK', null, false);
        return;
    }

    const machine = getMachines().find(m => m.id === updatedMachineId);
    workout.exercises[index] = {
        machineId: updatedMachineId,
        machineName: machine ? machine.name : 'Unknown Machine',
        machineImage: machine ? machine.image : null,
        sets: updatedSets,
        notes: updatedNotes
    };

    saveWorkouts(workouts);
    resetEditState();
    resetLogWorkoutForm();
    renderWeeklyWorkouts(); // Refresh view where edit was initiated
    renderTodaysExercises(); // Also refresh today's view
    renderStatistics();
    showModal('Update Successful', 'Exercise updated!', null, null, 'OK', null, false);
    navigateToSection('view-progress'); // Go back to progress view
}

function resetEditState() {
    logExerciseBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Log Exercise';
    delete logExerciseBtn.dataset.editingDate;
    delete logExerciseBtn.dataset.editingIndex;
}

function confirmDeleteExercise(date, index) {
    const workouts = getWorkouts();
    const workout = workouts.find(w => w.date === date);
    const exercise = workout?.exercises[index];
    if (!exercise) return;
    showModal(
        'Confirm Delete Exercise',
        `Are you sure you want to delete this entry for <strong>${escapeHtml(exercise.machineName)}</strong> on ${new Date(date + "T00:00:00").toLocaleDateString()}?`,
        () => deleteExercise(date, index)
    );
}

function deleteExercise(date, index) {
    let workouts = getWorkouts();
    const workoutIndex = workouts.findIndex(w => w.date === date);
    if (workoutIndex > -1) {
        workouts[workoutIndex].exercises.splice(index, 1);
        if (workouts[workoutIndex].exercises.length === 0) {
            workouts.splice(workoutIndex, 1); // Remove day if no exercises left
        }
        saveWorkouts(workouts);
        renderWeeklyWorkouts();
        renderTodaysExercises();
        renderStatistics();
        showModal('Exercise Deleted', 'The exercise entry has been removed.', null, null, 'OK', null, false);
    }
}


// --- Statistics ---
let activeCharts = {}; // To store Chart.js instances { machineId: chartInstance }

function renderStatistics() {
    if (!statsContainer || !progressChartsContainer) return;
    const workouts = getWorkouts();
    
    // Clear previous content
    statsContainer.innerHTML = '';
    progressChartsContainer.innerHTML = ''; // Clear chart canvases
    if(noChartsMessage) noChartsMessage.classList.remove('hidden');


    // Destroy old charts
    Object.values(activeCharts).forEach(chart => chart.destroy());
    activeCharts = {};

    if (workouts.length === 0) {
        statsContainer.innerHTML = '<p class="no-data-message text-slate-400 italic text-center py-4 md:col-span-full">Log some workouts to see your statistics here!</p>';
        return;
    }

    const machineStats = {};
    workouts.forEach(workout => {
        workout.exercises.forEach(exercise => {
            if (!machineStats[exercise.machineId]) {
                machineStats[exercise.machineId] = {
                    name: exercise.machineName,
                    image: exercise.machineImage,
                    totalVolume: 0, totalReps: 0, maxWeight: 0, maxRepsForMaxWeight: 0,
                    lastWorkoutDate: '1970-01-01', workoutCount: 0,
                    prSets: [], dailyPerformance: {} // date: {volume, sets}
                };
            }
            const stats = machineStats[exercise.machineId];
            stats.workoutCount++;
            if (new Date(workout.date) > new Date(stats.lastWorkoutDate)) {
                stats.lastWorkoutDate = workout.date;
            }

            if (!stats.dailyPerformance[workout.date]) {
                stats.dailyPerformance[workout.date] = { volume: 0, sets: 0 };
            }

            exercise.sets.forEach(set => {
                const volumeForSet = set.weight * set.reps;
                stats.totalVolume += volumeForSet;
                stats.dailyPerformance[workout.date].volume += volumeForSet;
                stats.dailyPerformance[workout.date].sets += 1;
                stats.totalReps += set.reps;

                if (set.weight > stats.maxWeight) {
                    stats.maxWeight = set.weight;
                    stats.maxRepsForMaxWeight = set.reps;
                } else if (set.weight === stats.maxWeight && set.reps > stats.maxRepsForMaxWeight) {
                    stats.maxRepsForMaxWeight = set.reps;
                }
                // Simplified PR: add any set, then sort and filter later
                stats.prSets.push({ weight: set.weight, reps: set.reps, date: workout.date });
            });
        });
    });
    
    if (Object.keys(machineStats).length === 0) {
         statsContainer.innerHTML = '<p class="no-data-message text-slate-400 italic text-center py-4 md:col-span-full">No exercise data found for statistics.</p>';
        return;
    }


    let chartsRendered = 0;
    for (const machineId in machineStats) {
        const stats = machineStats[machineId];
        // Sort PRs: recent, then by weight*reps (approx strength)
        stats.prSets.sort((a,b) => new Date(b.date) - new Date(a.date) || (b.weight*b.reps) - (a.weight*a.reps));
        const uniquePrs = [];
        const prKeySet = new Set();
        for(const pr of stats.prSets){
            const key = `${pr.weight}-${pr.reps}`;
            if(!prKeySet.has(key)){
                uniquePrs.push(pr);
                prKeySet.add(key);
                if(uniquePrs.length >= 3) break; // Show top 3 unique PRs
            }
        }
        stats.prSets = uniquePrs;


        const displayImage = stats.image ? formatImgurUrl(stats.image) : null;
        const statCard = `
            <div class="bg-slate-700 p-4 rounded-lg shadow-lg">
                <h4 class="text-md font-semibold text-sky-300 mb-2 truncate" title="${escapeHtml(stats.name)}">${escapeHtml(stats.name)}</h4>
                ${displayImage ? `<img src="${escapeHtml(displayImage)}" alt="${escapeHtml(stats.name)}" class="w-full h-24 object-cover rounded-md mb-2 bg-slate-600" onerror="this.style.display='none';">` : ''}
                <p class="text-xs text-slate-300">Total Volume: <span class="font-medium text-sky-400">${stats.totalVolume.toFixed(1)} kg</span></p>
                <p class="text-xs text-slate-300">Max Weight: <span class="font-medium text-sky-400">${stats.maxWeight} kg x ${stats.maxRepsForMaxWeight} reps</span></p>
                <p class="text-xs text-slate-300">Workouts: <span class="font-medium text-sky-400">${stats.workoutCount}</span></p>
                <p class="text-xs text-slate-300">Last Trained: <span class="font-medium text-sky-400">${new Date(stats.lastWorkoutDate+"T00:00:00").toLocaleDateString()}</span></p>
                ${stats.prSets.length > 0 ? `<h5 class="text-xs font-semibold text-sky-300 mt-1 mb-0.5">Top PRs:</h5><ul class="text-xs text-slate-400 list-disc list-inside pl-1">` + stats.prSets.map(pr => `<li>${pr.weight}kg x ${pr.reps}r (${new Date(pr.date+"T00:00:00").toLocaleDateString('en-CA')})</li>`).join('') + `</ul>` : ''}
            </div>
        `;
        statsContainer.insertAdjacentHTML('beforeend', statCard);

        // Chart Data Prep
        const chartLabels = Object.keys(stats.dailyPerformance).sort((a,b) => new Date(a) - new Date(b));
        if (chartLabels.length > 1) { // Need at least 2 points for a line chart
            const chartDataset = chartLabels.map(date => stats.dailyPerformance[date].volume);
            renderLineChart(machineId, stats.name, chartLabels, chartDataset);
            chartsRendered++;
        }
    }
    if(chartsRendered > 0 && noChartsMessage) noChartsMessage.classList.add('hidden');

}

function renderLineChart(machineId, machineName, labels, data) {
    if (!progressChartsContainer) return;
    const chartDiv = document.createElement('div');
    chartDiv.className = 'bg-slate-700 p-3 rounded-lg shadow-lg chart-container'; // Ensure chart-container class for responsive canvas
    const canvas = document.createElement('canvas');
    canvas.id = `chart-${machineId}`;
    chartDiv.appendChild(canvas);
    progressChartsContainer.appendChild(chartDiv);

    if (activeCharts[machineId]) activeCharts[machineId].destroy();

    activeCharts[machineId] = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels.map(date => new Date(date+"T00:00:00").toLocaleDateString(undefined, {month:'short', day:'numeric'})),
            datasets: [{
                label: `${escapeHtml(machineName)} Volume (kg)`,
                data: data,
                borderColor: 'rgb(56, 189, 248)', // sky-400
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                tension: 0.2,
                fill: true,
                pointBackgroundColor: 'rgb(14, 116, 144)', // sky-600
                pointBorderColor: 'rgb(14, 116, 144)',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(14, 116, 144)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Important for responsiveness in a flex/grid container
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Volume (kg)', color: '#94a3b8' }, // slate-400
                    grid: { color: 'rgba(71, 85, 105, 0.5)'}, // slate-600 with opacity
                    ticks: { color: '#cbd5e1'} // slate-300
                },
                x: {
                    title: { display: true, text: 'Date', color: '#94a3b8' },
                    grid: { display: false },
                    ticks: { color: '#cbd5e1' }
                }
            },
            plugins: {
                legend: { display: true, labels: { color: '#cbd5e1'} },
                tooltip: {
                    backgroundColor: '#1e293b', // slate-800
                    titleColor: '#67e8f9', // cyan-300
                    bodyColor: '#e2e8f0', // slate-200
                    borderColor: '#334155', // slate-700
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.toFixed(1)} kg`;
                        }
                    }
                }
            }
        }
    });
}


// --- Storage Management ---
function calculateAndDisplayStorage() {
    if (!storageInfoContainer) return;
    try {
        const machinesData = localStorage.getItem(STORAGE_KEYS.machines) || '[]';
        const workoutsData = localStorage.getItem(STORAGE_KEYS.workouts) || '[]';
        const totalBytes = new TextEncoder().encode(machinesData + workoutsData).length;
        const kb = totalBytes / 1024;
        const mb = kb / 1024;
        let displaySize = (mb >= 1) ? `${mb.toFixed(2)} MB` : (kb >= 1) ? `${kb.toFixed(2)} KB` : `${totalBytes} Bytes`;
        storageInfoContainer.textContent = `Approx. data stored: ${displaySize}`;
    } catch (e) {
        storageInfoContainer.textContent = 'Could not calculate storage size.';
    }
}

function exportDataToFile() {
    const data = { machines: getMachines(), workouts: getWorkouts() };
    try {
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flextrack_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showModal('Export Complete', 'Your data has been downloaded.', null, null, 'OK', null, false);
    } catch (e) {
        showModal('Export Error', 'Could not export data.', null, null, 'OK', null, false);
    }
}

function importDataFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData && typeof importedData.machines !== 'undefined' && typeof importedData.workouts !== 'undefined') {
                showModal('Import Data', 'Importing this file will <strong>overwrite</strong> your current data. Are you sure?', () => {
                    saveMachines(importedData.machines || []);
                    saveWorkouts(importedData.workouts || []);
                    loadInitialData(); // Reload all data and refresh UI
                    navigateToSection('log-workout'); // Go to a default section
                    showModal('Import Successful', 'Data imported successfully!', null, null, 'OK', null, false);
                });
            } else {
                showModal('Import Error', 'Invalid file format. Must contain "machines" and "workouts".', null, null, 'OK', null, false);
            }
        } catch (error) {
            showModal('Import Error', `Could not parse file. Error: ${error.message}`, null, null, 'OK', null, false);
        }
    };
    reader.onerror = () => showModal('Import Error', 'Error reading the file.', null, null, 'OK', null, false);
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}

function confirmClearAllData() {
    showModal(
        'Clear All Data',
        'Are you absolutely sure you want to delete <strong>ALL</strong> your machines and workout data? This action cannot be undone.',
        () => {
            localStorage.removeItem(STORAGE_KEYS.machines);
            localStorage.removeItem(STORAGE_KEYS.workouts);
            currentWeekOffset = 0; // Reset week offset
            loadInitialData(); // Reload and re-render everything
            navigateToSection('log-workout'); // Go to a default section
            showModal('Data Cleared', 'All your data has been successfully cleared.', null, null, 'OK', null, false);
        }
    );
}
