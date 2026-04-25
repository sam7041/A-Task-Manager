const taskInput = document.getElementById('task-input');
const dueDateInput = document.getElementById('due-date-input');
const addButton = document.getElementById('add-button');
const taskList = document.getElementById('task-list');
const tasksCounter = document.getElementById('tasks-counter');
const clearCompletedBtn = document.getElementById('clear-completed');
const filters = document.querySelectorAll('.filter');
const searchInput = document.getElementById('search-input');
const quickActions = document.querySelectorAll('.quick-action');
const notificationSettingsBtn = document.getElementById('notification-settings');
const notificationModal = document.getElementById('notification-modal');
const closeModalBtn = document.querySelector('.close-modal');
const saveNotificationSettingsBtn = document.getElementById('save-notification-settings');
const enableNotificationsCheckbox = document.getElementById('enable-notifications');
const notificationTimeSelect = document.getElementById('notification-time');
const enableSoundCheckbox = document.getElementById('enable-sound');
const soundVolumeSlider = document.getElementById('sound-volume');
const soundPreviewBtn = document.getElementById('sound-preview');
const exportDataBtn = document.getElementById('export-data');
const importDataBtn = document.getElementById('import-data');
const importFileInput = document.getElementById('import-file');

const currentDateLabel = document.getElementById('current-date-label');
const dailyFocusLabel = document.getElementById('daily-focus-label');
const todayProgressValue = document.getElementById('today-progress-value');
const todayProgressCopy = document.getElementById('today-progress-copy');
const todayProgressBar = document.getElementById('today-progress-bar');
const todayCount = document.getElementById('today-count');
const completedTodayCount = document.getElementById('completed-today-count');
const streakCount = document.getElementById('streak-count');
const overdueCount = document.getElementById('overdue-count');
const overdueSubtext = document.getElementById('overdue-subtext');
const todaySummaryBadge = document.getElementById('today-summary-badge');
const todaySummaryCopy = document.getElementById('today-summary-copy');
const todayFocusList = document.getElementById('today-focus-list');
const insightCopy = document.getElementById('insight-copy');
const activeCount = document.getElementById('active-count');
const completionRate = document.getElementById('completion-rate');
const upcomingCount = document.getElementById('upcoming-count');

const notificationSound = new Audio('notification-sound.mp3');
notificationSound.preload = 'auto';

let tasks = [];
let currentFilter = 'all';
let searchTerm = '';
let notificationTimers = {};
let notificationSettings = {
    enabled: true,
    reminderTime: 0,
    soundEnabled: true,
    soundVolume: 0.7
};

function init() {
    loadTasks();
    loadNotificationSettings();

    currentDateLabel.textContent = new Date().toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    renderApp();
    bindEvents();
    setupNotificationTimers();
    checkOverdueTasks();
    requestNotificationPermissionIfEnabled();

    notificationSound.addEventListener('error', () => {
        createFallbackSound();
    });
}

function bindEvents() {
    addButton.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') addTask();
    });

    clearCompletedBtn.addEventListener('click', clearCompleted);

    if (exportDataBtn) exportDataBtn.addEventListener('click', exportAppData);
    if (importDataBtn) importDataBtn.addEventListener('click', () => importFileInput?.click());
    if (importFileInput) importFileInput.addEventListener('change', handleImportFile);

    filters.forEach((filter) => {
        filter.addEventListener('click', () => {
            filters.forEach((item) => item.classList.remove('active'));
            filter.classList.add('active');
            currentFilter = filter.dataset.filter;
            renderTasks();
        });
    });

    searchInput.addEventListener('input', (event) => {
        searchTerm = event.target.value.trim().toLowerCase();
        renderTasks();
    });

    quickActions.forEach((button) => {
        button.addEventListener('click', () => {
            quickActions.forEach((item) => item.classList.remove('active'));
            button.classList.add('active');
            dueDateInput.value = getQuickDateValue(button.dataset.quickDate);
            taskInput.focus();
        });
    });

    notificationSettingsBtn.addEventListener('click', () => {
        notificationModal.classList.add('show');
    });

    closeModalBtn.addEventListener('click', closeNotificationModal);
    saveNotificationSettingsBtn.addEventListener('click', saveNotificationSettings);

    if (soundPreviewBtn) {
        soundPreviewBtn.addEventListener('click', () => playNotificationSound());
    }

    if (soundVolumeSlider) {
        soundVolumeSlider.addEventListener('input', updateSoundVolume);
    }

    window.addEventListener('click', (event) => {
        if (event.target === notificationModal) closeNotificationModal();
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && notificationModal.classList.contains('show')) {
            closeNotificationModal();
        }
    });

    enableDragAndDrop();
}

