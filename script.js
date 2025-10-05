// DOM Elements
const taskInput = document.getElementById('task-input');
const dueDateInput = document.getElementById('due-date-input');
const addButton = document.getElementById('add-button');
const taskList = document.getElementById('task-list');
const tasksCounter = document.getElementById('tasks-counter');
const clearCompletedBtn = document.getElementById('clear-completed');
const filters = document.querySelectorAll('.filter');
const notificationSettingsBtn = document.getElementById('notification-settings');
const notificationModal = document.getElementById('notification-modal');
const closeModalBtn = document.querySelector('.close-modal');
const saveNotificationSettingsBtn = document.getElementById('save-notification-settings');
const enableNotificationsCheckbox = document.getElementById('enable-notifications');
const notificationTimeSelect = document.getElementById('notification-time');
const enableSoundCheckbox = document.getElementById('enable-sound');
const soundVolumeSlider = document.getElementById('sound-volume');
const soundPreviewBtn = document.getElementById('sound-preview');

// Create notification sound
const notificationSound = new Audio('notification-sound.mp3');
notificationSound.preload = 'auto';

// App State
let tasks = [];
let currentFilter = 'all';
let notificationSettings = {
    enabled: true,
    reminderTime: 0, // minutes before due time
    soundEnabled: true,
    soundVolume: 0.7 // 0 to 1
};
let notificationTimers = {};

// Initialize the app
function init() {
    // Load tasks from localStorage
    try {
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
        }
    } catch (error) {
        console.error('Error loading tasks from localStorage:', error);
        tasks = [];
    }
    
    // Load notification settings
    try {
        const savedSettings = localStorage.getItem('notificationSettings');
        if (savedSettings) {
            notificationSettings = JSON.parse(savedSettings);
        }
    } catch (error) {
        console.error('Error loading notification settings:', error);
        notificationSettings = { 
            enabled: true, 
            reminderTime: 0,
            soundEnabled: true,
            soundVolume: 0.7
        };
    }
    
    renderTasks();
    updateTasksCounter();
    
    // Load notification settings into UI
    enableNotificationsCheckbox.checked = notificationSettings.enabled;
    if (notificationTimeSelect) {
        // Ensure we set a string value
        notificationTimeSelect.value = String(notificationSettings.reminderTime || 0);
    }
    
    // Load sound settings if elements exist
    if (enableSoundCheckbox) {
        enableSoundCheckbox.checked = notificationSettings.soundEnabled !== false;
    }
    if (soundVolumeSlider) {
        soundVolumeSlider.value = (notificationSettings.soundVolume || 0.7) * 100;
        updateSoundVolume();
    }
    
    // Request notification permission if enabled
    if (notificationSettings.enabled) {
        requestNotificationPermission();
    }
    
    // Set up notification timers for existing tasks
    setupNotificationTimers();
    
    // Check for overdue tasks on startup
    checkOverdueTasks();
    
    // Add event listeners
    addButton.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
    clearCompletedBtn.addEventListener('click', clearCompleted);
    
    // Filter event listeners
    filters.forEach(filter => {
        filter.addEventListener('click', () => {
            // Update active filter
            filters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            
            currentFilter = filter.getAttribute('data-filter');
            renderTasks();
        });
    });
    
    // Notification settings modal
    notificationSettingsBtn.addEventListener('click', () => {
        notificationModal.classList.add('show');
    });
    
    closeModalBtn.addEventListener('click', () => {
        notificationModal.classList.remove('show');
    });
    
    saveNotificationSettingsBtn.addEventListener('click', saveNotificationSettings);
    
    // Sound preview button
    if (soundPreviewBtn) {
        soundPreviewBtn.addEventListener('click', () => {
            playNotificationSound();
        });
    }
    
    // Sound volume slider
    if (soundVolumeSlider) {
        soundVolumeSlider.addEventListener('input', updateSoundVolume);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === notificationModal) {
            notificationModal.classList.remove('show');
        }
    });

    // Close modal with Escape key for accessibility
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (notificationModal.classList.contains('show')) {
                notificationModal.classList.remove('show');
            }
        }
    });
    
    // Enable drag and drop
    enableDragAndDrop();

    // Add error handling for sound loading
    notificationSound.addEventListener('error', function() {
        console.warn('Could not load notification sound file. Creating fallback sound.');
        createFallbackSound();
    });
}

