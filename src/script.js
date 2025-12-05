// Mobile nav
const navLinks = document.getElementById('navLinks');

// Smooth scroll for same-page links
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        
        // Handle Home button click (#home) - scroll to top
        if (id === '#home') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            navLinks?.classList.remove('open');
            return;
        }
        
        // Handle Doctors button click (#doctors) - scroll to top of doctors-header including padding
        if (id === '#doctors') {
            e.preventDefault();
            const doctorsHeader = document.getElementById('doctors-header');
            if (doctorsHeader) {
                const headerRect = doctorsHeader.getBoundingClientRect();
                const headerTop = window.pageYOffset + headerRect.top;
                const scrollPosition = headerTop - 80;
                window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
            }
            navLinks?.classList.remove('open');
            return;
        }
        
        if (id === '#book') {
            e.preventDefault();
            window.scrollTo({
                top: document.documentElement.scrollHeight - window.innerHeight,
                behavior: 'smooth'
            });
            navLinks?.classList.remove('open');
            return;
        }
    });
});


// Simple counter animation for hero stats
const counters = document.querySelectorAll('.stat-value[data-count]');
const runCounter = (el) => {
    const target = +el.dataset.count;
    const duration = 1000;
    const start = performance.now();
    const step = (t) => {
        const p = Math.min((t - start) / duration, 1);
        const val = Math.floor(target * p);
        el.textContent = target === 24 ? `${val}/7` : `${val}+`;
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
};
const onView = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting) {
        runCounter(e.target);
        onView.unobserve(e.target);
        }
    });
}, { threshold: .6 });
counters.forEach(c => onView.observe(c));

// Registration form functionality
const registrationForm = document.getElementById('registrationForm');
if (registrationForm) {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    // Password validation
    function validatePassword(password) {
        return password.length >= 8;
    }
    
    // Password match validation
    function validatePasswordMatch(password, confirmPassword) {
        return password === confirmPassword;
    }
    
    // Real-time password validation
    passwordInput?.addEventListener('input', function() {
        const password = this.value;
        const requirementsEl = this.parentNode.parentNode.querySelector('.password-requirements');
        
        if (password.length > 0) {
            if (validatePassword(password)) {
                requirementsEl.style.color = '#059669';
                requirementsEl.textContent = '✓ Password meets requirements';
            } else {
                requirementsEl.style.color = '#dc2626';
                requirementsEl.textContent = 'Must be at least 8 characters long';
            }
        } else {
            requirementsEl.style.color = '#6b7280';
            requirementsEl.textContent = 'Must be at least 8 characters long';
        }
        
        // Recheck confirm password if it has a value
        if (confirmPasswordInput?.value) {
            validateConfirmPassword();
        }
    });
    
    // Confirm password validation
    function validateConfirmPassword() {
        const password = passwordInput?.value || '';
        const confirmPassword = confirmPasswordInput?.value || '';
        
        if (confirmPassword.length > 0) {
            if (validatePasswordMatch(password, confirmPassword)) {
                confirmPasswordInput.style.borderColor = '#059669';
            } else {
                confirmPasswordInput.style.borderColor = '#dc2626';
            }
        } else {
            confirmPasswordInput.style.borderColor = '#d1d5db';
        }
    }
    
    confirmPasswordInput?.addEventListener('input', validateConfirmPassword);
    
    // Form submission
    registrationForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const agreeTerms = formData.get('agreeTerms');
        
        // Validate password
        if (!validatePassword(password)) {
            alert('Password must be at least 8 characters long.');
            return;
        }
        
        // Validate password match
        if (!validatePasswordMatch(password, confirmPassword)) {
            alert('Passwords do not match.');
            return;
        }
                
        // Prepare data for PHP backend
        const registrationData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            dateOfBirth: formData.get('dateOfBirth'),
            gender: formData.get('gender'),
            address: formData.get('address') || '',
            password: password
        };
        
        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating Account...';
        submitBtn.disabled = true;
        
        try {
            // Send registration data to PHP backend
            const response = await fetch('../server/register_patient.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registrationData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Account created successfully! Welcome to KEKE Dental!');
                // Redirect to login page after successful registration
                window.location.href = 'login.html';
            } else {
                alert('Registration failed: ' + result.message);
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('An error occurred during registration. Please try again.');
        } finally {
            // Reset button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Login form functionality
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const signinBtn = document.querySelector('.signin-btn');
    
    // Email validation
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Real-time email validation
    emailInput?.addEventListener('input', function() {
        const email = this.value;
        
        if (email.length > 0) {
            if (validateEmail(email)) {
                this.style.borderColor = '#059669';
            } else {
                this.style.borderColor = '#dc2626';
            }
        } else {
            this.style.borderColor = '#d1d5db';
        }
        
        updateSigninButton();
    });
    
    // Real-time password validation
    passwordInput?.addEventListener('input', function() {
        updateSigninButton();
    });
    
    // Update signin button state
    function updateSigninButton() {
        const email = emailInput?.value || '';
        const password = passwordInput?.value || '';
        
        if (email.length > 0 && password.length > 0 && validateEmail(email)) {
            signinBtn.disabled = false;
            signinBtn.style.background = '#3b82f6';
        } else {
            signinBtn.disabled = true;
            signinBtn.style.background = '#9ca3af';
        }
    }
    
    // Initial button state
    updateSigninButton();
    
    // Form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const email = formData.get('email');
        const password = formData.get('password');
        const rememberMe = formData.get('rememberMe');
        
        // Validate email
        if (!validateEmail(email)) {
            alert('Please enter a valid email address.');
            return;
        }
        
        // Validate password
        if (password.length === 0) {
            alert('Please enter your password.');
            return;
        }
        
        // Show loading state
        signinBtn.textContent = 'Signing in...';
        signinBtn.disabled = true;
        
        try {
            // Send login request to server
            const response = await fetch('../server/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });
            
            const result = await response.json();
            console.log('Login response:', result);
            
            if (result.success) {
                // Handle remember me functionality
                if (rememberMe) {
                    localStorage.setItem('rememberMe', 'true');
                    localStorage.setItem('userEmail', email);
                } else {
                    localStorage.removeItem('rememberMe');
                    localStorage.removeItem('userEmail');
                }
                
                // Store user data in localStorage for easy access
                localStorage.setItem('userData', JSON.stringify(result.data));
                
                alert('Login successful! Welcome back to KEKE Dental!');
                
                // Redirect based on user role
                if (result.data.role === 'admin') {
                    window.location.href = 'doctor_dashboard/doctor.html'; 
                } else {
                    window.location.href = 'patient_dashboard/patient.html';
                }
            } else {
                alert('Login failed: ' + result.message);
                // Reset button state
                signinBtn.textContent = 'Sign In';
                signinBtn.disabled = false;
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred during login. Please try again.');
            // Reset button state
            signinBtn.textContent = 'Sign In';
            signinBtn.disabled = false;
        }
    });
    
    // Check if user should be remembered
    if (localStorage.getItem('rememberMe') === 'true') {
        const savedEmail = localStorage.getItem('userEmail');
        if (savedEmail && emailInput) {
            emailInput.value = savedEmail;
            document.getElementById('rememberMe').checked = true;
            updateSigninButton();
        }
    }
}