function loadTasks() {
    try {
        const savedTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        tasks = Array.isArray(savedTasks) ? savedTasks.map(normalizeTask) : [];
    } catch (error) {
        console.error('Error loading tasks:', error);
        tasks = [];
    }
}

function loadNotificationSettings() {
    try {
        const savedSettings = JSON.parse(localStorage.getItem('notificationSettings') || 'null');
        if (savedSettings) {
            notificationSettings = {
                ...notificationSettings,
                ...savedSettings
            };
        }
    } catch (error) {
        console.error('Error loading notification settings:', error);
    }

    enableNotificationsCheckbox.checked = notificationSettings.enabled;
    notificationTimeSelect.value = String(notificationSettings.reminderTime || 0);
    enableSoundCheckbox.checked = notificationSettings.soundEnabled !== false;
    soundVolumeSlider.value = (notificationSettings.soundVolume || 0.7) * 100;
    updateSoundVolume();
}

function normalizeTask(task) {
    return {
        id: task.id || Date.now().toString(),
        text: task.text || '',
        completed: Boolean(task.completed),
        createdAt: task.createdAt || new Date().toISOString(),
        dueDate: task.dueDate || null,
        completedAt: task.completedAt || null
    };
}

function renderApp() {
    renderDashboard();
    renderTasks();
    updateTasksCounter();
}

function renderDashboard() {
    const todayItems = tasks.filter((task) => isToday(task.dueDate) && !task.completed);
    const completedTodayItems = tasks.filter((task) => task.completedAt && isToday(task.completedAt));
    const overdueItems = tasks.filter((task) => task.dueDate && isOverdue(task.dueDate) && !task.completed);
    const activeItems = tasks.filter((task) => !task.completed);
    const upcomingItems = tasks.filter((task) => !task.completed && task.dueDate && isUpcoming(task.dueDate));
    const doneCount = tasks.filter((task) => task.completed).length;
    const completionPercentage = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
    const todayCompletionPercentage = todayItems.length + completedTodayItems.length
        ? Math.round((completedTodayItems.length / (todayItems.length + completedTodayItems.length)) * 100)
        : 0;

    todayCount.textContent = String(todayItems.length);
    completedTodayCount.textContent = String(completedTodayItems.length);
    overdueCount.textContent = String(overdueItems.length);
    activeCount.textContent = String(activeItems.length);
    completionRate.textContent = `${completionPercentage}%`;
    upcomingCount.textContent = String(upcomingItems.length);
    dailyFocusLabel.textContent = `${todayItems.length} focus item${todayItems.length === 1 ? '' : 's'}`;

    todayProgressValue.textContent = `${todayCompletionPercentage}%`;
    todayProgressBar.style.width = `${todayCompletionPercentage}%`;
    todayProgressCopy.textContent = getTodayProgressCopy(todayItems.length, completedTodayItems.length, overdueItems.length);
    overdueSubtext.textContent = overdueItems.length ? 'Needs attention now' : 'Inbox looks clean';

    const streak = getCompletionStreak();
    streakCount.textContent = `${streak} day streak`;
    insightCopy.textContent = getInsightCopy({
        activeCount: activeItems.length,
        upcomingCount: upcomingItems.length,
        overdueCount: overdueItems.length,
        completedTodayCount: completedTodayItems.length
    });

    renderTodayFocus(todayItems, overdueItems);
}

