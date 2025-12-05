// Doctor dashboard appointments
let calCurrent = new Date();
let doctorAppointments = [];
let currentUser = null;

// Update welcome message with user's name using i18n
function updateWelcomeMessage() {
    if (currentUser && window.i18n && window.i18n.translations && window.i18n.translations.doctorDashboard) {
        const dashboardHeader = document.querySelector('.dashboard-header h1');
        if (dashboardHeader) {
            const welcomeTemplate = window.i18n.translations.doctorDashboard.welcome;
            if (welcomeTemplate) {
                // Replace {{name}} with actual name
                const welcomeText = welcomeTemplate.replace('{{name}}', currentUser.last_name);
                dashboardHeader.textContent = welcomeText;
            }
        }
    }
}

// Populate any elements that use data-user-field attributes (e.g. last_name, email, phone)
function populateUserFields(user) {
    if (!user) return;
    
    // Store user data for welcome message
    currentUser = user;
    window.doctorCurrentUser = user; // Expose to i18n system
    
    const userProfileElements = document.querySelectorAll('[data-user-field]');
    userProfileElements.forEach(element => {
        const field = element.getAttribute('data-user-field');
        if (field && user[field] !== undefined && user[field] !== null) {
            element.textContent = user[field];
        }
    });
    
    // Update welcome message with translation
    updateWelcomeMessage();
}