// Doctors section functionality
const doctorSearch = document.getElementById('doctorSearch');
const specialtyFilter = document.getElementById('specialtyFilter');
const doctorCards = document.querySelectorAll('.doctor-card');

// Search and filter functionality
function filterDoctors() {
    const searchTerm = doctorSearch?.value.toLowerCase() || '';
    const selectedSpecialty = specialtyFilter?.value || 'all';
    
    doctorCards.forEach(card => {
        const doctorName = card.querySelector('.doctor-name')?.textContent.toLowerCase() || '';
        const doctorSpecialty = card.querySelector('.doctor-specialty')?.textContent.toLowerCase() || '';
        const cardSpecialty = card.getAttribute('data-specialty') || '';
        
        // Check if card matches search term
        const matchesSearch = doctorName.includes(searchTerm) || 
                             doctorSpecialty.includes(searchTerm);
        
        // Check if card matches selected specialty
        const matchesSpecialty = selectedSpecialty === 'all' || 
                                cardSpecialty === selectedSpecialty;
        
        // Show/hide card based on filters
        if (matchesSearch && matchesSpecialty) {
            card.style.display = 'block';
            card.style.animation = 'fadeIn 0.3s ease-in';
        } else {
            card.style.display = 'none';
        }
    });
}

// Add event listeners for search and filter
doctorSearch?.addEventListener('input', filterDoctors);
specialtyFilter?.addEventListener('change', filterDoctors);

// Book appointment button functionality
document.querySelectorAll('.book-appointment-btn').forEach(btn => {
    btn.addEventListener('click', function() {        
        alert(`Please login to book an appointment.`);
    });
});