function renderTodayFocus(todayItems, overdueItems) {
    const focusTasks = [...overdueItems, ...todayItems]
        .sort(sortTasksByUrgency)
        .slice(0, 3);

    todaySummaryBadge.textContent = `${focusTasks.length} queued`;
    todaySummaryCopy.textContent = focusTasks.length
        ? 'Start with the top items below and use Today view to stay locked in.'
        : 'No due items today yet. Use the quick shortcuts to block time fast.';

    todayFocusList.innerHTML = '';

    if (!focusTasks.length) {
        const item = document.createElement('li');
        item.className = 'focus-pill';
        item.innerHTML = '<strong>Fresh slate</strong><time>Add a due date to build your day plan.</time>';
        todayFocusList.appendChild(item);
        return;
    }

    focusTasks.forEach((task) => {
        const item = document.createElement('li');
        item.className = 'focus-pill';
        item.innerHTML = `
            <strong>${escapeHtml(task.text)}</strong>
            <time>${task.dueDate ? formatDueDate(task.dueDate) : 'No due date'}</time>
        `;
        todayFocusList.appendChild(item);
    });
}

function renderTasks() {
    taskList.innerHTML = '';
    const filteredTasks = getFilteredTasks();

    if (!filteredTasks.length) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'empty-message';
        emptyMessage.innerHTML = `
            <strong>${getEmptyStateTitle()}</strong>
            <p>${getEmptyStateCopy()}</p>
        `;
        taskList.appendChild(emptyMessage);
        return;
    }

    filteredTasks.forEach((task) => {
        const taskItem = document.createElement('li');
        taskItem.className = `task-item ${task.completed ? 'completed' : ''} ${isToday(task.dueDate) ? 'today-card' : ''} ${isOverdue(task.dueDate) && !task.completed ? 'overdue-card' : ''}`;
        taskItem.dataset.id = task.id;
        taskItem.draggable = currentFilter === 'all' && !searchTerm;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.setAttribute('aria-label', `Mark ${task.text} complete`);
        checkbox.addEventListener('change', () => toggleTaskStatus(task.id));

        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';

        const taskMain = document.createElement('div');
        taskMain.className = 'task-main';

        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = task.text;
        taskText.addEventListener('dblclick', () => makeEditable(taskText, task.id));

        taskMain.appendChild(taskText);
        taskContent.appendChild(taskMain);

        const taskMeta = document.createElement('div');
        taskMeta.className = 'task-meta';
        taskMeta.appendChild(createBadge('Created', formatCreatedDate(task.createdAt)));

        if (task.dueDate) {
            taskMeta.appendChild(createDueBadge(task));
        }

        if (task.completed && task.completedAt) {
            taskMeta.appendChild(createBadge('Done', formatCreatedDate(task.completedAt)));
        }

        taskContent.appendChild(taskMeta);

        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';

        if (task.dueDate && !task.completed) {
            const notificationBtn = document.createElement('button');
            notificationBtn.className = 'notification-btn';
            notificationBtn.innerHTML = '<i class="fas fa-bell"></i>';
            notificationBtn.title = 'Send reminder now';
            notificationBtn.addEventListener('click', () => sendNotification(task));
            taskActions.appendChild(notificationBtn);
        }

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.innerHTML = '<i class="fas fa-pen"></i>';
        editBtn.title = 'Edit task';
        editBtn.addEventListener('click', () => makeEditable(taskText, task.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete task';
        deleteBtn.addEventListener('click', () => deleteTask(task.id));

        taskActions.append(editBtn, deleteBtn);
        taskItem.append(checkbox, taskContent, taskActions);
        taskList.appendChild(taskItem);
    });
}

function getFilteredTasks() {
    return tasks
        .filter((task) => filterTask(task, currentFilter))
        .filter((task) => !searchTerm || task.text.toLowerCase().includes(searchTerm))
        .sort(sortTasksByCurrentView);
}

function filterTask(task, filter) {
    switch (filter) {
        case 'active':
            return !task.completed;
        case 'completed':
            return task.completed;
        case 'upcoming':
            return !task.completed && task.dueDate && isUpcoming(task.dueDate);
        case 'today':
            return !task.completed && task.dueDate && isToday(task.dueDate);
        default:
            return true;
    }
}

function sortTasksByCurrentView(a, b) {
    if (currentFilter === 'all' && !searchTerm) {
        return 0;
    }

    return sortTasksByUrgency(a, b);
}

function sortTasksByUrgency(a, b) {
    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;

    if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
    }

    if (aDue !== bDue) {
        return aDue - bDue;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function addTask() {
    const text = taskInput.value.trim();
    const dueDate = dueDateInput.value || null;

    if (!text) {
        shakeElement(taskInput);
        return;
    }

    const newTask = normalizeTask({
        id: createId(),
        text,
        completed: false,
        createdAt: new Date().toISOString(),
        dueDate,
        completedAt: null
    });

    tasks.unshift(newTask);
    saveTasks();
    renderApp();
    setupNotificationTimers();

    taskInput.value = '';
    dueDateInput.value = '';
    quickActions.forEach((item) => item.classList.remove('active'));
    taskInput.focus();

    showToast(dueDate ? 'Task added to your planner.' : 'Task added to your list.', 'fas fa-check-circle');
}

function toggleTaskStatus(taskId) {
    tasks = tasks.map((task) => {
        if (task.id !== taskId) return task;

        const nextCompleted = !task.completed;
        return {
            ...task,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : null
        };
    });

    saveTasks();
    renderApp();
    setupNotificationTimers();
}

function makeEditable(taskTextElement, taskId) {
    const originalText = taskTextElement.textContent;
    taskTextElement.classList.add('editable');
    taskTextElement.contentEditable = 'true';
    taskTextElement.focus();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(taskTextElement);
    selection.removeAllRanges();
    selection.addRange(range);

    const saveEdit = () => {
        const newText = taskTextElement.textContent.trim();

        if (!newText) {
            deleteTask(taskId);
        } else if (newText !== originalText) {
            tasks = tasks.map((task) => task.id === taskId ? { ...task, text: newText } : task);
            saveTasks();
            renderApp();
        }

        taskTextElement.contentEditable = 'false';
        taskTextElement.classList.remove('editable');
    };

    taskTextElement.addEventListener('blur', saveEdit, { once: true });
    taskTextElement.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            taskTextElement.blur();
        } else if (event.key === 'Escape') {
            taskTextElement.textContent = originalText;
            taskTextElement.blur();
        }
    });
}

