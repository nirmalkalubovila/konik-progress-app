// Habit Tracker Application
class HabitTracker {
    constructor() {
        this.motivationalQuotes = [
            "Success is the sum of small efforts repeated day in and day out.",
            "The secret of getting ahead is getting started.",
            "You don't have to be great to start, but you have to start to be great.",
            "Small daily improvements over time lead to stunning results.",
            "Discipline is choosing between what you want now and what you want most.",
            "The only bad workout is the one that didn't happen.",
            "Your future self will thank you for the habits you build today.",
            "Every master was once a disaster who kept going.",
            "Motivation gets you started, habit keeps you going.",
            "Don't break the chain. Keep showing up.",
            "Excellence is not a destination; it is a continuous journey.",
            "You are what you repeatedly do. Excellence is not an act, but a habit."
        ];
        this.checkLocalStorage();
        this.habits = this.loadHabits();
        this.reflections = this.loadReflections();
        this.shownMilestones = this.loadShownMilestones();
        this.init();
    }

    checkLocalStorage() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
        } catch (e) {
            console.error('localStorage not available:', e);
            alert('This app requires localStorage to function. Please enable it in your browser settings or use a different browser.');
        }
    }

    init() {
        this.setupEventListeners();
        this.currentDay = 'today';
        this.render();
        this.updateStats();
        this.checkWeeklyReflection();
        this.renderReflections();
        this.checkMilestones();
    }

    setupEventListeners() {
        document.getElementById('addHabitBtn').addEventListener('click', () => this.addHabit());
        document.getElementById('habitName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addHabit();
        });

        // Day tab listeners
        document.querySelectorAll('.day-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentDay = e.target.dataset.day;
                this.renderDailyTasks();

                // Show/hide tomorrow note
                const note = document.getElementById('tomorrowNote');
                if (this.currentDay === 'tomorrow') {
                    note.style.display = 'block';
                } else {
                    note.style.display = 'none';
                }
            });
        });

        // Collapsible sections
        document.querySelectorAll('.section-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                const content = e.target.nextElementSibling;
                const icon = e.target.querySelector('.toggle-icon');

                // Check computed style, not inline style
                const isHidden = window.getComputedStyle(content).display === 'none';

                if (isHidden) {
                    content.style.display = 'block';
                    icon.textContent = '−';
                } else {
                    content.style.display = 'none';
                    icon.textContent = '+';
                }
            });
        });

        // History modal
        const closeHistoryModal = document.getElementById('closeHistoryModal');
        const historyModal = document.getElementById('historyModal');
        if (closeHistoryModal) {
            closeHistoryModal.addEventListener('click', () => {
                historyModal.classList.remove('active');
            });
        }
        if (historyModal) {
            historyModal.addEventListener('click', (e) => {
                if (e.target === historyModal) {
                    historyModal.classList.remove('active');
                }
            });
        }

        // Reflection modal listeners
        const openReflectionBtn = document.getElementById('openReflectionBtn');
        const closeReflectionModal = document.getElementById('closeReflectionModal');
        const saveReflectionBtn = document.getElementById('saveReflectionBtn');
        const reflectionModal = document.getElementById('reflectionModal');

        if (openReflectionBtn) {
            openReflectionBtn.addEventListener('click', () => this.openReflectionModal());
        }

        if (closeReflectionModal) {
            closeReflectionModal.addEventListener('click', () => this.closeReflectionModal());
        }

        if (saveReflectionBtn) {
            saveReflectionBtn.addEventListener('click', () => this.saveReflection());
        }

        if (reflectionModal) {
            reflectionModal.addEventListener('click', (e) => {
                if (e.target === reflectionModal) {
                    this.closeReflectionModal();
                }
            });
        }

        // Milestone dismiss
        const dismissMilestone = document.getElementById('dismissMilestone');
        if (dismissMilestone) {
            dismissMilestone.addEventListener('click', () => {
                this.hideMilestone();
            });
        }
    }

    addHabit() {
        const nameInput = document.getElementById('habitName');
        const startDateInput = document.getElementById('habitStartDate');
        const goalInput = document.getElementById('habitGoal');
        const whyInput = document.getElementById('habitWhy');

        const name = nameInput.value.trim();
        const startDate = startDateInput.value || new Date().toISOString().split('T')[0];
        const goal = parseInt(goalInput.value) || 66;
        const why = whyInput.value.trim();

        if (!name) {
            alert('Please enter a habit name');
            return;
        }

        const habit = {
            id: Date.now(),
            name: name,
            startDate: startDate,
            goal: goal,
            why: why,
            completedDays: [],
            createdAt: new Date().toISOString(),
            bestStreak: 0
        };

        this.habits.push(habit);
        this.saveHabits();
        this.render();
        this.updateStats();

        // Clear inputs
        nameInput.value = '';
        startDateInput.value = '';
        goalInput.value = '66';
        whyInput.value = '';
        nameInput.focus();
    }

    deleteHabit(id) {
        if (confirm('Are you sure you want to delete this habit?')) {
            this.habits = this.habits.filter(h => h.id !== id);
            this.saveHabits();
            this.render();
            this.updateStats();
        }
    }

    toggleDay(habitId, dayIndex) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit) return;

        const dayIndexStr = dayIndex.toString();
        const index = habit.completedDays.indexOf(dayIndexStr);

        if (index > -1) {
            habit.completedDays.splice(index, 1);
        } else {
            habit.completedDays.push(dayIndexStr);
        }

        // Update best streak
        const currentStreak = this.getCurrentStreak(habit.completedDays);
        if (!habit.bestStreak || currentStreak > habit.bestStreak) {
            habit.bestStreak = currentStreak;
        }

        this.saveHabits();
        this.render();
        this.updateStats();
        this.checkMilestones();
    }

    getDaysSinceCreation(createdAt) {
        const created = new Date(createdAt);
        created.setHours(0, 0, 0, 0); // Reset to start of day

        const now = new Date();
        now.setHours(0, 0, 0, 0); // Reset to start of day

        const diffTime = now - created;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Day 1 is the creation day, so add 1
        return diffDays + 1;
    }

    getCurrentStreak(completedDays) {
        if (completedDays.length === 0) return 0;

        const sortedDays = completedDays.map(d => parseInt(d)).sort((a, b) => b - a);
        let streak = 0;
        let expectedDay = sortedDays[0];

        for (let day of sortedDays) {
            if (day === expectedDay) {
                streak++;
                expectedDay--;
            } else {
                break;
            }
        }

        return streak;
    }

    getCurrentWeekCompletion(habit) {
        // Get current week (Monday to Sunday)
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, etc.
        const mondayOffset = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1);

        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);

        const currentDay = this.getDaysSinceCreation(habit.createdAt);
        const createdDate = new Date(habit.createdAt);
        createdDate.setHours(0, 0, 0, 0);

        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);

            if (date >= createdDate) {
                const dayIndex = this.getDaysSinceCreation(date.toISOString());
                const isCompleted = habit.completedDays.includes(dayIndex.toString());
                const isToday = date.toDateString() === today.toDateString();
                const isFuture = date > today;

                weekDays.push({
                    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
                    dayIndex: dayIndex,
                    completed: isCompleted,
                    isToday: isToday,
                    isFuture: isFuture
                });
            }
        }

        return weekDays;
    }

    renderDailyTasks() {
        const checklist = document.getElementById('todayChecklist');
        const dayOffset = this.currentDay === 'today' ? 0 : 1;
        const dayLabel = this.currentDay === 'today' ? 'Today' : 'Tomorrow';
        const isTomorrow = this.currentDay === 'tomorrow';

        if (this.habits.length === 0) {
            checklist.innerHTML = `<p class="empty-state">No habits to track ${this.currentDay}</p>`;
            document.getElementById('dailyCompletion').textContent = '0/0 Complete';
            return;
        }

        let html = '';
        let completedCount = 0;

        this.habits.forEach(habit => {
            const targetDay = this.getDaysSinceCreation(habit.createdAt) + dayOffset;
            const isCompleted = habit.completedDays.includes(targetDay.toString());
            const currentStreak = this.getCurrentStreak(habit.completedDays);

            if (isCompleted) completedCount++;

            html += `
                <div class="task-item ${isCompleted ? 'completed' : ''}">
                    <div class="task-info">
                        <span class="task-name">${this.escapeHtml(habit.name)}</span>
                        <span class="task-streak">Streak: ${currentStreak} | Best: ${habit.bestStreak || 0}</span>
                        ${habit.why ? `<span class="task-why">${this.escapeHtml(habit.why)}</span>` : ''}
                    </div>
                    ${isTomorrow ?
                    `<span class="btn-complete disabled" style="opacity: 0.5; cursor: not-allowed;">
                            ${isCompleted ? 'Planned' : 'Preview'}
                        </span>` :
                    `<button class="btn-complete ${isCompleted ? 'completed' : ''}" 
                            data-quick-toggle="${habit.id}" 
                            data-day-offset="${dayOffset}">
                            ${isCompleted ? 'Done' : 'Mark Complete'}
                        </button>`
                }
                </div>
            `;
        });

        checklist.innerHTML = html;

        if (this.currentDay === 'today') {
            document.getElementById('dailyCompletion').textContent = `${completedCount}/${this.habits.length} Complete`;
        } else {
            document.getElementById('dailyCompletion').textContent = `${completedCount}/${this.habits.length} Planned`;
        }

        // Add click handlers for buttons
        document.querySelectorAll('[data-quick-toggle]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const habitId = parseInt(e.currentTarget.dataset.quickToggle);
                const dayOffset = parseInt(e.currentTarget.dataset.dayOffset);
                const habit = this.habits.find(h => h.id === habitId);
                if (habit) {
                    const targetDay = this.getDaysSinceCreation(habit.createdAt) + dayOffset;
                    this.toggleDay(habitId, targetDay);
                }
            });
        });
    }

    render() {
        const habitsList = document.getElementById('habitsList');

        if (this.habits.length === 0) {
            habitsList.innerHTML = '<p class="empty-state">No habits yet. Create your first habit above.</p>';
            return;
        }

        // Render habits without header row (collapsible design)
        let html = this.habits.map(habit => this.renderHabit(habit)).join('');
        habitsList.innerHTML = html;

        // Attach event listeners
        this.habits.forEach(habit => {
            // Collapse/Expand toggle
            const toggleBtn = document.querySelector(`[data-habit-toggle="${habit.id}"]`);
            if (toggleBtn) {
                toggleBtn.addEventListener('click', (e) => {
                    const expandedView = document.getElementById(`habit-detail-${habit.id}`);
                    const icon = toggleBtn.querySelector('.habit-expand-icon');

                    if (expandedView.style.display === 'none') {
                        expandedView.style.display = 'flex';
                        icon.textContent = '−';
                    } else {
                        expandedView.style.display = 'none';
                        icon.textContent = '+';
                    }
                });
            }

            // Day cell clicks
            document.querySelectorAll(`[data-habit-id="${habit.id}"]`).forEach(cell => {
                cell.addEventListener('click', (e) => {
                    // Prevent marking disabled days (past or future)
                    if (e.target.dataset.disabled === 'true') {
                        return;
                    }

                    const dayIndex = parseInt(e.target.dataset.dayIndex);
                    const currentDay = this.getDaysSinceCreation(habit.createdAt);

                    // Only allow marking TODAY - not past, not future
                    if (dayIndex !== currentDay) {
                        return;
                    }

                    this.toggleDay(habit.id, dayIndex);
                });
            });

            const deleteBtn = document.querySelector(`[data-delete-id="${habit.id}"]`);
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteHabit(habit.id));
            }

            const historyBtn = document.querySelector(`button[data-habit-id="${habit.id}"].view-full-history-btn`);
            if (historyBtn) {
                historyBtn.addEventListener('click', () => this.showFullHistory(habit));
            }
        });
    }

    renderHabit(habit) {
        const daysCompleted = habit.completedDays.length;
        const streak = this.getCurrentStreak(habit.completedDays);
        const bestStreak = habit.bestStreak || 0;
        const daysSinceCreation = this.getDaysSinceCreation(habit.createdAt);
        const startDate = habit.startDate || habit.createdAt.split('T')[0];
        const formattedStartDate = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const completionRatio = `${daysCompleted}/${habit.goal}`;
        const completionPercent = habit.goal > 0 ? Math.round((daysCompleted / habit.goal) * 100) : 0;
        const daysRemaining = habit.goal - daysCompleted;

        // Get motivational quote for this habit (rotate based on habit ID)
        const quoteIndex = parseInt(habit.id) % this.motivationalQuotes.length;
        const habitQuote = this.motivationalQuotes[quoteIndex];

        // Motivational quote based on progress
        let motivationalQuote = '';
        if (completionPercent >= 100) {
            motivationalQuote = '<div class="motivation-quote success">Habit formed! You did it!</div>';
        } else if (completionPercent >= 90) {
            motivationalQuote = `<div class="motivation-quote almost-there">Almost there! Just ${daysRemaining} days to go. Finish strong!</div>`;
        } else if (completionPercent >= 75) {
            motivationalQuote = '<div class="motivation-quote progress">The finish line is in sight. Keep going!</div>';
        } else if (completionPercent >= 50) {
            motivationalQuote = '<div class="motivation-quote halfway">Halfway there! Momentum is building.</div>';
        } else if (completionPercent >= 25) {
            motivationalQuote = '<div class="motivation-quote building">Building the foundation. Every day counts.</div>';
        } else {
            motivationalQuote = '<div class="motivation-quote start">The journey of a thousand miles begins with a single step.</div>';
        }

        return `
            <div class="habit-row collapsible-habit">
                <div class="habit-compact-view" data-habit-toggle="${habit.id}">
                    <div class="habit-compact-left">
                        <span class="habit-expand-icon">+</span>
                        <div class="habit-compact-info">
                            <div class="habit-compact-name">${this.escapeHtml(habit.name)}</div>
                            <div class="habit-compact-progress">${completionRatio} completed • ${completionPercent}%</div>
                        </div>
                    </div>
                    <div class="habit-compact-quote">
                        
                        <span class="quote-text">${habitQuote}</span>
                    </div>
                </div>
                <div class="habit-expanded-view" id="habit-detail-${habit.id}" style="display: none;">
                    <div class="habit-info-column">
                        <div class="habit-meta">
                            ${habit.why ? `<div class="habit-description">${this.escapeHtml(habit.why)}</div>` : ''}
                            <div class="habit-metadata">
                                <span class="meta-item"><strong>Started:</strong> ${formattedStartDate}</span>
                               
                                <span class="meta-item"><strong>Streak:</strong> ${streak} days</span>
                            </div>
                            
                        </div>
                        <div class="habit-actions">
                            <button class="btn-delete-small" data-delete-id="${habit.id}">Delete</button>
                        </div>
                    </div>
                    <div class="habit-tracker-column">
                        <div class="days-scroll-container">
                            ${this.renderFullDaysWithWeekMarkers(habit, daysSinceCreation)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderDaysGrid(habit, daysToShow) {
        const currentDay = this.getDaysSinceCreation(habit.createdAt);
        let grid = '';

        // Show all days
        for (let i = 1; i <= daysToShow; i++) {
            const isCompleted = habit.completedDays.includes(i.toString());
            const isToday = i === currentDay;
            const classes = `day-cell ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''}`;

            grid += `
                <div class="${classes}" 
                     data-habit-id="${habit.id}" 
                     data-day-index="${i}"
                     title="Day ${i}">
                    ${isCompleted ? 'X' : i}
                </div>
            `;
        }

        return grid;
    }

    renderFullDaysWithWeekMarkers(habit, currentDay) {
        let html = '<div class="days-grid-with-markers">';
        const totalDays = Math.max(currentDay + 7, habit.goal); // Show at least goal days

        for (let i = 1; i <= totalDays; i++) {
            // Add week marker every 7 days
            if (i === 1 || (i - 1) % 7 === 0) {
                const weekNum = Math.ceil(i / 7);
                html += `<div class="week-marker">Week ${weekNum}</div>`;
            }

            const isCompleted = habit.completedDays.includes(i.toString());
            const isToday = i === currentDay;
            const isFuture = i > currentDay;
            const isPast = i < currentDay;
            const isDisabled = isPast || isFuture; // Disable both past and future days
            const classes = `day-cell ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''} ${isPast ? 'past-day' : ''}`;

            html += `
                <div class="${classes}" 
                     data-habit-id="${habit.id}" 
                     data-day-index="${i}"
                     ${isDisabled ? 'data-disabled="true"' : ''}
                     title="Day ${i}${isToday ? ' (Today)' : ''}${isFuture ? ' (Future - Not Yet Available)' : ''}${isPast && !isCompleted ? ' (Past - Cannot Edit)' : ''}">
                    ${isCompleted ? '✓' : i}
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    renderCompactDaysGrid(habit, currentDay) {
        let grid = '';

        // Show: last 14 days + today + next 3 days
        const startDay = Math.max(1, currentDay - 14);
        const endDay = currentDay + 3;

        for (let i = startDay; i <= endDay; i++) {
            const isCompleted = habit.completedDays.includes(i.toString());
            const isToday = i === currentDay;
            const isFuture = i > currentDay;
            const classes = `day-cell ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}`;

            grid += `
                <div class="${classes}" 
                     data-habit-id="${habit.id}" 
                     data-day-index="${i}"
                     title="Day ${i}">
                    ${isCompleted ? 'X' : i}
                </div>
            `;
        }

        return grid;
    }

    showFullHistory(habit) {
        const modal = document.getElementById('historyModal');
        const gridContainer = document.getElementById('fullHistoryGrid');

        const daysSinceCreation = this.getDaysSinceCreation(habit.createdAt);
        const daysToShow = Math.max(habit.goal, daysSinceCreation);

        let html = `<h3 style="margin-bottom: 20px; grid-column: 1 / -1;">${this.escapeHtml(habit.name)} - Complete History</h3>`;
        html += this.renderDaysGrid(habit, daysToShow);

        gridContainer.innerHTML = html;
        modal.classList.add('active');

        // Re-attach click handlers for the full history grid
        document.querySelectorAll(`#fullHistoryGrid [data-habit-id="${habit.id}"]`).forEach(cell => {
            cell.addEventListener('click', (e) => {
                const dayIndex = parseInt(e.target.dataset.dayIndex);
                this.toggleDay(habit.id, dayIndex);
                // Refresh the modal content
                setTimeout(() => this.showFullHistory(habit), 100);
            });
        });
    }

    updateStats() {
        // Calculate Discipline Score
        this.calculateDisciplineScore();

        // Update daily tasks display
        this.renderDailyTasks();
    }

    calculateDisciplineScore() {
        if (this.habits.length === 0) {
            document.getElementById('disciplineScore').textContent = '0';
            document.getElementById('weeklyScore').textContent = '0%';
            return;
        }

        // 1. Consistency Score (40 points): Daily completion over last 30 days
        const last30Days = 30;
        let consistencyPoints = 0;
        let daysTracked = 0;

        this.habits.forEach(habit => {
            const daysSinceCreation = this.getDaysSinceCreation(habit.createdAt);
            const daysToCheck = Math.min(daysSinceCreation, last30Days);

            let completedInLast30 = 0;
            for (let i = 1; i <= daysToCheck; i++) {
                const dayIndex = daysSinceCreation - daysToCheck + i;
                if (habit.completedDays.includes(dayIndex.toString())) {
                    completedInLast30++;
                }
            }

            if (daysToCheck > 0) {
                consistencyPoints += (completedInLast30 / daysToCheck);
                daysTracked++;
            }
        });

        const consistencyScore = daysTracked > 0
            ? Math.round((consistencyPoints / daysTracked) * 40)
            : 0;

        // 2. Weekly Rate (30 points): Completion rate in last 7 days
        const last7Days = 7;
        let weeklyPoints = 0;
        let weeklyTracked = 0;

        this.habits.forEach(habit => {
            const daysSinceCreation = this.getDaysSinceCreation(habit.createdAt);
            const daysToCheck = Math.min(daysSinceCreation, last7Days);

            let completedInLast7 = 0;
            for (let i = 1; i <= daysToCheck; i++) {
                const dayIndex = daysSinceCreation - daysToCheck + i;
                if (habit.completedDays.includes(dayIndex.toString())) {
                    completedInLast7++;
                }
            }

            if (daysToCheck > 0) {
                weeklyPoints += (completedInLast7 / daysToCheck);
                weeklyTracked++;
            }
        });

        const weeklyScore = weeklyTracked > 0
            ? Math.round((weeklyPoints / weeklyTracked) * 30)
            : 0;

        // 3. Streak Stability (30 points): Current streaks vs potential
        let streakPoints = 0;
        let streakTracked = 0;

        this.habits.forEach(habit => {
            const currentStreak = this.getCurrentStreak(habit.completedDays);
            const daysSinceCreation = this.getDaysSinceCreation(habit.createdAt);

            if (daysSinceCreation > 0) {
                const streakRatio = Math.min(currentStreak / Math.min(daysSinceCreation, 30), 1);
                streakPoints += streakRatio;
                streakTracked++;
            }
        });

        const streakScore = streakTracked > 0
            ? Math.round((streakPoints / streakTracked) * 30)
            : 0;

        // Calculate total Discipline Score (0-100)
        const disciplineScore = Math.min(consistencyScore + weeklyScore + streakScore, 100);

        // Update display
        document.getElementById('disciplineScore').textContent = disciplineScore;

        const consistencyScoreEl = document.getElementById('consistencyScore');
        if (consistencyScoreEl) {
            consistencyScoreEl.textContent = Math.round((consistencyScore / 40) * 100) + '%';
        }

        document.getElementById('weeklyScore').textContent =
            Math.round((weeklyScore / 30) * 100) + '%';

        const streakScoreEl = document.getElementById('streakScore');
        if (streakScoreEl) {
            streakScoreEl.textContent = Math.round((streakScore / 30) * 100) + '%';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveHabits() {
        try {
            localStorage.setItem('habits', JSON.stringify(this.habits));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.error('Storage quota exceeded. Data not saved.');
                alert('Storage limit reached. Please delete old habits or reflections.');
            } else {
                console.error('Error saving habits:', e);
            }
        }
    }

    loadHabits() {
        try {
            const saved = localStorage.getItem('habits');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error loading habits:', e);
            return [];
        }
    }

    // Weekly Reflection System
    loadReflections() {
        try {
            const saved = localStorage.getItem('reflections');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error loading reflections:', e);
            return [];
        }
    }

    saveReflectionsToStorage() {
        try {
            localStorage.setItem('reflections', JSON.stringify(this.reflections));
        } catch (e) {
            console.error('Error saving reflections:', e);
        }
    }

    checkWeeklyReflection() {
        const lastReflection = localStorage.getItem('lastReflectionPrompt');
        const now = new Date();

        if (!lastReflection) {
            localStorage.setItem('lastReflectionPrompt', now.toISOString());
            return;
        }

        const lastDate = new Date(lastReflection);
        const daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

        if (daysSince >= 7) {
            setTimeout(() => {
                this.openReflectionModal();
            }, 2000);
        }
    }

    openReflectionModal() {
        const modal = document.getElementById('reflectionModal');
        modal.classList.add('active');
        document.getElementById('reflectionWorked').focus();
    }

    closeReflectionModal() {
        const modal = document.getElementById('reflectionModal');
        modal.classList.remove('active');

        document.getElementById('reflectionWorked').value = '';
        document.getElementById('reflectionDidnt').value = '';
        document.getElementById('reflectionImprove').value = '';
    }

    saveReflection() {
        const worked = document.getElementById('reflectionWorked').value.trim();
        const didnt = document.getElementById('reflectionDidnt').value.trim();
        const improve = document.getElementById('reflectionImprove').value.trim();

        if (!worked && !didnt && !improve) {
            alert('Please fill in at least one field');
            return;
        }

        const reflection = {
            id: Date.now(),
            date: new Date().toISOString(),
            worked: worked,
            didnt: didnt,
            improve: improve
        };

        this.reflections.unshift(reflection);
        this.saveReflectionsToStorage();
        localStorage.setItem('lastReflectionPrompt', new Date().toISOString());

        this.closeReflectionModal();
        this.renderReflections();
    }

    renderReflections() {
        const container = document.getElementById('reflectionsList');

        if (this.reflections.length === 0) {
            container.innerHTML = '<p class="empty-state">No reflections yet</p>';
            return;
        }

        let html = '';
        this.reflections.forEach(reflection => {
            const date = new Date(reflection.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            html += `
                <div class="reflection-card">
                    <div class="reflection-date">${formattedDate}</div>
                    ${reflection.worked ? `
                        <div class="reflection-item">
                            <span class="reflection-label">What worked</span>
                            <p class="reflection-text">${this.escapeHtml(reflection.worked)}</p>
                        </div>
                    ` : ''}
                    ${reflection.didnt ? `
                        <div class="reflection-item">
                            <span class="reflection-label">What didn't</span>
                            <p class="reflection-text">${this.escapeHtml(reflection.didnt)}</p>
                        </div>
                    ` : ''}
                    ${reflection.improve ? `
                        <div class="reflection-item">
                            <span class="reflection-label">What will improve</span>
                            <p class="reflection-text">${this.escapeHtml(reflection.improve)}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // Milestone System
    loadShownMilestones() {
        try {
            const saved = localStorage.getItem('shownMilestones');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Error loading milestones:', e);
            return {};
        }
    }

    saveShownMilestones() {
        try {
            localStorage.setItem('shownMilestones', JSON.stringify(this.shownMilestones));
        } catch (e) {
            console.error('Error saving milestones:', e);
        }
    }

    getMilestoneMessage(streak, habitName) {
        // Only major milestones
        const messages = {
            7: "7 days. Most people quit before this.",
            21: "21 days. The pattern is forming.",
            30: "30 days. This is discipline.",
            100: "100 days. Habit is no longer effort.",
            365: "365 days. One year. Unwavering."
        };

        return messages[streak] || null;
    }

    checkMilestones() {
        if (this.habits.length === 0) return;

        let milestoneToShow = null;
        let highestStreak = 0;

        this.habits.forEach(habit => {
            const streak = this.getCurrentStreak(habit.completedDays);
            const habitKey = `habit-${habit.id}`;

            if (!this.shownMilestones[habitKey]) {
                this.shownMilestones[habitKey] = [];
            }

            const milestones = [7, 21, 30, 100, 365];

            for (const milestone of milestones) {
                if (streak >= milestone && !this.shownMilestones[habitKey].includes(milestone)) {
                    if (streak > highestStreak) {
                        highestStreak = streak;
                        milestoneToShow = {
                            habitId: habit.id,
                            habitName: habit.name,
                            streak: milestone,
                            message: this.getMilestoneMessage(milestone, habit.name)
                        };
                    }
                }
            }
        });

        if (milestoneToShow) {
            this.showMilestone(milestoneToShow);
        }
    }

    showMilestone(milestone) {
        const messageEl = document.getElementById('milestoneMessage');
        const textEl = document.getElementById('milestoneText');

        textEl.textContent = milestone.message;
        messageEl.classList.remove('hidden');

        const habitKey = `habit-${milestone.habitId}`;
        if (!this.shownMilestones[habitKey].includes(milestone.streak)) {
            this.shownMilestones[habitKey].push(milestone.streak);
            this.saveShownMilestones();
        }

        setTimeout(() => {
            this.hideMilestone();
        }, 10000);
    }

    hideMilestone() {
        const messageEl = document.getElementById('milestoneMessage');
        messageEl.classList.add('hidden');
    }


}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new HabitTracker();
});