// Update sound volume based on slider
function updateSoundVolume() {
    if (soundVolumeSlider) {
        const volume = soundVolumeSlider.value / 100;
        notificationSound.volume = volume;
        notificationSettings.soundVolume = volume;
    }
}

// Play notification sound
function playNotificationSound() {
    if (notificationSettings.soundEnabled) {
        try {
            // Reset the audio to the beginning
            notificationSound.currentTime = 0;
            notificationSound.volume = notificationSettings.soundVolume || 0.7;
            
            // Play the sound
            notificationSound.play().catch(error => {
                console.error('Error playing notification sound:', error);
            });
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    }
}

// Request notification permission
function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showToast('Notifications are not supported in this browser', 'fas fa-exclamation-circle');
        return;
    }
    
    if (Notification.permission === 'granted') {
        return;
    } else if (Notification.permission !== 'denied') {
        try {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    showToast('Notifications enabled!', 'fas fa-bell');
                } else if (permission === 'denied') {
                    showToast('Notification permission denied', 'fas fa-bell-slash');
                    // Update settings if permission is denied
                    notificationSettings.enabled = false;
                    if (enableNotificationsCheckbox) enableNotificationsCheckbox.checked = false;
                    // Persist notification settings
                    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
                }
            }).catch(error => {
                console.error('Error requesting notification permission:', error);
            });
        } catch (error) {
            // For older browsers that don't support promises
            Notification.requestPermission(function(permission) {
                if (permission === 'granted') {
                    showToast('Notifications enabled!', 'fas fa-bell');
                }
            });
        }
    }
}

// Save notification settings
function saveNotificationSettings() {
    notificationSettings.enabled = enableNotificationsCheckbox ? enableNotificationsCheckbox.checked : false;
    if (notificationTimeSelect) {
        notificationSettings.reminderTime = parseInt(notificationTimeSelect.value) || 0;
    } else {
        notificationSettings.reminderTime = notificationSettings.reminderTime || 0;
    }
    
    // Save sound settings if elements exist
    if (enableSoundCheckbox) {
        notificationSettings.soundEnabled = enableSoundCheckbox.checked;
    }
    if (soundVolumeSlider) {
        notificationSettings.soundVolume = soundVolumeSlider.value / 100;
    }
    
    // Save settings to localStorage
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
    
    // Update notification timers
    clearAllNotificationTimers();
    setupNotificationTimers();
    
    // Request permission if enabled
    if (notificationSettings.enabled) {
        requestNotificationPermission();
    }
    
    // Close modal
    notificationModal.classList.remove('show');
    
    showToast('Notification settings saved!', 'fas fa-check-circle');
}

// Set up notification timers for all tasks with due dates
function setupNotificationTimers() {
    // Clear existing timers
    Object.values(notificationTimers).forEach(timer => clearTimeout(timer));
    notificationTimers = {};
    
    if (!notificationSettings.enabled) return;
    
    const now = new Date();
    
    tasks.forEach(task => {
        if (task.dueDate && !task.completed) {
            const dueDate = new Date(task.dueDate);
            
            // Calculate notification time (due time - reminder time)
            const reminderOffset = notificationSettings.reminderTime * 60 * 1000; // convert minutes to ms
            const notificationTime = dueDate.getTime() - reminderOffset;
            
            // Only set timer if the notification time is in the future
            if (notificationTime > now.getTime()) {
                const timeUntilNotification = notificationTime - now.getTime();
                
                // Limit setTimeout to max safe value (about 24.8 days)
                const MAX_TIMEOUT = 2147483647;
                
                if (timeUntilNotification < MAX_TIMEOUT) {
                    notificationTimers[task.id] = setTimeout(() => {
                        sendNotification(task);
                    }, timeUntilNotification);
                } else {
                    // For tasks far in the future, we'll set up the timer later
                    console.log(`Task "${task.text}" is too far in the future for a timer. Will set up later.`);
                }
            }
        }
    });
}