// Check session/authentication for doctor page and populate UI
async function checkAuthentication() {
    try {
        const res = await fetch('../../server/session.php?action=check', {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await res.json();
        
        if (result.success) {
            populateUserFields(result.data);
            return true;
        } else {
            alert('Please log in to access the doctor dashboard.');
            window.location.href = '../login.html';
            return false;
        }
    } catch (err) {
        console.error('Error checking session:', err);
        alert('Unable to verify login status. Redirecting to login.');
        window.location.href = '../login.html';
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Attach calendar navigation handlers
    document.getElementById('prevMonth').addEventListener('click', () => {
        calCurrent.setMonth(calCurrent.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
        calCurrent.setMonth(calCurrent.getMonth() + 1);
        renderCalendar();
    });

    // Attach filter handlers
    document.getElementById('statusFilter').addEventListener('change', filterAppointments);
    document.getElementById('dateFilter').addEventListener('change', filterAppointments);

    // Ensure user is authenticated and populate fields
    const ok = await checkAuthentication();
    if (!ok) return;

    await fetchAppointments();
    
    renderCalendar();
    renderAppointmentsList();
    
    // Listen for i18n initialization to update welcome message and calendar
    if (window.i18n) {
        // i18n already loaded, update welcome message and calendar
        updateWelcomeMessage();
        renderCalendar(); // Re-render calendar with translated month names
    } else {
        // Wait for i18n to load
        document.addEventListener('i18nReady', () => {
            updateWelcomeMessage();
            renderCalendar(); // Re-render calendar with translated month names
        });
    }
    
    // Listen for language changes
    document.addEventListener('languageChanged', () => {
        updateWelcomeMessage();
        renderCalendar(); // Re-render calendar when language changes
    });
});

async function fetchAppointments() {
    try {
        console.log('Fetching appointments from server...');
        const res = await fetch('../../server/appointments/get_doctor_appointments.php', {
            method: 'GET',
            credentials: 'include'
        });

        console.log('Fetch response status:', res.status);
        const data = await res.json();
        console.log('Raw appointment data from server:', data);
        
        if (data.success) {
            doctorAppointments = data.appointments.map(a => ({
                id: a.id,
                date: a.appointment_date,
                time: a.appointment_time,
                status: a.status,
                notes: a.notes || '',
                patient_id: a.patient_id,
                patient: (a.patient_first_name ? a.patient_first_name + ' ' + (a.patient_last_name || '') : 'Patient'),
                created_at: a.created_at,
                updated_at: a.updated_at
            }));
            console.log('Processed appointments:', doctorAppointments);
        } else {
            console.error('Server returned error:', data.message);
            doctorAppointments = [];
        }
    } catch (err) {
        console.error('Error fetching appointments:', err);
        doctorAppointments = [];
    }
}

function renderCalendar() {
    console.log('renderCalendar called, appointments:', doctorAppointments);
    
    // Get month names from translation system or fallback to English
    const monthNames = (window.i18n && window.i18n.translations && window.i18n.translations.doctorDashboard && window.i18n.translations.doctorDashboard.months) 
        ? window.i18n.translations.doctorDashboard.months 
        : ['January','February','March','April','May','June','July','August','September','October','November','December'];
        
    const month = calCurrent.getMonth();
    const year = calCurrent.getFullYear();

    console.log(`Rendering calendar for ${monthNames[month]} ${year}`);
    document.getElementById('calendarMonth').textContent = `${monthNames[month]} ${year}`;

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Add blank slots for previous month
    for (let i = 0; i < firstDay; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell other-month';
        grid.appendChild(cell);
    }

    // Render days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';

        const header = document.createElement('div');
        header.className = 'cell-day';
        header.textContent = day;
        cell.appendChild(header);

        // find appointments for this date
        const apps = doctorAppointments.filter(a => a.date === dateStr);
        if (apps.length > 0) {
            const dots = document.createElement('div');
            dots.className = 'cell-dots';

            const statusCount = {};
            apps.forEach(a => {
                statusCount[a.status] = (statusCount[a.status] || 0) + 1;
            });

            // For each status present, add a colored dot and count
            Object.keys(statusCount).forEach(status => {
                const dotWrap = document.createElement('div');
                dotWrap.className = 'dot-wrap';
                const dot = document.createElement('span');
                dot.className = `dot ${status}`;
                const cnt = document.createElement('span');
                cnt.className = 'cnt';
                cnt.textContent = statusCount[status];
                dotWrap.appendChild(dot);
                dotWrap.appendChild(cnt);
                dots.appendChild(dotWrap);
            });

            cell.appendChild(dots);

            // Add tooltip list of appointments
            const list = document.createElement('div');
            list.className = 'cell-list';
            apps.forEach(a => {
                const item = document.createElement('div');
                item.className = 'cell-item ' + a.status;
                item.textContent = `${a.time} — ${a.patient} (${capitalize(a.status)})`;
                list.appendChild(item);
            });
            cell.appendChild(list);
        }

        grid.appendChild(cell);
    }
}

function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Appointment list functionality
function renderAppointmentsList() {
    console.log('renderAppointmentsList called with', doctorAppointments.length, 'appointments');
    const appointmentsList = document.getElementById('appointmentsList');
    const emptyState = document.getElementById('emptyAppointments');
    
    console.log('appointmentsList element:', appointmentsList);
    console.log('emptyState element:', emptyState);
    
    if (doctorAppointments.length === 0) {
        console.log('No appointments found, showing empty state');
        appointmentsList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    // Sort appointments by date and time
    const sortedAppointments = [...doctorAppointments].sort((a, b) => {
        const dateA = new Date(a.date + ' ' + a.time);
        const dateB = new Date(b.date + ' ' + b.time);
        return dateA - dateB;
    });
    
    appointmentsList.innerHTML = sortedAppointments.map(appointment => {
        const appointmentDate = new Date(appointment.date);
        const formattedDate = appointmentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        return `
            <div class="appointment-item" data-appointment-id="${appointment.id}">
                <div class="appointment-header">
                    <div class="appointment-info">
                        <div class="appointment-patient">${appointment.patient}</div>
                        <div class="appointment-datetime">
                            <span><i class="ri-calendar-line"></i> ${formattedDate}</span>
                            <span><i class="ri-time-line"></i> ${appointment.time}</span>
                        </div>
                        ${appointment.notes ? `<div class="appointment-notes">${appointment.notes}</div>` : ''}
                    </div>
                    
                    <div class="status-controls">
                        <span class="current-status ${appointment.status}">${capitalize(appointment.status)}</span>
                        <div class="status-change">
                            <select class="status-select" data-appointment-id="${appointment.id}">
                                <option value="">Change status</option>
                                <option value="scheduled" ${appointment.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                                <option value="confirmed" ${appointment.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                                <option value="completed" ${appointment.status === 'completed' ? 'selected' : ''}>Completed</option>
                                <option value="cancelled" ${appointment.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                            <button class="update-btn" onclick="updateAppointmentStatus(${appointment.id})">Update</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    emptyState.style.display = 'none';
}

async function updateAppointmentStatus(appointmentId) {
    const selectElement = document.querySelector(`.status-select[data-appointment-id="${appointmentId}"]`);
    const newStatus = selectElement.value;
    
    if (!newStatus) {
        showNotification('Please select a new status', 'error');
        return;
    }
    
    const updateBtn = selectElement.nextElementSibling;
    const originalText = updateBtn.textContent;
    updateBtn.textContent = 'Updating...';
    updateBtn.disabled = true;
    
    try {
        const response = await fetch('../../server/appointments/update_appointment_status.php', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                appointment_id: appointmentId,
                status: newStatus
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update the appointment in our local array
            const appointmentIndex = doctorAppointments.findIndex(a => a.id == appointmentId);
            if (appointmentIndex !== -1) {
                doctorAppointments[appointmentIndex].status = newStatus;
            }
            
            // Re-render both calendar and appointments list
            renderCalendar();
            renderAppointmentsList();
            
            showNotification('Appointment status updated successfully', 'success');
        } else {
            showNotification(result.message || 'Failed to update appointment status', 'error');
        }
        
    } catch (error) {
        console.error('Error updating appointment status:', error);
        showNotification('Failed to update appointment status. Please try again.', 'error');
    } finally {
        updateBtn.textContent = originalText;
        updateBtn.disabled = false;
    }
}

function filterAppointments() {
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    const appointmentItems = document.querySelectorAll('.appointment-item');
    
    let visibleCount = 0;
    
    appointmentItems.forEach(item => {
        const appointmentId = item.dataset.appointmentId;
        const appointment = doctorAppointments.find(a => a.id == appointmentId);
        
        if (!appointment) return;
        
        let showItem = true;
        
        // Filter by status
        if (statusFilter !== 'all' && appointment.status !== statusFilter) {
            showItem = false;
        }
        
        // Filter by date
        if (dateFilter !== 'all' && showItem) {
            const appointmentDate = new Date(appointment.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            appointmentDate.setHours(0, 0, 0, 0);
            
            switch (dateFilter) {
                case 'today':
                    if (appointmentDate.getTime() !== today.getTime()) {
                        showItem = false;
                    }
                    break;
                case 'upcoming':
                    if (appointmentDate < today) {
                        showItem = false;
                    }
                    break;
                case 'past':
                    if (appointmentDate >= today) {
                        showItem = false;
                    }
                    break;
            }
        }
        
        item.style.display = showItem ? 'block' : 'none';
        if (showItem) visibleCount++;
    });
    
    // Show/hide empty state
    const emptyState = document.getElementById('emptyAppointments');
    if (visibleCount === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
    }
}

function showNotification(message, type = 'info') {
    alert(message);
}



// Logout function
function logout() {
    fetch('../../server/session.php?action=logout', {
        method: 'GET',
        credentials: 'include'
    }).then(() => {
        localStorage.removeItem('userData');
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('userEmail');
        window.location.href = '../index.html';
    });
}
