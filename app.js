document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Timeline settings
    const daysBefore = 7;
    const totalDays = 737; // Total timeline span (2 years + 7 days)
    
    const timelineStart = new Date(today);
    timelineStart.setDate(today.getDate() - daysBefore);

    let tasks = [];
    
    // Auth Logic
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');
    const authForm = document.getElementById('auth-form');
    const authError = document.getElementById('auth-error');
    const btnSwitchAuth = document.getElementById('btn-switch-auth');
    const btnLogin = document.getElementById('btn-login');
    const userEmailDisplay = document.getElementById('user-email-display');
    const btnLogout = document.getElementById('btn-logout');
    
    let isRegisterMode = false;
    
    btnSwitchAuth.addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        btnSwitchAuth.textContent = isRegisterMode ? 'Already have an account? Sign In' : 'Create new account';
        btnLogin.textContent = isRegisterMode ? 'Sign Up' : 'Sign In';
        authError.style.display = 'none';
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const endpoint = isRegisterMode ? '/api/register' : '/api/login';
        
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (!res.ok) {
                authError.textContent = data.error;
                authError.style.display = 'block';
                return;
            }
            
            checkAuth(); // Reload data and switch view
        } catch (err) {
            authError.textContent = 'Network error. Make sure server is running.';
            authError.style.display = 'block';
        }
    });

    btnLogout.addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        authView.style.display = 'flex';
        appView.style.display = 'none';
    });

    let currentProjectId = 1;
    let allTags = [];

    async function checkAuth() {
        try {
            const res = await fetch('/api/me');
            if (res.ok) {
                const data = await res.json();
                userEmailDisplay.textContent = data.email;
                authView.style.display = 'none';
                appView.style.display = 'flex';
                await fetchProjects();
                await fetchTags();
            } else {
                authView.style.display = 'flex';
                appView.style.display = 'none';
            }
        } catch (err) {
            authView.style.display = 'flex';
            appView.style.display = 'none';
        }
    }

    let projects = [];

    async function fetchProjects() {
        try {
            const res = await fetch('/api/projects');
            if (res.ok) {
                projects = await res.json();
                fetchTasks();
            }
        } catch (err) {
            console.error('Failed to fetch projects', err);
        }
    }

    async function fetchTags() {
        try {
            const res = await fetch('/api/tags');
            if (res.ok) {
                allTags = await res.json();
                const taskTagsSelect = document.getElementById('task-tags');
                const filterTagSelect = document.getElementById('filter-tag');
                
                taskTagsSelect.innerHTML = '';
                filterTagSelect.innerHTML = '<option value="all">All Tags</option>';
                
                allTags.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t.name;
                    opt.textContent = t.name;
                    taskTagsSelect.appendChild(opt);
                    
                    const optFilter = document.createElement('option');
                    optFilter.value = t.name;
                    optFilter.textContent = t.name;
                    filterTagSelect.appendChild(optFilter);
                });
            }
        } catch (err) {
            console.error('Failed to fetch tags', err);
        }
    }

    async function fetchTasks() {
        try {
            const res = await fetch('/api/tasks');
            if (res.ok) {
                tasks = await res.json();
                renderApp();
            }
        } catch (err) {
            console.error('Failed to fetch tasks', err);
        }
    }

    const ganttContainer = document.getElementById('gantt-container');
    
    // Set total days CSS variable for the background track width
    document.documentElement.style.setProperty('--total-days', totalDays);

    function parseLocalDate(dateStr) {
        if (!dateStr) return new Date();
        const [year, month, day] = dateStr.split('-');
        return new Date(year, month - 1, day);
    }

    function generateGantt() {
        ganttContainer.innerHTML = '';
        // Create Header
        const headerRow = document.createElement('div');
        headerRow.className = 'gantt-header-row';
        
        const cornerCell = document.createElement('div');
        cornerCell.className = 'gantt-corner';
        cornerCell.textContent = 'PROJECT';
        headerRow.appendChild(cornerCell);

        const headerRight = document.createElement('div');
        headerRight.className = 'gantt-header-right';

        const monthsContainer = document.createElement('div');
        monthsContainer.className = 'gantt-months';

        const datesContainer = document.createElement('div');
        datesContainer.className = 'gantt-dates';
        
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        let currentMonth = -1;
        let currentYear = -1;
        let daysInCurrentMonth = 0;
        const monthGroups = [];

        for (let i = 0; i < totalDays; i++) {
            const date = new Date(timelineStart);
            date.setDate(timelineStart.getDate() + i);
            
            const m = date.getMonth();
            const y = date.getFullYear();

            if (currentMonth !== m) {
                if (daysInCurrentMonth > 0) {
                    monthGroups.push({ month: currentMonth, year: currentYear, days: daysInCurrentMonth });
                }
                currentMonth = m;
                currentYear = y;
                daysInCurrentMonth = 1;
            } else {
                daysInCurrentMonth++;
            }
            
            const cell = document.createElement('div');
            cell.className = 'date-cell';
            
            // Check weekend
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                cell.classList.add('weekend');
            }

            // Check today
            if (date.toDateString() === today.toDateString()) {
                cell.classList.add('today');
            }

            const dayName = document.createElement('div');
            dayName.className = 'day-name';
            dayName.textContent = dayNames[dayOfWeek];

            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = date.getDate();

            cell.appendChild(dayName);
            cell.appendChild(dayNumber);
            datesContainer.appendChild(cell);
        }
        
        // Push the last month group
        if (daysInCurrentMonth > 0) {
            monthGroups.push({ month: currentMonth, year: currentYear, days: daysInCurrentMonth });
        }

        monthGroups.forEach((mg, index) => {
            const mCell = document.createElement('div');
            mCell.className = 'month-cell';
            // Set width according to how many days this month spans
            mCell.style.width = `calc(${mg.days} * var(--day-width))`;
            
            const mLabel = document.createElement('span');
            mLabel.className = 'month-label';
            const mm = String(mg.month + 1).padStart(2, '0');
            
            if (mg.month === 0 || index === 0) {
                const yy = String(mg.year).slice(-2);
                mLabel.textContent = `${mm}/${yy}`;
            } else {
                mLabel.textContent = `${mm}`;
            }
            
            mCell.appendChild(mLabel);
            monthsContainer.appendChild(mCell);
        });
        
        headerRight.appendChild(monthsContainer);
        headerRight.appendChild(datesContainer);
        headerRow.appendChild(headerRight);
        ganttContainer.appendChild(headerRow);

        // Create Body
        const bodyContainer = document.createElement('div');
        bodyContainer.className = 'gantt-body';

        projects.forEach((project) => {
            const row = document.createElement('div');
            row.className = 'gantt-row';

            const sidebarCell = document.createElement('div');
            sidebarCell.className = 'gantt-sidebar-cell';
            sidebarCell.title = project.name; // Tooltip for truncated text

            const titleDiv = document.createElement('div');
            titleDiv.className = 'task-title';
            
            const nameText = document.createTextNode(project.name);
            titleDiv.appendChild(nameText);
            
            sidebarCell.appendChild(titleDiv);
            
            sidebarCell.style.cursor = 'pointer';
            sidebarCell.addEventListener('click', () => {
                openEditProjectModal(project);
            });

            row.appendChild(sidebarCell);

            const track = document.createElement('div');
            track.className = 'gantt-timeline-track';
            
            track.addEventListener('click', (e) => {
                // Ensure they clicked on the track itself, not a task bar
                if (e.target !== track) return;
                
                // Calculate which date cell was clicked using exact fractional width
                const dayEl = document.querySelector('.date-cell');
                const dayWidth = dayEl ? dayEl.getBoundingClientRect().width : 90;
                const daysClicked = Math.floor(e.offsetX / dayWidth);
                
                const clickedDate = new Date(timelineStart);
                clickedDate.setDate(timelineStart.getDate() + daysClicked);
                
                openAddTaskModal(project.id, clickedDate);
            });

            // Filter tasks for this project
            const projectTasks = tasks.filter(t => t.project_id === project.id);
            
            projectTasks.forEach((task) => {
                // Calculate task position
                const taskStart = parseLocalDate(task.start);
                const taskEnd = parseLocalDate(task.end);
                
                // Difference in days from timeline start
                const diffStartTime = taskStart.getTime() - timelineStart.getTime();
                const startDays = diffStartTime / (1000 * 3600 * 24);
                
                // Difference in days between start and end
                const diffDurationTime = taskEnd.getTime() - taskStart.getTime();
                const durationDays = (diffDurationTime / (1000 * 3600 * 24)) + 1; // +1 to include the end date fully

                // Ensure task is within timeline bounds (partially at least)
                if (startDays + durationDays > 0 && startDays < totalDays) {
                    const bar = document.createElement('div');
                    bar.className = 'task-bar';
                    bar.textContent = task.name;
                    bar.style.backgroundColor = task.color;
                    bar.style.cursor = 'pointer';
                    bar.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openEditTaskModal(task);
                    });
                    
                    // Set inline CSS for dynamic positioning based on CSS variables
                    bar.style.left = `calc(${startDays} * var(--day-width))`;
                    bar.style.width = `calc(${durationDays} * var(--day-width))`;

                    track.appendChild(bar);
                }
            });

            row.appendChild(track);
            bodyContainer.appendChild(row);
        });

        ganttContainer.appendChild(bodyContainer);
    }

    function renderApp() {
        generateGantt();
        generateListView();
        renderCalendar();
        
        // Scroll to today's date automatically
        const wrapper = document.querySelector('.gantt-wrapper');
        if (wrapper) {
            const style = getComputedStyle(document.body);
            const dayWidth = parseInt(style.getPropertyValue('--day-width')) || 60;
            const offsetDays = Math.max(0, daysBefore - 2); // Show a couple days before today
            wrapper.scrollLeft = offsetDays * dayWidth;
        }
    }

    checkAuth();

    // Modal Elements
    const modalOverlay = document.getElementById('task-modal');
    const taskForm = document.getElementById('task-form');
    const closeModal = document.getElementById('close-modal');
    const colorOptions = document.querySelectorAll('.color-swatch');
    let selectedColor = 'var(--task-blue)';

    // Color picker logic
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedColor = option.dataset.color;
        });
    });

    // Close modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            modalOverlay.style.display = 'none';
            taskForm.reset();
        });
    }

    const wrapper = document.querySelector('.gantt-wrapper');

    // Drag to pan logic
    let isDragging = false;
    let startX;
    let scrollLeft;
    let draggedDistance = 0;

    wrapper.addEventListener('mousedown', (e) => {
        if (e.target.closest('.modal-content') || e.target.closest('.gantt-sidebar-cell')) return;
        isDragging = true;
        draggedDistance = 0;
        startX = e.pageX - wrapper.offsetLeft;
        scrollLeft = wrapper.scrollLeft;
        wrapper.style.cursor = 'grabbing';
    });

    wrapper.addEventListener('mouseleave', () => {
        isDragging = false;
        wrapper.style.cursor = '';
    });

    wrapper.addEventListener('mouseup', () => {
        isDragging = false;
        wrapper.style.cursor = '';
    });

    wrapper.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - wrapper.offsetLeft;
        const walk = (x - startX);
        draggedDistance += Math.abs(e.movementX);
        wrapper.scrollLeft = scrollLeft - walk;
    });

    // (Removed global click-to-add listener. It is now handled on the track level in generateGantt)

    // Task Modal Logic
    function openEditTaskModal(task) {
        document.getElementById('modal-task-title').textContent = 'Edit Task';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-name').value = task.name;
        document.getElementById('task-start').value = task.start;
        document.getElementById('task-end').value = task.end;
        
        // Select color
        selectedColor = task.color;
        colorOptions.forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.color === task.color) {
                opt.classList.add('selected');
            }
        });
        
        // Select tags
        const taskTagsSelect = document.getElementById('task-tags');
        Array.from(taskTagsSelect.options).forEach(opt => {
            opt.selected = task.tags.includes(opt.value);
        });
        
        document.getElementById('btn-delete-task').style.display = 'block';
        modalOverlay.style.display = 'flex';
        document.getElementById('task-name').focus();
    }

    function openAddTaskModal(projectId, defaultDate = null) {
        document.getElementById('modal-task-title').textContent = 'Add New Task';
        document.getElementById('task-id').value = '';
        document.getElementById('task-project-id').value = projectId || currentProjectId;
        document.getElementById('task-name').value = '';
        
        let today;
        if (defaultDate) {
            today = new Date(defaultDate);
        } else {
            today = new Date(timelineStart);
            today.setDate(timelineStart.getDate() + daysBefore);
        }
        // Set default end date to be the same as the start date
        const tomorrow = new Date(today);

        const formatDate = (d) => {
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${d.getFullYear()}-${month}-${day}`;
        };

        document.getElementById('task-start').value = formatDate(today);
        document.getElementById('task-end').value = formatDate(tomorrow);
        
        const palette = [
            'var(--task-blue)', 'var(--task-purple)', 'var(--task-pink)', 
            'var(--task-green)', 'var(--task-orange)', 'var(--task-red)'
        ];
        selectedColor = palette[Math.floor(Math.random() * palette.length)];
        colorOptions.forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.color === selectedColor) {
                opt.classList.add('selected');
            }
        });
        
        const taskTagsSelect = document.getElementById('task-tags');
        Array.from(taskTagsSelect.options).forEach(opt => opt.selected = false);
        
        document.getElementById('btn-delete-task').style.display = 'none';
        modalOverlay.style.display = 'flex';
        document.getElementById('task-name').focus();
    }

    const btnDeleteTask = document.getElementById('btn-delete-task');
    if (btnDeleteTask) {
        btnDeleteTask.addEventListener('click', async () => {
            const taskId = document.getElementById('task-id').value;
            if (!taskId) return;
            if (!confirm('Are you sure you want to delete this task?')) return;
            
            try {
                const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
                if (res.ok) {
                    modalOverlay.style.display = 'none';
                    taskForm.reset();
                    fetchTasks();
                }
            } catch (err) {
                console.error('Failed to delete task', err);
                alert('Failed to delete task');
            }
        });
    }

    // Handle form submit
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const taskId = document.getElementById('task-id').value;
        const name = document.getElementById('task-name').value;
        const start = document.getElementById('task-start').value;
        const end = document.getElementById('task-end').value;
        const selectedTags = Array.from(document.getElementById('task-tags').selectedOptions).map(o => o.value);

        if (new Date(start) > new Date(end)) {
            alert('End Date must be after Start Date');
            return;
        }

        const projectId = document.getElementById('task-project-id').value || currentProjectId;

        const taskData = {
            project_id: projectId,
            name: name,
            start: start,
            end: end,
            color: selectedColor,
            tags: selectedTags
        };

        try {
            const url = taskId ? `/api/tasks/${taskId}` : '/api/tasks';
            const method = taskId ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
            if (res.ok) {
                modalOverlay.style.display = 'none';
                taskForm.reset();
                fetchTasks(); // This re-fetches and re-renders
            }
        } catch (err) {
            console.error('Failed to save task', err);
            alert('Failed to save task');
        }
    });

    // --- List View Logic ---
    function generateListView() {
        const tbody = document.getElementById('list-tbody');
        const monthFilter = document.getElementById('filter-month');
        const tagFilter = document.getElementById('filter-tag');
        
        if (!tbody) return;
        tbody.innerHTML = '';
        
        // Populate month filter options if empty
        if (monthFilter.options.length <= 1) {
            const months = new Set();
            tasks.forEach(t => {
                const d1 = parseLocalDate(t.start);
                const d2 = parseLocalDate(t.end);
                months.add(`${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}`);
                months.add(`${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}`);
            });
            Array.from(months).sort().forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                monthFilter.appendChild(opt);
            });
        }

        const selectedMonth = monthFilter.value;
        const selectedTag = tagFilter.value;

        const filteredTasks = tasks.filter(t => {
            let matchMonth = true;
            let matchTag = true;

            if (selectedMonth !== 'all') {
                const startMonth = t.start.substring(0, 7);
                const endMonth = t.end.substring(0, 7);
                matchMonth = (startMonth === selectedMonth || endMonth === selectedMonth);
            }

            if (selectedTag !== 'all') {
                matchTag = t.tags && t.tags.includes(selectedTag);
            }

            return matchMonth && matchTag;
        });

        filteredTasks.forEach(task => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.addEventListener('click', () => {
                openEditTaskModal(task);
            });
            
            const tdProject = document.createElement('td');
            const project = projects.find(p => p.id === task.project_id);
            tdProject.textContent = project ? project.name : 'Unknown Project';
            tr.appendChild(tdProject);

            const tdName = document.createElement('td');
            const colorDot = document.createElement('div');
            colorDot.className = 'list-color-dot';
            colorDot.style.backgroundColor = task.color;
            tdName.appendChild(colorDot);
            
            const nameText = document.createTextNode(task.name);
            tdName.appendChild(nameText);
            tr.appendChild(tdName);
            
            const tdTags = document.createElement('td');
            if (task.tags) {
                task.tags.forEach(tag => {
                    const span = document.createElement('span');
                    span.className = `tag-badge ${tag}`;
                    span.textContent = tag;
                    tdTags.appendChild(span);
                });
            }

            const tdStart = document.createElement('td');
            tdStart.textContent = task.start;

            const tdEnd = document.createElement('td');
            tdEnd.textContent = task.end;

            const tdDuration = document.createElement('td');
            const d1 = parseLocalDate(task.start);
            const d2 = parseLocalDate(task.end);
            const days = Math.round((d2 - d1) / (1000 * 3600 * 24)) + 1;
            tdDuration.textContent = `${days} Days`;

            tr.appendChild(tdName);
            tr.appendChild(tdTags);
            tr.appendChild(tdStart);
            tr.appendChild(tdEnd);
            tr.appendChild(tdDuration);

            tbody.appendChild(tr);
        });
    }

    document.getElementById('filter-month').addEventListener('change', generateListView);
    document.getElementById('filter-tag').addEventListener('change', generateListView);

    // --- Calendar View Logic ---
    let calDate = new Date(); // tracks the currently displayed month
    
    function renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const headerTitle = document.getElementById('calendar-month-year');
        if (!grid || !headerTitle) return;

        const year = calDate.getFullYear();
        const month = calDate.getMonth();
        
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        headerTitle.textContent = `${monthNames[month]} ${year}`;
        
        grid.innerHTML = '';
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Render empty cells for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            const cell = document.createElement('div');
            cell.className = 'cal-cell empty';
            grid.appendChild(cell);
        }
        
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        
        for (let i = 1; i <= daysInMonth; i++) {
            const cell = document.createElement('div');
            cell.className = 'cal-cell';
            if (isCurrentMonth && today.getDate() === i) {
                cell.classList.add('today');
            }
            
            const dateLabel = document.createElement('div');
            dateLabel.className = 'cal-date';
            dateLabel.innerHTML = `<span>${i}</span>`;
            cell.appendChild(dateLabel);
            
            // Find tasks active on this day
            const currentDate = new Date(year, month, i);
            const currentDateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            
            tasks.forEach(task => {
                if (task.start <= currentDateStr && task.end >= currentDateStr) {
                    const project = projects.find(p => p.id === task.project_id);
                    const projectName = project ? project.name : '';
                    const taskLabel = document.createElement('div');
                    taskLabel.className = 'cal-task';
                    taskLabel.textContent = `${projectName ? projectName + ': ' : ''}${task.name}`;
                    taskLabel.style.backgroundColor = task.color;
                    taskLabel.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openEditTaskModal(task);
                    });
                    cell.appendChild(taskLabel);
                }
            });
            
            grid.appendChild(cell);
        }
        
        // Fill remaining cells for grid consistency
        const totalCells = firstDay + daysInMonth;
        const remainder = totalCells % 7;
        if (remainder !== 0) {
            for (let i = 0; i < 7 - remainder; i++) {
                const cell = document.createElement('div');
                cell.className = 'cal-cell empty';
                grid.appendChild(cell);
            }
        }
    }

    const btnCalPrev = document.getElementById('btn-cal-prev');
    const btnCalNext = document.getElementById('btn-cal-next');
    if (btnCalPrev) {
        btnCalPrev.addEventListener('click', () => {
            calDate.setMonth(calDate.getMonth() - 1);
            renderCalendar();
        });
    }
    if (btnCalNext) {
        btnCalNext.addEventListener('click', () => {
            calDate.setMonth(calDate.getMonth() + 1);
            renderCalendar();
        });
    }

    // --- View Switcher Logic ---
    const btnGantt = document.getElementById('btn-view-gantt');
    const btnList = document.getElementById('btn-view-list');
    const btnCalendar = document.getElementById('btn-view-calendar');
    const viewGantt = document.getElementById('gantt-view');
    const viewList = document.getElementById('list-view');
    const viewCalendar = document.getElementById('calendar-view');

    function switchView(activeBtn, activeView) {
        [btnGantt, btnList, btnCalendar].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        [viewGantt, viewList, viewCalendar].forEach(view => {
            if (view) view.style.display = 'none';
        });
        
        if (activeBtn) activeBtn.classList.add('active');
        if (activeView) activeView.style.display = activeView === viewGantt ? 'block' : 'flex';
    }

    if (btnGantt) {
        btnGantt.addEventListener('click', () => switchView(btnGantt, viewGantt));
    }
    
    if (btnList) {
        btnList.addEventListener('click', () => {
            switchView(btnList, viewList);
            generateListView();
        });
    }

    if (btnCalendar) {
        btnCalendar.addEventListener('click', () => {
            switchView(btnCalendar, viewCalendar);
            renderCalendar();
        });
    }

    // --- New ADD Modals Logic ---
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const appSidebar = document.querySelector('.app-sidebar');
    
    if (btnToggleSidebar && appSidebar) {
        btnToggleSidebar.addEventListener('click', () => {
            appSidebar.classList.toggle('collapsed');
        });
    }

    const btnAddTaskHeader = document.getElementById('btn-add-task-header');
    const btnAddTag = document.getElementById('btn-add-tag');
    
    const tagModal = document.getElementById('tag-modal');
    
    const closeTagModal = document.getElementById('close-tag-modal');

    const projectModal = document.getElementById('project-modal');
    const projectForm = document.getElementById('project-form');
    const closeProjectModal = document.getElementById('close-project-modal');
    const btnDeleteProject = document.getElementById('btn-delete-project');

    if (closeProjectModal) {
        closeProjectModal.addEventListener('click', () => {
            projectModal.style.display = 'none';
        });
    }

    projectModal.addEventListener('click', (e) => {
        if (e.target === projectModal) {
            projectModal.style.display = 'none';
        }
    });

    window.openAddProjectModal = function() {
        document.getElementById('modal-project-title').textContent = 'Add New Project';
        document.getElementById('project-id').value = '';
        document.getElementById('project-name').value = '';
        document.getElementById('btn-delete-project').style.display = 'none';
        projectModal.style.display = 'flex';
        document.getElementById('project-name').focus();
    };

    window.openEditProjectModal = function(project) {
        document.getElementById('modal-project-title').textContent = 'Edit Project';
        document.getElementById('project-id').value = project.id;
        document.getElementById('project-name').value = project.name;
        document.getElementById('btn-delete-project').style.display = 'block';
        projectModal.style.display = 'flex';
        document.getElementById('project-name').focus();
    };

    if (btnAddTaskHeader) {
        btnAddTaskHeader.addEventListener('click', () => {
            openAddProjectModal();
        });
    }

    if (btnDeleteProject) {
        btnDeleteProject.addEventListener('click', async () => {
            const projectId = document.getElementById('project-id').value;
            if (!projectId) return;
            if (!confirm('Are you sure you want to delete this project and all its tasks?')) return;
            
            try {
                const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
                if (res.ok) {
                    projectModal.style.display = 'none';
                    projectForm.reset();
                    fetchProjects();
                }
            } catch (err) {
                console.error('Failed to delete project', err);
                alert('Failed to delete project');
            }
        });
    }

    projectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const projectId = document.getElementById('project-id').value;
        const name = document.getElementById('project-name').value;

        try {
            const url = projectId ? `/api/projects/${projectId}` : '/api/projects';
            const method = projectId ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            
            if (res.ok) {
                projectModal.style.display = 'none';
                projectForm.reset();
                fetchProjects();
            } else {
                alert('Failed to save project');
            }
        } catch (err) {
            console.error('Failed to save project', err);
            alert('Failed to save project');
        }
    });

    if (btnAddTag) {
        btnAddTag.addEventListener('click', () => {
            tagModal.style.display = 'flex';
            document.getElementById('tag-name').focus();
        });
    }

    if (closeTagModal) {
        closeTagModal.addEventListener('click', () => tagModal.style.display = 'none');
    }

    const tagForm = document.getElementById('tag-form');
    if (tagForm) {
        tagForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('tag-name').value;
            const color = document.getElementById('tag-color').value;
            const res = await fetch('/api/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, color })
            });
            if (res.ok) {
                tagModal.style.display = 'none';
                tagForm.reset();
                fetchTags(); // Reload tags
            }
        });
    }
});