// Send a browser notification
function sendNotification(task) {
    // Play notification sound
    if (notificationSettings.soundEnabled) {
        playNotificationSound();
    }
    
    if (!notificationSettings.enabled || Notification.permission !== 'granted') return;
    
    try {
        const title = 'TaskMaster Reminder';
        const options = {
            body: task.text,
            icon: 'https://cdn-icons-png.flaticon.com/512/2098/2098402.png', // Default icon
            badge: 'https://cdn-icons-png.flaticon.com/512/2098/2098402.png',
            silent: notificationSettings.soundEnabled // Set to true if we're playing our own sound
        };
        
        const notification = new Notification(title, options);
        
        notification.onclick = function() {
            window.focus();
            notification.close();
        };
        
        // Also show in-app toast
        showToast(`Task due: ${task.text}`, 'fas fa-bell');
    } catch (error) {
        console.error('Error sending notification:', error);
        showToast('Failed to send notification', 'fas fa-exclamation-circle');
    }
}

// Show toast notification (single robust implementation)
function showToast(message, iconClass, type) {
    // Remove any existing toasts
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <i class="${iconClass} toast-icon"></i>
        <span>${message}</span>
        <i class="fas fa-times toast-close"></i>
    `;
    document.body.appendChild(toast);

    // If a type is provided, add a modifier class for styling (e.g., warning)
    if (type) {
        toast.classList.add(`toast-${type}`);
    }

    // Show toast with animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Add close button functionality
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
    }

    // Auto hide after 5 seconds
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// Format date for display
function formatDueDate(dateString) {
    if (!dateString) return '';
    
    try {
        const dueDate = new Date(dateString);
        if (isNaN(dueDate.getTime())) {
            return 'Invalid date';
        }
        
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Check if it's today or tomorrow
        if (dueDate.toDateString() === now.toDateString()) {
            return `Today at ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (dueDate.toDateString() === tomorrow.toDateString()) {
            return `Tomorrow at ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return dueDate.toLocaleString([], { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Date error';
    }
}

// Check if a date is upcoming (within 24 hours)
function isUpcoming(dateString) {
    if (!dateString) return false;
    
    try {
        const dueDate = new Date(dateString);
        if (isNaN(dueDate.getTime())) return false;
        
        const now = new Date();
        const timeDiff = dueDate.getTime() - now.getTime();
        
        // Return true if due within 24 hours and not overdue
        return timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000;
    } catch (error) {
        console.error('Error checking if date is upcoming:', error);
        return false;
    }
}

// Check if a date is overdue
function isOverdue(dateString) {
    if (!dateString) return false;
    
    try {
        const dueDate = new Date(dateString);
        if (isNaN(dueDate.getTime())) return false;
        
        const now = new Date();
        
        return dueDate < now;
    } catch (error) {
        console.error('Error checking if date is overdue:', error);
        return false;
    }
}

// Add a new task
function addTask() {
    const taskText = taskInput.value.trim();
    const dueDate = dueDateInput.value;
    
    if (taskText === '') {
        shakeElement(taskInput);
        return;
    }
    
    const newTask = {
        id: Date.now().toString(),
        text: taskText,
        completed: false,
        createdAt: new Date().toISOString(),
        dueDate: dueDate || null
    };
    
    tasks.unshift(newTask); // Add to the beginning of the array
    saveTasks();
    renderTasks();
    updateTasksCounter();
    
    // Set up notification for the new task if it has a due date
    if (dueDate && notificationSettings.enabled) {
        setupNotificationTimers();
    }
    
    // Clear input and focus
    taskInput.value = '';
    dueDateInput.value = '';
    taskInput.focus();
    
    // Show animation for the new task
    setTimeout(() => {
        const firstTask = taskList.querySelector('.task-item');
        if (firstTask) {
            firstTask.classList.add('highlight');
            setTimeout(() => firstTask.classList.remove('highlight'), 1000);
        }
    }, 50);
}

// Render tasks based on current filter
function renderTasks() {
    // Clear the task list
    taskList.innerHTML = '';
    
    // Filter tasks based on current filter
    let filteredTasks = tasks;
    if (currentFilter === 'active') {
        filteredTasks = tasks.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(task => task.completed);
    } else if (currentFilter === 'upcoming') {
        filteredTasks = tasks.filter(task => !task.completed && task.dueDate && isUpcoming(task.dueDate));
    }
    
    // If no tasks, show a message
    if (filteredTasks.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = currentFilter === 'all' 
            ? 'Add your first task!' 
            : `No ${currentFilter} tasks found.`;
        taskList.appendChild(emptyMessage);
        return;
    }
    
    // Create task elements
    filteredTasks.forEach(task => {
        const taskItem = document.createElement('li');
        taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskItem.setAttribute('data-id', task.id);
        taskItem.draggable = true;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => toggleTaskStatus(task.id));
        
        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';
        
        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = task.text;
        
        // Double click to edit
        taskText.addEventListener('dblclick', () => {
            makeEditable(taskText, task.id);
        });
        
        taskContent.appendChild(taskText);
        
        // Add due date if exists
        if (task.dueDate) {
            const taskDueDate = document.createElement('span');
            taskDueDate.className = 'task-due-date';
            
            // Add appropriate class based on due status
            if (isOverdue(task.dueDate) && !task.completed) {
                taskDueDate.classList.add('overdue');
                taskDueDate.textContent = `Overdue: ${formatDueDate(task.dueDate)}`;
            } else if (isUpcoming(task.dueDate) && !task.completed) {
                taskDueDate.classList.add('upcoming');
                taskDueDate.textContent = `Due soon: ${formatDueDate(task.dueDate)}`;
            } else {
                taskDueDate.textContent = `Due: ${formatDueDate(task.dueDate)}`;
            }
            
            taskContent.appendChild(taskDueDate);
        }
        
        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';
        
        // Add notification button if task has due date
        if (task.dueDate && !task.completed) {
            const notificationBtn = document.createElement('button');
            notificationBtn.className = 'notification-btn';
            notificationBtn.innerHTML = '<i class="fas fa-bell"></i>';
            notificationBtn.title = 'Send reminder now';
            notificationBtn.addEventListener('click', () => {
                sendNotification(task);
            });
            
            taskActions.appendChild(notificationBtn);
        }
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
        editBtn.title = 'Edit task';
        editBtn.addEventListener('click', () => makeEditable(taskText, task.id));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete task';
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        
        taskActions.appendChild(editBtn);
        taskActions.appendChild(deleteBtn);
        
        taskItem.appendChild(checkbox);
        taskItem.appendChild(taskContent);
        taskItem.appendChild(taskActions);
        
        taskList.appendChild(taskItem);
    });
}

// Toggle task completed status
function toggleTaskStatus(taskId) {
    tasks = tasks.map(task => {
        if (task.id === taskId) {
            return { ...task, completed: !task.completed };
        }
        return task;
    });
    
    saveTasks();
    renderTasks();
    updateTasksCounter();
    
    // Update notification timers
    setupNotificationTimers();
}

// Make task text editable
function makeEditable(taskTextElement, taskId) {
    const currentText = taskTextElement.textContent;
    taskTextElement.classList.add('editable');
    taskTextElement.contentEditable = true;
    taskTextElement.focus();
    
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(taskTextElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Save on blur or Enter key
    const saveEdit = () => {
        const newText = taskTextElement.textContent.trim();
        if (newText === '') {
            // If empty, delete the task
            deleteTask(taskId);
        } else if (newText !== currentText) {
            // Update task text
            tasks = tasks.map(task => {
                if (task.id === taskId) {
                    return { ...task, text: newText };
                }
                return task;
            });
            saveTasks();
        }
        
        taskTextElement.contentEditable = false;
        taskTextElement.classList.remove('editable');
    };
    
    taskTextElement.addEventListener('blur', saveEdit, { once: true });
    taskTextElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            taskTextElement.blur();
        } else if (e.key === 'Escape') {
            taskTextElement.textContent = currentText;
            taskTextElement.blur();
        }
    });
}

// Delete a task
function deleteTask(taskId) {
    const taskElement = document.querySelector(`[data-id="${taskId}"]`);
    if (taskElement) {
        // Add fade out animation
        taskElement.style.opacity = '0';
        taskElement.style.transform = 'translateX(30px)';
        taskElement.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
            // Clear notification timer if exists
            if (notificationTimers[taskId]) {
                clearTimeout(notificationTimers[taskId]);
                delete notificationTimers[taskId];
            }
            
            tasks = tasks.filter(task => task.id !== taskId);
            saveTasks();
            renderTasks();
            updateTasksCounter();
        }, 300);
    }
}

// Clear all completed tasks
function clearCompleted() {
    if (tasks.some(task => task.completed)) {
        // Get IDs of completed tasks to clear their timers
        const completedTaskIds = tasks.filter(task => task.completed).map(task => task.id);
        
        // Clear notification timers for completed tasks
        completedTaskIds.forEach(id => {
            if (notificationTimers[id]) {
                clearTimeout(notificationTimers[id]);
                delete notificationTimers[id];
            }
        });
        
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks();
        updateTasksCounter();
    }
}

// Update tasks counter
function updateTasksCounter() {
    const activeTasks = tasks.filter(task => !task.completed).length;
    tasksCounter.textContent = `${activeTasks} task${activeTasks !== 1 ? 's' : ''} left`;
}

// Save tasks to localStorage
function saveTasks() {
    try {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    } catch (error) {
        console.error('Error saving tasks to localStorage:', error);
        showToast('Failed to save tasks', 'fas fa-exclamation-circle');
    }
}

// Enable drag and drop functionality
function enableDragAndDrop() {
    let draggedItem = null;
    
    taskList.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('task-item')) {
            draggedItem = e.target;
            setTimeout(() => {
                e.target.classList.add('dragging');
            }, 0);
        }
    });
    
    taskList.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('task-item')) {
            e.target.classList.remove('dragging');
        }
    });
    
    taskList.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedItem) return;
        
        const taskItems = Array.from(taskList.querySelectorAll('.task-item:not(.dragging)'));
        const afterElement = getDragAfterElement(taskItems, e.clientY);
        
        if (afterElement) {
            taskList.insertBefore(draggedItem, afterElement);
        } else {
            taskList.appendChild(draggedItem);
        }
    });
    
    taskList.addEventListener('drop', (e) => {
        e.preventDefault();
        // Update tasks array order
        updateTasksOrder();
    });
    
    function getDragAfterElement(elements, y) {
        return elements.reduce((closest, element) => {
            const box = element.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset, element };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    function updateTasksOrder() {
        const newOrder = Array.from(taskList.querySelectorAll('.task-item'))
            .map(item => item.getAttribute('data-id'));
        
        // Reorder tasks array based on DOM order
        const reorderedTasks = [];
        newOrder.forEach(id => {
            const task = tasks.find(task => task.id === id);
            if (task) reorderedTasks.push(task);
        });
        
        // Add any tasks that might not be in the current view
        tasks.forEach(task => {
            if (!newOrder.includes(task.id)) {
                reorderedTasks.push(task);
            }
        });
        
        tasks = reorderedTasks;
        saveTasks();
    }
}

// Shake animation for empty input
function shakeElement(element) {
    element.classList.add('shake');
    setTimeout(() => {
        element.classList.remove('shake');
    }, 500);
}

// Add shake animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    .shake {
        animation: shake 0.5s;
        border-color: var(--delete-color) !important;
    }
    
    .highlight {
        background-color: rgba(108, 92, 231, 0.1);
    }
    
    .empty-message {
        text-align: center;
        padding: 20px 0;
        color: var(--light-text);
        font-style: italic;
    }
`;
document.head.appendChild(style);

// Create a fallback sound using Web Audio API if the sound file fails to load
function createFallbackSound() {
    try {
        // Check if AudioContext is available
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const audioContext = new AudioContextClass();
            
            // Override the play method of notificationSound
            notificationSound.play = function() {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(830, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(700, audioContext.currentTime + 0.1);
                
                gainNode.gain.setValueAtTime(notificationSettings.soundVolume, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.5);
                
                return Promise.resolve();
            };
        }
    } catch (error) {
        console.error('Failed to create fallback sound:', error);
    }
}

// Check for overdue tasks on startup
function checkOverdueTasks() {
    const now = new Date();
    
    tasks.forEach(task => {
        if (task.dueDate && !task.completed) {
            const dueDate = new Date(task.dueDate);
            
            // If the task is overdue
            if (dueDate < now) {
                // Show a notification for overdue tasks
                showToast(`Overdue task: ${task.text}`, 'fas fa-exclamation-triangle', 'warning');
                
                // If notifications are enabled, show a browser notification
                if (notificationSettings.enabled && Notification.permission === 'granted') {
                    const notification = new Notification('Overdue Task', {
                        body: `Task "${task.text}" is overdue!`,
                        icon: 'favicon.ico'
                    });
                    
                    // Play sound if enabled
                    if (notificationSettings.soundEnabled) {
                        playNotificationSound();
                    }
                }
            }
        }
    });
}

// Clear all notification timers
function clearAllNotificationTimers() {
    Object.values(notificationTimers).forEach(timer => clearTimeout(timer));
    notificationTimers = {};
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 