function deleteTask(taskId) {
    const taskElement = document.querySelector(`[data-id="${taskId}"]`);
    if (taskElement) {
        taskElement.style.opacity = '0';
        taskElement.style.transform = 'translateY(8px)';
        taskElement.style.transition = 'all 0.25s ease';
    }

    setTimeout(() => {
        clearNotificationTimer(taskId);
        tasks = tasks.filter((task) => task.id !== taskId);
        saveTasks();
        renderApp();
    }, 240);
}

function clearCompleted() {
    const completedTaskIds = tasks.filter((task) => task.completed).map((task) => task.id);
    if (!completedTaskIds.length) return;

    completedTaskIds.forEach(clearNotificationTimer);
    tasks = tasks.filter((task) => !task.completed);
    saveTasks();
    renderApp();
    showToast('Completed tasks cleared.', 'fas fa-broom');
}

function createId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function exportAppData() {
    const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tasks,
        notificationSettings
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `taskmaster-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    showToast('Backup exported.', 'fas fa-download');
}

function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(String(reader.result || ''));
            importAppData(data);
        } catch (error) {
            console.error('Import parse error:', error);
            showToast('Invalid backup file.', 'fas fa-exclamation-circle', 'warning');
        } finally {
            event.target.value = '';
        }
    };

    reader.onerror = () => {
        showToast('Could not read the file.', 'fas fa-exclamation-circle', 'warning');
        event.target.value = '';
    };

    reader.readAsText(file);
}

function importAppData(data) {
    const nextTasks = Array.isArray(data?.tasks) ? data.tasks.map(normalizeTask) : null;
    const nextSettings = data?.notificationSettings && typeof data.notificationSettings === 'object'
        ? { ...notificationSettings, ...data.notificationSettings }
        : null;

    if (!nextTasks && !nextSettings) {
        showToast('Backup file has no data to import.', 'fas fa-exclamation-circle', 'warning');
        return;
    }

    const proceed = window.confirm('Import will replace your current tasks/settings. Continue?');
    if (!proceed) return;

    if (nextTasks) {
        tasks = nextTasks;
        saveTasks();
    }

    if (nextSettings) {
        notificationSettings = nextSettings;
        localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
        loadNotificationSettings();
    }

    renderApp();
    setupNotificationTimers();
    showToast('Backup imported.', 'fas fa-upload');
}

function updateTasksCounter() {
    const activeTasks = tasks.filter((task) => !task.completed).length;
    tasksCounter.textContent = `${activeTasks} task${activeTasks === 1 ? '' : 's'} left`;
}

function saveTasks() {
    try {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    } catch (error) {
        console.error('Error saving tasks:', error);
        showToast('Failed to save tasks.', 'fas fa-exclamation-circle', 'warning');
    }
}

function enableDragAndDrop() {
    let draggedItem = null;

    taskList.addEventListener('dragstart', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !target.classList.contains('task-item') || !target.draggable) {
            return;
        }

        draggedItem = target;
        setTimeout(() => target.classList.add('dragging'), 0);
    });

    taskList.addEventListener('dragend', (event) => {
        const target = event.target;
        if (target instanceof HTMLElement) {
            target.classList.remove('dragging');
        }
    });

    taskList.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (!draggedItem || currentFilter !== 'all' || searchTerm) return;

        const taskItems = [...taskList.querySelectorAll('.task-item:not(.dragging)')];
        const afterElement = getDragAfterElement(taskItems, event.clientY);

        if (afterElement) {
            taskList.insertBefore(draggedItem, afterElement);
        } else {
            taskList.appendChild(draggedItem);
        }
    });

    taskList.addEventListener('drop', (event) => {
        event.preventDefault();
        if (currentFilter === 'all' && !searchTerm) {
            updateTasksOrder();
        }
    });
}

function getDragAfterElement(elements, y) {
    return elements.reduce((closest, element) => {
        const box = element.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateTasksOrder() {
    const visibleOrder = [...taskList.querySelectorAll('.task-item')].map((item) => item.dataset.id);
    const reorderedTasks = [];

    visibleOrder.forEach((id) => {
        const match = tasks.find((task) => task.id === id);
        if (match) reorderedTasks.push(match);
    });

    tasks.forEach((task) => {
        if (!visibleOrder.includes(task.id)) reorderedTasks.push(task);
    });

    tasks = reorderedTasks;
    saveTasks();
}

function setupNotificationTimers() {
    clearAllNotificationTimers();

    if (!notificationSettings.enabled) return;

    const now = Date.now();
    const maxTimeout = 2147483647;

    tasks.forEach((task) => {
        if (!task.dueDate || task.completed) return;

        const notificationTime = new Date(task.dueDate).getTime() - (notificationSettings.reminderTime * 60 * 1000);
        const timeout = notificationTime - now;

        if (timeout > 0 && timeout <= maxTimeout) {
            notificationTimers[task.id] = setTimeout(() => {
                sendNotification(task);
            }, timeout);
        }
    });
}

function sendNotification(task) {
    if (notificationSettings.soundEnabled) {
        playNotificationSound();
    }

    if (!notificationSettings.enabled || !('Notification' in window) || Notification.permission !== 'granted') {
        showToast(`Reminder: ${task.text}`, 'fas fa-bell');
        return;
    }

    const notification = new Notification('TaskMaster Reminder', {
        body: task.text,
        icon: 'https://cdn-icons-png.flaticon.com/512/2098/2098402.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/2098/2098402.png',
        silent: notificationSettings.soundEnabled
    });

    notification.onclick = () => {
        window.focus();
        notification.close();
    };

    showToast(`Reminder sent for "${task.text}"`, 'fas fa-bell');
}

function saveNotificationSettings() {
    notificationSettings.enabled = enableNotificationsCheckbox.checked;
    notificationSettings.reminderTime = parseInt(notificationTimeSelect.value, 10) || 0;
    notificationSettings.soundEnabled = enableSoundCheckbox.checked;
    notificationSettings.soundVolume = soundVolumeSlider.value / 100;

    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));

    requestNotificationPermissionIfEnabled();
    setupNotificationTimers();
    closeNotificationModal();
    showToast('Notification settings saved.', 'fas fa-check-circle');
}

function requestNotificationPermissionIfEnabled() {
    if (!notificationSettings.enabled) return;
    requestNotificationPermission();
}

function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showToast('Notifications are not supported in this browser.', 'fas fa-exclamation-circle', 'warning');
        return;
    }

    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
        return;
    }

    Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
            showToast('Notifications enabled.', 'fas fa-bell');
        } else {
            notificationSettings.enabled = false;
            enableNotificationsCheckbox.checked = false;
            localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
            showToast('Notification permission denied.', 'fas fa-bell-slash', 'warning');
        }
    }).catch((error) => {
        console.error('Notification permission error:', error);
    });
}

function updateSoundVolume() {
    notificationSettings.soundVolume = soundVolumeSlider.value / 100;
    notificationSound.volume = notificationSettings.soundVolume;
}

function playNotificationSound() {
    if (!notificationSettings.soundEnabled) return;

    notificationSound.currentTime = 0;
    notificationSound.volume = notificationSettings.soundVolume || 0.7;
    notificationSound.play().catch((error) => {
        console.error('Error playing sound:', error);
    });
}

function createFallbackSound() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        const audioContext = new AudioContextClass();
        notificationSound.play = () => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(830, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(680, audioContext.currentTime + 0.12);

            gainNode.gain.setValueAtTime(notificationSettings.soundVolume || 0.7, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.4);
            return Promise.resolve();
        };
    } catch (error) {
        console.error('Failed to create fallback sound:', error);
    }
}

function checkOverdueTasks() {
    tasks.forEach((task) => {
        if (task.dueDate && !task.completed && isOverdue(task.dueDate)) {
            showToast(`Overdue: ${task.text}`, 'fas fa-triangle-exclamation', 'warning');
        }
    });
}

function clearNotificationTimer(taskId) {
    if (notificationTimers[taskId]) {
        clearTimeout(notificationTimers[taskId]);
        delete notificationTimers[taskId];
    }
}

function clearAllNotificationTimers() {
    Object.values(notificationTimers).forEach((timer) => clearTimeout(timer));
    notificationTimers = {};
}

function closeNotificationModal() {
    notificationModal.classList.remove('show');
}

function getQuickDateValue(type) {
    const date = new Date();

    switch (type) {
        case 'today-evening':
            date.setHours(18, 0, 0, 0);
            if (date.getTime() <= Date.now()) {
                date.setDate(date.getDate() + 1);
            }
            break;
        case 'tomorrow-morning':
            date.setDate(date.getDate() + 1);
            date.setHours(9, 0, 0, 0);
            break;
        case 'next-hour':
            date.setHours(date.getHours() + 1, 0, 0, 0);
            break;
        default:
            return '';
    }

    return formatDateTimeLocal(date);
}

function formatDateTimeLocal(date) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDueDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Invalid date';

    if (isToday(dateString)) {
        return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    if (isTomorrow(dateString)) {
        return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    return date.toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatCreatedDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric'
    });
}

function createDueBadge(task) {
    const badge = document.createElement('span');
    badge.className = 'task-badge';

    if (isOverdue(task.dueDate) && !task.completed) {
        badge.classList.add('overdue');
        badge.innerHTML = `<i class="fas fa-fire"></i><span>Overdue - ${formatDueDate(task.dueDate)}</span>`;
        return badge;
    }

    if (isToday(task.dueDate) && !task.completed) {
        badge.classList.add('today');
        badge.innerHTML = `<i class="fas fa-calendar-day"></i><span>Today - ${formatDueDate(task.dueDate)}</span>`;
        return badge;
    }

    if (isUpcoming(task.dueDate) && !task.completed) {
        badge.classList.add('upcoming');
        badge.innerHTML = `<i class="fas fa-bolt"></i><span>Due soon - ${formatDueDate(task.dueDate)}</span>`;
        return badge;
    }

    badge.innerHTML = `<i class="fas fa-clock"></i><span>${formatDueDate(task.dueDate)}</span>`;
    return badge;
}

function createBadge(label, value) {
    const badge = document.createElement('span');
    badge.className = 'task-badge';
    badge.innerHTML = `<i class="fas fa-circle"></i><span>${label} - ${value}</span>`;
    return badge;
}

function isToday(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    return date.toDateString() === now.toDateString();
}

function isTomorrow(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
}

function isUpcoming(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString).getTime();
    const now = Date.now();
    const diff = date - now;
    return diff > 0 && diff <= 24 * 60 * 60 * 1000;
}

function isOverdue(dateString) {
    if (!dateString) return false;
    return new Date(dateString).getTime() < Date.now();
}

function getTodayProgressCopy(todayOpenCount, completedToday, overdueTasks) {
    if (!todayOpenCount && !completedToday) {
        return 'Nothing scheduled yet. Start with one meaningful task.';
    }

    if (overdueTasks) {
        return `You have ${overdueTasks} overdue task${overdueTasks === 1 ? '' : 's'} to rescue first.`;
    }

    if (todayOpenCount === 0) {
        return 'Today is wrapped. Everything due today is complete.';
    }

    return `${completedToday} completed today, ${todayOpenCount} still in play.`;
}

function getInsightCopy(stats) {
    if (stats.overdueCount) {
        return 'Start with the overdue lane, then work down your today queue.';
    }

    if (stats.upcomingCount) {
        return 'Your next 24 hours are active. Today view will keep the list sharp.';
    }

    if (stats.completedTodayCount) {
        return 'Momentum is real today. Keep stacking quick wins.';
    }

    if (!stats.activeCount) {
        return 'Everything is clear. Add a few tasks and give the day some structure.';
    }

    return 'You have room to plan ahead. Add due dates to make this dashboard smarter.';
}

function getCompletionStreak() {
    const completedDays = new Set(
        tasks
            .filter((task) => task.completedAt)
            .map((task) => new Date(task.completedAt).toDateString())
    );

    let streak = 0;
    const cursor = new Date();

    while (completedDays.has(cursor.toDateString())) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
}

function getEmptyStateTitle() {
    if (searchTerm) return 'No matching tasks';
    if (currentFilter === 'today') return 'Your today lane is clear';
    if (currentFilter === 'completed') return 'No completed tasks yet';
    if (currentFilter === 'upcoming') return 'Nothing due soon';
    if (currentFilter === 'active') return 'No active tasks left';
    return 'Ready for your first move?';
}

function getEmptyStateCopy() {
    if (searchTerm) return 'Try a different search or clear the search box to see everything.';
    if (currentFilter === 'today') return 'Use the quick date shortcuts to pin work into today.';
    if (currentFilter === 'completed') return 'Finished tasks will land here once you start checking them off.';
    if (currentFilter === 'upcoming') return 'Tasks due in the next 24 hours will show up here.';
    if (currentFilter === 'active') return 'Looks like everything is completed. Nice work.';
    return 'Add a task, give it a due date, and start shaping your day.';
}

function shakeElement(element) {
    element.classList.add('shake');
    setTimeout(() => element.classList.remove('shake'), 400);
}

function showToast(message, iconClass, type) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type) toast.classList.add(`toast-${type}`);

    toast.innerHTML = `
        <i class="${iconClass} toast-icon"></i>
        <span>${escapeHtml(message)}</span>
        <i class="fas fa-times toast-close"></i>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 250);
    });

    setTimeout(() => {
        if (!document.body.contains(toast)) return;
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 250);
    }, 3600);
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
}

const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-4px); }
        50% { transform: translateX(4px); }
        75% { transform: translateX(-4px); }
    }

    .shake {
        animation: shake 0.35s ease;
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', init);
