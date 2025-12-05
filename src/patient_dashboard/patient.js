// Patient Dashboard JavaScript

// Authentication and user data management
let currentUser = null;
// API base for appointments (centralized path)
const API_APPOINTMENTS = '../../server/appointments';

// Check if user is logged in and load user data
async function checkAuthentication() {
    try {
        // First check if user data exists in localStorage (from login)
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
            currentUser = JSON.parse(storedUserData);
        }

        // Verify session with server
        const response = await fetch('../../server/session.php?action=check', {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentUser = result.data;
            // Update localStorage with fresh data
            localStorage.setItem('userData', JSON.stringify(result.data));
            loadUserSpecificData();
            return true;
        } else {
            // User not logged in, redirect to login
            localStorage.removeItem('userData');
            alert('Please log in to access the patient dashboard.');
            window.location.href = '../login.html';
            return false;
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        alert('Unable to verify login status. Please log in again.');
        window.location.href = '../login.html';
        return false;
    }
}

// Load user-specific data into the dashboard
function loadUserSpecificData() {
    if (!currentUser) return;

    // Update welcome message with user's name using i18n
    const dashboardHeader = document.querySelector('.dashboard-header h1');
    if (dashboardHeader) {
        // Check if i18n is available and has the translation
        if (window.i18n && window.i18n.translations && window.i18n.translations.patientDashboard) {
            const welcomeTemplate = window.i18n.translations.patientDashboard.welcome;
            if (welcomeTemplate) {
                // Replace {{name}} with actual name
                const welcomeText = welcomeTemplate.replace('{{name}}', currentUser.first_name);
                dashboardHeader.textContent = welcomeText;
            } else {
                // Fallback to English
                dashboardHeader.textContent = `Welcome, ${currentUser.first_name}!`;
            }
        } else {
            // Fallback if i18n not loaded yet
            dashboardHeader.textContent = `Welcome, ${currentUser.first_name}!`;
        }
    }

    // Update any user profile sections if they exist
    const userProfileElements = document.querySelectorAll('[data-user-field]');
    userProfileElements.forEach(element => {
        const field = element.getAttribute('data-user-field');
        if (currentUser[field]) {
            element.textContent = currentUser[field];
        }
    });

    // Load user's appointments
    loadUserAppointments();
}

// Load user's appointments from server
async function loadUserAppointments() {
    try {
        const response = await fetch('../../server/session.php?action=appointments', {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayUserAppointments(result.data.appointments);
        } else {
            console.error('Failed to load appointments:', result.message);
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

// Display user appointments in the history tab
function displayUserAppointments(appointments) {
    const appointmentsList = document.getElementById('appointmentsList');
    const emptyState = document.getElementById('emptyState');
    
    if (!appointmentsList) return;
    
    if (!appointments || appointments.length === 0) {
        appointmentsList.innerHTML = '';
        if (emptyState) {
            emptyState.style.display = 'block';
            // Manually apply translations to empty state elements
            if (window.i18n && window.i18n.translations && window.i18n.translations.patientDashboard) {
                const emptyTitle = emptyState.querySelector('h3');
                const emptySubtitle = emptyState.querySelector('p');
                const emptyButton = emptyState.querySelector('button');
                
                if (emptyTitle) {
                    emptyTitle.textContent = window.i18n.translations.patientDashboard.emptyBookingHistory?.title || 'No appointments found';
                }
                if (emptySubtitle) {
                    emptySubtitle.textContent = window.i18n.translations.patientDashboard.emptyBookingHistory?.subtitle || 'You haven\'t booked any appointments yet. Start by booking your first appointment!';
                }
                if (emptyButton) {
                    emptyButton.innerHTML = '<i class="ri-add-line"></i> ' + (window.i18n.translations.patientDashboard.emptyBookingHistory?.button || 'Book Your First Appointment');
                }
            }
        }
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    appointmentsList.innerHTML = appointments.map(appointment => {
        const appointmentDate = new Date(appointment.appointment_date);
        const statusClass = appointment.status.toLowerCase();
        const doctorName = appointment.doctor_first_name && appointment.doctor_last_name 
            ? `Dr. ${appointment.doctor_first_name} ${appointment.doctor_last_name}`
            : 'Doctor TBD';
        
        return `
            <div class="appointment-card ${statusClass}" data-appointment-id="${appointment.id}">
                <div class="appointment-header">
                    <div class="appointment-date">
                        <div class="date-day">${appointmentDate.getDate()}</div>
                        <div class="date-month">${appointmentDate.toLocaleDateString('en', {month: 'short'})}</div>
                        <div class="date-year">${appointmentDate.getFullYear()}</div>
                    </div>
                    <div class="appointment-info">
                        <h3>${doctorName}</h3>
                        <p class="appointment-type" data-original-type="${appointment.specialization || 'General Dentistry'}">${translateSpecialization(appointment.specialization || 'General Dentistry')}</p>
                        <div class="appointment-details">
                            <span class="time"><i class="ri-time-line"></i> ${appointment.appointment_time}</span>
                            <span class="status ${statusClass}">${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}</span>
                        </div>
                    </div>
                    <div class="appointment-actions">
                        ${getAppointmentActions(appointment)}
                    </div>
                </div>
                ${appointment.notes ? `<div class="appointment-notes"><strong>Notes:</strong> ${appointment.notes}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Get appropriate action buttons based on appointment status
function getAppointmentActions(appointment) {
    switch (appointment.status.toLowerCase()) {
        case 'scheduled':
        case 'confirmed':
            return `
                <button class="btn-small btn-cancel" onclick="confirmAndCancel(${appointment.id})">Cancel</button>
            `;
        case 'completed':
            return `
                <button class="btn-small btn-outline" onclick="viewAppointmentDetails(${appointment.id})">View Details</button>
            `;
        case 'cancelled':
            return `<button class="btn-small btn-primary" onclick="rebookAppointment(${appointment.id})">Book Again</button>`;
        default:
            return '';
    }
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

// Tab switching functionality
function switchTab(tabId) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding content
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

// Load doctors from database
async function loadDoctors() {
    try {
        const response = await fetch('../../server/get_doctors.php', {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Populate doctor select dropdown
            const doctorSelect = document.getElementById('doctorSelect');
            if (doctorSelect) {
                // Clear existing options (except the first placeholder)
                const placeholderText = window.i18n.translations.patientDashboard?.doctorSelect?.choose;
                doctorSelect.innerHTML = `<option value="">${placeholderText}</option>`;
                
                // Add doctors from database
                result.doctors.forEach(doctor => {
                    const option = document.createElement('option');
                    option.value = doctor.id;
                    option.textContent = doctor.display_text;
                    doctorSelect.appendChild(option);
                });
            }
            
            // Populate doctors grid
            const doctorsGrid = document.getElementById('doctorsGrid');
            if (doctorsGrid) {
                doctorsGrid.innerHTML = ''; // Clear existing content
                
                result.doctors.forEach(doctor => {
                    const specialtyClass = getSpecialtyClass(doctor.specialization);
                    const availability = Math.random() > 0.3 ? 'available' : 'busy'; // Random availability for demo
                    const rating = (4.5 + Math.random() * 0.4).toFixed(1); // Random rating between 4.5-4.9
                    
                    const doctorCard = document.createElement('div');
                    doctorCard.className = 'doctor-mini-card';
                    doctorCard.setAttribute('data-specialty', specialtyClass);

                    
                    doctorCard.innerHTML = `
                        <div class="mini-avatar">
                            <img src="../assets/${doctor.image_url}" alt="${doctor.name}">
                            <div class="availability-dot ${availability}"></div>
                        </div>
                        <div class="mini-info">
                            <h4 class="mini-name">${doctor.name}</h4>
                            <p class="mini-specialty" data-original-specialty="${doctor.specialization}">${translateSpecialization(doctor.specialization)}</p>
                            <div class="mini-rating">
                                <i class="ri-star-fill"></i>
                                <span>${rating}</span>
                            </div>
                        </div>
                    `;
                    
                    doctorsGrid.appendChild(doctorCard);
                    console.log(doctor.image_url);
                });
            }
        } else {
            console.error('Failed to load doctors:', result.error);
            showNotification('Failed to load doctors. Please refresh the page.', 'error');
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
        showNotification('Error loading doctors. Please refresh the page.', 'error');
    }
}

// Helper function to get specialty class for filtering
function getSpecialtyClass(specialization) {
    const specialtyMap = {
        'General Dentistry': 'general',
        'Orthodontics': 'orthodontics',
        'Oral Surgery': 'surgery',
        'Pediatric Dentistry': 'pediatric'
    };
    return specialtyMap[specialization] || 'general';
}

// Helper function to translate specializations
function translateSpecialization(specialization) {
    if (!window.i18n || !window.i18n.translations || !window.i18n.translations.patientDashboard) {
        return specialization; // Fallback to original
    }
    
    const specialtyOptions = window.i18n.translations.patientDashboard.specialitiesOptions;
    if (!specialtyOptions) {
        return specialization; // Fallback to original
    }
    
    // Map the specialization to the translation key
    const specialtyMap = {
        'General Dentistry': specialtyOptions.general,
        'Orthodontics': specialtyOptions.orthodontics,
        'Oral Surgery': specialtyOptions.surgery,
        'Pediatric Dentistry': specialtyOptions.pediatric
    };
    
    return specialtyMap[specialization] || specialization;
}


// Initialize doctors search and filter functionality
function initializeDoctorsFilters() {
    const doctorSearch = document.getElementById('doctorSearch');
    const specialtyFilter = document.getElementById('specialtyFilter');
    
    if (doctorSearch) {
        doctorSearch.addEventListener('input', filterDoctorCards);
    }
    
    if (specialtyFilter) {
        specialtyFilter.addEventListener('change', filterDoctorCards);
    }
}

// Filter doctor cards based on search and specialty
function filterDoctorCards() {
    const searchTerm = document.getElementById('doctorSearch')?.value.toLowerCase() || '';
    const selectedSpecialty = document.getElementById('specialtyFilter')?.value || 'all';
    
    const doctorCards = document.querySelectorAll('.doctor-mini-card');
    
    doctorCards.forEach(card => {
        const doctorName = card.querySelector('.mini-name').textContent.toLowerCase();
        const doctorSpecialty = card.querySelector('.mini-specialty').textContent.toLowerCase();
        const cardSpecialtyClass = card.getAttribute('data-specialty');
        
        const matchesSearch = doctorName.includes(searchTerm) || doctorSpecialty.includes(searchTerm);
        const matchesSpecialty = selectedSpecialty === 'all' || cardSpecialtyClass === selectedSpecialty;
        
        if (matchesSearch && matchesSpecialty) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication before initializing dashboard
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) return;
    
    // Load doctors from database
    await loadDoctors();
    
    // Initialize doctors search and filter
    initializeDoctorsFilters();
    
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            switchTab(tabId);
        });
    });

    // Set minimum date for appointment booking (today)
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        dateInput.min = today;
    }

    // Handle appointment form submission
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', handleAppointmentSubmission);
    }

    // This will be handled by loadUserSpecificData() after authentication

    // Listen for i18n initialization to update welcome message
    if (window.i18n) {
        // i18n already loaded, update welcome message
        updateWelcomeMessage();
    } else {
        // Wait for i18n to load
        document.addEventListener('i18nReady', updateWelcomeMessage);
    }
    
    // Listen for language changes
    document.addEventListener('languageChanged', updateWelcomeMessage);
    document.addEventListener('languageChanged', refreshDoctorCards);
    document.addEventListener('languageChanged', updateDoctorDropdown);
    document.addEventListener('languageChanged', updateEmptyState);
});

// Function to update welcome message with current language
function updateWelcomeMessage() {
    if (currentUser && window.i18n && window.i18n.translations && window.i18n.translations.patientDashboard) {
        const dashboardHeader = document.querySelector('.dashboard-header h1');
        if (dashboardHeader) {
            const welcomeTemplate = window.i18n.translations.patientDashboard.welcome;
            if (welcomeTemplate) {
                const welcomeText = welcomeTemplate.replace('{{name}}', currentUser.first_name);
                dashboardHeader.textContent = welcomeText;
            }
        }
    }
}

// Function to refresh doctor cards with new translations
function refreshDoctorCards() {
    // Update all specialty text in doctor cards
    const specialtyElements = document.querySelectorAll('.mini-specialty');
    specialtyElements.forEach(element => {
        const originalText = element.getAttribute('data-original-specialty') || element.textContent;
        if (!element.getAttribute('data-original-specialty')) {
            // Store original text for future translations
            element.setAttribute('data-original-specialty', element.textContent);
        }
        element.textContent = translateSpecialization(originalText);
    });
    
    // Update appointment types
    const appointmentTypes = document.querySelectorAll('.appointment-type');
    appointmentTypes.forEach(element => {
        const originalText = element.getAttribute('data-original-type') || element.textContent;
        if (!element.getAttribute('data-original-type')) {
            element.setAttribute('data-original-type', element.textContent);
        }
        element.textContent = translateSpecialization(originalText);
    });
}

// Function to update doctor dropdown placeholder text
function updateDoctorDropdown() {
    const doctorSelect = document.getElementById('doctorSelect');
    if (doctorSelect && window.i18n && window.i18n.translations && window.i18n.translations.patientDashboard) {
        const placeholderOption = doctorSelect.querySelector('option[value=""]');
        if (placeholderOption) {
            const placeholderText = window.i18n.translations.patientDashboard.doctorSelect?.choose;
            placeholderOption.textContent = placeholderText;
        }
    }
}

// Function to update empty state translations
function updateEmptyState() {
    const emptyState = document.getElementById('emptyState');
    if (emptyState && window.i18n && window.i18n.translations && window.i18n.translations.patientDashboard) {
        const emptyTitle = emptyState.querySelector('h3');
        const emptySubtitle = emptyState.querySelector('p');
        const emptyButton = emptyState.querySelector('button');
        
        if (emptyTitle) {
            emptyTitle.textContent = window.i18n.translations.patientDashboard.emptyBookingHistory?.title || 'No appointments found';
        }
        if (emptySubtitle) {
            emptySubtitle.textContent = window.i18n.translations.patientDashboard.emptyBookingHistory?.subtitle || 'You haven\'t booked any appointments yet. Start by booking your first appointment!';
        }
        if (emptyButton) {
            emptyButton.innerHTML = '<i class="ri-add-line"></i> ' + (window.i18n.translations.patientDashboard.emptyBookingHistory?.button || 'Book Your First Appointment');
        }
    }
}

// Handle appointment form submission
async function handleAppointmentSubmission(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    // Get form values
    const appointmentData = {
        doctor: formData.get('doctor'),
        appointmentType: formData.get('appointmentType'),
        date: formData.get('date'),
        time: formData.get('time'),
        notes: formData.get('notes') || ''
    };

    // Validate form data
    if (!validateAppointmentData(appointmentData)) {
        return;
    }

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="ri-loader-4-line"></i> Booking...';
    submitBtn.disabled = true;

    try {
        // Send appointment data to PHP backend
        const response = await fetch(`${API_APPOINTMENTS}/book_appointment.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(appointmentData)
        });
        // Improved error handling: check HTTP status first
        let result;
        try {
            result = await response.json();
        } catch (err) {
            const text = await response.text().catch(() => '');
            console.error('Non-JSON booking response', response.status, text);
            showNotification('Booking failed: server returned ' + response.status, 'error');
            return;
        }

        if (response.ok && result.success) {
            // Show success message
            showNotification('Appointment booked successfully!', 'success');
            
            // Reset form
            form.reset();
            
            // Refresh appointment history
            loadUserAppointments();
            
            // Switch to history tab to show the new appointment
            setTimeout(() => {
                switchTab('booking-history');
            }, 2000);
        } else {
            showNotification('Failed to book appointment: ' + result.message, 'error');
        }

    } catch (error) {
        console.error('Error booking appointment:', error);
        showNotification('Failed to book appointment. Please try again.', 'error');
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Validate appointment data
function validateAppointmentData(data) {
    if (!data.doctor) {
        showNotification('Please select a doctor', 'error');
        return false;
    }
    if (!data.appointmentType) {
        showNotification('Please select an appointment type', 'error');
        return false;
    }
    if (!data.date) {
        showNotification('Please select a date', 'error');
        return false;
    }
    if (!data.time) {
        showNotification('Please select a time', 'error');
        return false;
    }
    
    // Check if date is in the future
    const selectedDate = new Date(data.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showNotification('Please select a future date', 'error');
        return false;
    }
    
    return true;
}

// Load appointment history (deprecated - now using loadUserAppointments)
function loadAppointmentHistory() {
    // This function is replaced by loadUserAppointments which gets real data from server
    console.log('loadAppointmentHistory is deprecated, using loadUserAppointments instead');
}

// Handle doctor selection from mini cards
function selectDoctorForAppointment(doctorName) {
    // Switch to booking tab
    switchTab('book-appointment');
    
    // Select the doctor in the dropdown
    const doctorSelect = document.getElementById('doctorSelect');
    if (doctorSelect) {
        // Find the option that matches the doctor name
        const options = doctorSelect.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].text.includes(doctorName)) {
                options[i].selected = true;
                break;
            }
        }
        
        // Trigger change event if needed for any validation
        doctorSelect.dispatchEvent(new Event('change'));
    }
    
    // Show confirmation message
    showNotification(`Dr. ${doctorName} selected for appointment booking`, 'success');
    
    // Smooth scroll to the appointment form
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) {
        appointmentForm.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
    }
}

function showNotification(message, type = 'info') {
    alert(message);
}

// Handle appointment card actions
document.addEventListener('click', function(e) {
    if (e.target.matches('.book-appointment-btn') || e.target.closest('.book-appointment-btn')) {
        // Redirect to appointment booking or switch to book tab
        switchTab('book-appointment');
    }
});

// Confirm then cancel wrapper for inline onclick
function confirmAndCancel(appointmentId) {
    const appointmentCard = document.querySelector(`.appointment-card[data-appointment-id="${appointmentId}"]`);
    const doctorName = appointmentCard?.querySelector('.appointment-info h3')?.textContent || 'the doctor';
    const appointmentType = appointmentCard?.querySelector('.appointment-type')?.textContent || 'appointment';

    if (confirm(`Are you sure you want to cancel your ${appointmentType} appointment with ${doctorName}?`)) {
        cancelAppointment(appointmentId, appointmentCard);
    }
}

function confirmAndRebookAppointment(appointmentId) {
    const appointmentCard = document.querySelector(`.appointment-card[data-appointment-id="${appointmentId}"]`);
    const doctorName = appointmentCard?.querySelector('.appointment-info h3')?.textContent || 'the doctor';
    const appointmentType = appointmentCard?.querySelector('.appointment-type')?.textContent || 'appointment';

    if (confirm(`Are you sure you want to rebook your ${appointmentType} appointment with ${doctorName}?`)) {
        // Call server to rebook appointment
        rebookAppointment(appointmentId, appointmentCard);
    }
}

// Handle appointment cancellation
function handleCancelAppointment(e) {
    e.preventDefault();
    const appointmentCard = e.target.closest('.appointment-card');
    const doctorName = appointmentCard.querySelector('.appointment-info h3').textContent;
    const appointmentType = appointmentCard.querySelector('.appointment-type').textContent;
    const appointmentId = appointmentCard.getAttribute('data-appointment-id');

    if (!appointmentId) {
        showNotification('Unable to determine appointment ID', 'error');
        return;
    }

    if (confirm(`Are you sure you want to cancel your ${appointmentType} appointment with ${doctorName}?`)) {
        // Call server to cancel appointment
        cancelAppointment(appointmentId, appointmentCard);
    }
}

// Cancel appointment via API and update UI on success
async function cancelAppointment(appointmentId, appointmentCard = null) {
    try {
        const response = await fetch(`${API_APPOINTMENTS}/cancel_appointment.php`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ appointment_id: appointmentId })
        });

        const result = await response.json();

            if (result.success) {
                // If appointmentCard wasn't provided, try to find it in DOM
                if (!appointmentCard) {
                    appointmentCard = document.querySelector(`.appointment-card[data-appointment-id="${appointmentId}"]`);
                }

                if (appointmentCard) {
                    // Update status to scheduled (rebooked)
                    appointmentCard.classList.remove('cancelled');
                    appointmentCard.classList.add('scheduled');

                    const statusBadge = appointmentCard.querySelector('.status');
                    if (statusBadge) {
                        statusBadge.textContent = 'Scheduled';
                        statusBadge.className = 'status scheduled';
                    }

                    const actionsDiv = appointmentCard.querySelector('.appointment-actions');
                    if (actionsDiv) {
                        actionsDiv.innerHTML = '<button class="btn-small btn-cancel" onclick="confirmAndCancel(' + appointmentId + ')">Cancel</button>';
                    }
                }

                showNotification(result.message || 'Appointment rebooked successfully', 'success');

                // Refresh appointments from server to ensure consistency
                loadUserAppointments();
            } else {
                showNotification(result.message || 'Failed to rebook appointment', 'error');
            }
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showNotification('Failed to cancel appointment. Please try again.', 'error');
    }
}

// Rebook appointment via API and update UI on success
async function rebookAppointment(appointmentId, appointmentCard = null) {
    try {
        const response = await fetch(`${API_APPOINTMENTS}/rebook_appointment.php`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ appointment_id: appointmentId })
        });

        const result = await response.json();

        if (result.success) {
            // If appointmentCard wasn't provided, try to find it in DOM
            if (!appointmentCard) {
                appointmentCard = document.querySelector(`.appointment-card[data-appointment-id="${appointmentId}"]`);
            }

            if (appointmentCard) {
                appointmentCard.classList.remove('scheduled', 'confirmed', 'upcoming');
                appointmentCard.classList.add('cancelled');

                const statusBadge = appointmentCard.querySelector('.status');
                if (statusBadge) {
                    statusBadge.textContent = 'Cancelled';
                    statusBadge.className = 'status cancelled';
                }

                const actionsDiv = appointmentCard.querySelector('.appointment-actions');
                if (actionsDiv) {
                    actionsDiv.innerHTML = '<button class="btn-small btn-primary" onclick="rebookAppointment(' + appointmentId + ')">Book Again</button>';
                }

                const notesDiv = appointmentCard.querySelector('.appointment-notes');
                if (notesDiv) {
                    notesDiv.innerHTML = '<strong>Reason:</strong> Cancelled by patient.';
                } else {
                    const newNotes = document.createElement('div');
                    newNotes.className = 'appointment-notes';
                    newNotes.innerHTML = '<strong>Reason:</strong> Cancelled by patient.';
                    appointmentCard.appendChild(newNotes);
                }
            }

            showNotification(result.message || 'Appointment cancelled successfully', 'success');

            // Refresh appointments from server to ensure consistency
            loadUserAppointments();
        } else {
            showNotification(result.message || 'Failed to cancel appointment', 'error');
        }
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showNotification('Failed to cancel appointment. Please try again.', 'error');
    }
}

