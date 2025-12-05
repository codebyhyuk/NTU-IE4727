// Localization system for index.html
class LocalizationManager {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.init();
    }

    async init() {
        // Load saved language preference
        const savedLanguage = localStorage.getItem('preferredLanguage') || 'en';
        
        // Load initial translations
        await this.loadTranslations(savedLanguage);
        
        // Set up language selector
        this.setupLanguageSelector();
        
        // Apply initial translations
        this.applyTranslations();
        
        // Dispatch event that i18n is ready
        document.dispatchEvent(new CustomEvent('i18nReady'));
    }

    getTranslationPath(language) {
        // Get the current page's path relative to the src directory
        const currentPath = window.location.pathname;
        console.log(`Current path: ${currentPath}`);
        
        // Determine how many directories deep we are from src/
        let relativePath = '';
        
        if (currentPath.includes('/patient_dashboard/') || currentPath.includes('/doctor_dashboard/')) {
            // We're in a subdirectory (patient_dashboard or doctor_dashboard)
            relativePath = '../';
            console.log(`Detected subdirectory, using relative path: ${relativePath}`);
        } else {
            console.log(`In root directory, no relative path needed`);
        }
        // If we're in src/ root, no relative path needed
        
        const fullPath = `${relativePath}assets/i18n/${language}.json`;
        console.log(`Final translation path: ${fullPath}`);
        return fullPath;
    }

    async loadTranslations(language) {
        try {
            const translationPath = this.getTranslationPath(language);
            console.log(`Loading translations from: ${translationPath}`);
            
            const response = await fetch(translationPath);
            if (!response.ok) {
                throw new Error(`Failed to load ${language} translations from ${translationPath}`);
            }
            this.translations = await response.json();
            this.currentLanguage = language;
            
            // Update HTML lang attribute
            document.documentElement.lang = language;
            
            // Save preference
            localStorage.setItem('preferredLanguage', language);
            
            console.log(`Loaded ${language} translations`);
        } catch (error) {
            console.error('Error loading translations:', error);
            // Fallback to English if loading fails
            if (language !== 'en') {
                await this.loadTranslations('en');
            }
        }
    }

    setupLanguageSelector() {
        const selector = document.getElementById('language-select');
        if (selector) {
            // Set current value
            selector.value = this.currentLanguage;
            
            // Add change event listener
            selector.addEventListener('change', async (e) => {
                const newLanguage = e.target.value;
                await this.changeLanguage(newLanguage);
            });
        }
    }

    async changeLanguage(language) {
        // Show loading state
        this.showLoadingState();
        
        try {
            await this.loadTranslations(language);
            this.applyTranslations();
            
            // Update language selector
            const selector = document.getElementById('language-select');
            if (selector) {
                selector.value = language;
            }
            
            console.log(`Language changed to ${language}`);
            
            // Dispatch event that language has changed
            document.dispatchEvent(new CustomEvent('languageChanged', { detail: { language } }));
        } catch (error) {
            console.error('Error changing language:', error);
        } finally {
            this.hideLoadingState();
        }
    }

    // have to add the pointer to the data-i18n attributes in the html file for this to work
    applyTranslations() {
        // Navigation
        this.setText('[data-i18n="nav.home"]', this.translations.nav?.home);
        this.setText('[data-i18n="nav.doctors"]', this.translations.nav?.doctors);
        this.setText('[data-i18n="nav.book"]', this.translations.nav?.book);
        this.setText('[data-i18n="nav.register"]', this.translations.nav?.register);
        this.setText('[data-i18n="nav.login"]', this.translations.nav?.login);
        this.setText('[data-i18n="nav.logout"]', this.translations.nav?.logout);
        
        // Footer
        this.setText('[data-i18n="footer.copyright"]', this.translations.footer?.copyright);
        this.setText('[data-i18n="footer.privacy"]', this.translations.footer?.privacy);
        this.setText('[data-i18n="footer.terms"]', this.translations.footer?.terms);

        // Hero section
        this.setHTML('[data-i18n="hero.title"]', this.translations.hero?.title);
        this.setText('[data-i18n="hero.subtitle"]', this.translations.hero?.subtitle);
        this.setText('[data-i18n="hero.bookAppointment"]', this.translations.hero?.bookAppointment);
        this.setText('[data-i18n="hero.meetDoctors"]', this.translations.hero?.meetDoctors);
        this.setText('[data-i18n="hero.stats.happyPatients"]', this.translations.hero?.stats?.happyPatients);
        this.setText('[data-i18n="hero.stats.yearsExperience"]', this.translations.hero?.stats?.yearsExperience);
        this.setText('[data-i18n="hero.stats.emergencyCare"]', this.translations.hero?.stats?.emergencyCare);

        // Services section
        this.setText('[data-i18n="services.title"]', this.translations.services?.title);
        this.setText('[data-i18n="services.description"]', this.translations.services?.description);
        this.setText('[data-i18n="services.general.title"]', this.translations.services?.general?.title);
        this.setText('[data-i18n="services.general.description"]', this.translations.services?.general?.description);
        this.setText('[data-i18n="services.surgery.title"]', this.translations.services?.surgery?.title);
        this.setText('[data-i18n="services.surgery.description"]', this.translations.services?.surgery?.description);
        this.setText('[data-i18n="services.orthodontics.title"]', this.translations.services?.orthodontics?.title);
        this.setText('[data-i18n="services.orthodontics.description"]', this.translations.services?.orthodontics?.description);
        this.setText('[data-i18n="services.emergency.title"]', this.translations.services?.emergency?.title);
        this.setText('[data-i18n="services.emergency.description"]', this.translations.services?.emergency?.description);

        // Why Choose section
        this.setText('[data-i18n="whyChoose.title"]', this.translations.whyChoose?.title);
        this.setText('[data-i18n="whyChoose.expertTeam.title"]', this.translations.whyChoose?.expertTeam?.title);
        this.setText('[data-i18n="whyChoose.expertTeam.description"]', this.translations.whyChoose?.expertTeam?.description);
        this.setText('[data-i18n="whyChoose.modernTech.title"]', this.translations.whyChoose?.modernTech?.title);
        this.setText('[data-i18n="whyChoose.modernTech.description"]', this.translations.whyChoose?.modernTech?.description);
        this.setText('[data-i18n="whyChoose.flexibleScheduling.title"]', this.translations.whyChoose?.flexibleScheduling?.title);
        this.setText('[data-i18n="whyChoose.flexibleScheduling.description"]', this.translations.whyChoose?.flexibleScheduling?.description);
        this.setText('[data-i18n="whyChoose.scheduleVisit"]', this.translations.whyChoose?.scheduleVisit);
        this.setText('[data-i18n="whyChoose.stats.happyPatients"]', this.translations.whyChoose?.stats?.happyPatients);
        this.setText('[data-i18n="whyChoose.stats.yearsExperience"]', this.translations.whyChoose?.stats?.yearsExperience);
        this.setText('[data-i18n="whyChoose.stats.successRate"]', this.translations.whyChoose?.stats?.successRate);
        this.setText('[data-i18n="whyChoose.stats.emergencyCare"]', this.translations.whyChoose?.stats?.emergencyCare);

        // Doctors section
        this.setText('[data-i18n="doctors.title"]', this.translations.doctors?.title);
        this.setText('[data-i18n="doctors.subtitle"]', this.translations.doctors?.subtitle);
        this.setPlaceholder('[data-i18n="doctors.searchPlaceholder"]', this.translations.doctors?.searchPlaceholder);
        this.setText('[data-i18n="doctors.filterAll"]', this.translations.doctors?.filterAll);
        this.setText('[data-i18n="doctors.filterGeneral"]', this.translations.doctors?.filterGeneral);
        this.setText('[data-i18n="doctors.filterSurgery"]', this.translations.doctors?.filterSurgery);
        this.setText('[data-i18n="doctors.filterOrthodontics"]', this.translations.doctors?.filterOrthodontics);
        this.setText('[data-i18n="doctors.filterPediatric"]', this.translations.doctors?.filterPediatric);
        this.setText('[data-i18n="doctors.availableToday"]', this.translations.doctors?.availableToday);
        this.setText('[data-i18n="doctors.nextWeek"]', this.translations.doctors?.nextWeek);
        this.setText('[data-i18n="doctors.mainClinic"]', this.translations.doctors?.mainClinic);
        this.setText('[data-i18n="doctors.surgeryCenter"]', this.translations.doctors?.surgeryCenter);
        this.setText('[data-i18n="doctors.bookAppointment"]', this.translations.doctors?.bookAppointment);

        // Contact section
        this.setText('[data-i18n="contact.title"]', this.translations.contact?.title);
        this.setText('[data-i18n="contact.subtitle"]', this.translations.contact?.subtitle);
        this.setText('[data-i18n="contact.phone"]', this.translations.contact?.phone);
        this.setText('[data-i18n="contact.email"]', this.translations.contact?.email);
        this.setText('[data-i18n="contact.location"]', this.translations.contact?.location);
        this.setText('[data-i18n="contact.bookNow"]', this.translations.contact?.bookNow);

        // Login page
        this.setText('[data-i18n="login.title"]', this.translations.login?.title);
        this.setText('[data-i18n="login.subtitle"]', this.translations.login?.subtitle);
        this.setText('[data-i18n="login.emailLabel"]', this.translations.login?.emailLabel);
        this.setText('[data-i18n="login.passwordLabel"]', this.translations.login?.passwordLabel);
        this.setText('[data-i18n="login.rememberMe"]', this.translations.login?.rememberMe);
        this.setText('[data-i18n="login.forgotPassword"]', this.translations.login?.forgotPassword);
        this.setText('[data-i18n="login.signIn"]', this.translations.login?.signIn);
        this.setText('[data-i18n="login.noAccount"]', this.translations.login?.noAccount);
        this.setText('[data-i18n="login.signUpHere"]', this.translations.login?.signUpHere);
        
        // Handle placeholders for login form
        this.setPlaceholder('[data-i18n-placeholder="login.emailPlaceholder"]', this.translations.login?.emailPlaceholder);
        this.setPlaceholder('[data-i18n-placeholder="login.passwordPlaceholder"]', this.translations.login?.passwordPlaceholder);

        // Registration page
        this.setText('[data-i18n="registration.title"]', this.translations.registration?.title);
        this.setText('[data-i18n="registration.subtitle"]', this.translations.registration?.subtitle);
        this.setText('[data-i18n="registration.firstNameLabel"]', this.translations.registration?.firstNameLabel);
        this.setText('[data-i18n="registration.lastNameLabel"]', this.translations.registration?.lastNameLabel);
        this.setText('[data-i18n="registration.emailLabel"]', this.translations.registration?.emailLabel);
        this.setText('[data-i18n="registration.phoneLabel"]', this.translations.registration?.phoneLabel);
        this.setText('[data-i18n="registration.dobLabel"]', this.translations.registration?.dobLabel);
        this.setText('[data-i18n="registration.genderLabel"]', this.translations.registration?.genderLabel);
        this.setText('[data-i18n="registration.selectGender"]', this.translations.registration?.selectGender);
        this.setText('[data-i18n="registration.male"]', this.translations.registration?.male);
        this.setText('[data-i18n="registration.female"]', this.translations.registration?.female);
        this.setText('[data-i18n="registration.addressLabel"]', this.translations.registration?.addressLabel);
        this.setText('[data-i18n="registration.passwordLabel"]', this.translations.registration?.passwordLabel);
        this.setText('[data-i18n="registration.passwordRequirements"]', this.translations.registration?.passwordRequirements);
        this.setText('[data-i18n="registration.confirmPasswordLabel"]', this.translations.registration?.confirmPasswordLabel);
        this.setText('[data-i18n="registration.createAccount"]', this.translations.registration?.createAccount);
        this.setText('[data-i18n="registration.alreadyHaveAccount"]', this.translations.registration?.alreadyHaveAccount);
        this.setText('[data-i18n="registration.signInHere"]', this.translations.registration?.signInHere);
        this.setPlaceholder('[data-i18n-placeholder="registration.firstNamePlaceholder"]', this.translations.registration?.firstNamePlaceholder);
        this.setPlaceholder('[data-i18n-placeholder="registration.lastNamePlaceholder"]', this.translations.registration?.lastNamePlaceholder);
        this.setPlaceholder('[data-i18n-placeholder="registration.emailPlaceholder"]', this.translations.registration?.emailPlaceholder);
        this.setPlaceholder('[data-i18n-placeholder="registration.phonePlaceholder"]', this.translations.registration?.phonePlaceholder);
        this.setPlaceholder('[data-i18n-placeholder="registration.addressPlaceholder"]', this.translations.registration?.addressPlaceholder);
        this.setPlaceholder('[data-i18n-placeholder="registration.passwordPlaceholder"]', this.translations.registration?.passwordPlaceholder);
        this.setPlaceholder('[data-i18n-placeholder="registration.confirmPasswordPlaceholder"]', this.translations.registration?.confirmPasswordPlaceholder);

        // Patient Dashboard
        this.setText('[data-i18n="patientDashboard.welcome"]', this.translations.patientDashboard?.welcome);
        this.setText('[data-i18n="patientDashboard.subtitle"]', this.translations.patientDashboard?.subtitle);
        this.setText('[data-i18n="patientDashboard.doctorsContainerTitle"]', this.translations.patientDashboard?.doctorsContainerTitle);
        this.setText('[data-i18n="patientDashboard.specialitiesOptions.all"]', this.translations.patientDashboard?.specialitiesOptions?.all);
        this.setText('[data-i18n="patientDashboard.specialitiesOptions.general"]', this.translations.patientDashboard?.specialitiesOptions?.general);
        this.setText('[data-i18n="patientDashboard.specialitiesOptions.surgery"]', this.translations.patientDashboard?.specialitiesOptions?.surgery);
        this.setText('[data-i18n="patientDashboard.specialitiesOptions.orthodontics"]', this.translations.patientDashboard?.specialitiesOptions?.orthodontics);
        this.setText('[data-i18n="patientDashboard.specialitiesOptions.pediatric"]', this.translations.patientDashboard?.specialitiesOptions?.pediatric);
        this.setText('[data-i18n="patientDashboard.bookAppointment"]', this.translations.patientDashboard?.bookAppointment);
        this.setText('[data-i18n="patientDashboard.bookingHistory"]', this.translations.patientDashboard?.bookingHistory);
        this.setText('[data-i18n="patientDashboard.selectDoctor"]', this.translations.patientDashboard?.selectDoctor);
        this.setText('[data-i18n="patientDashboard.doctorSelect.choose"]', this.translations.patientDashboard?.doctorSelect.choose);
        this.setText('[data-i18n="patientDashboard.appointmentTypeForm"]', this.translations.patientDashboard?.appointmentTypeForm);
        this.setText('[data-i18n="patientDashboard.appointmentTypeSelect.choose"]', this.translations.patientDashboard?.appointmentTypeSelect?.choose);
        this.setText('[data-i18n="patientDashboard.appointmentTypeSelect.consultation"]', this.translations.patientDashboard?.appointmentTypeSelect?.consultation);
        this.setText('[data-i18n="patientDashboard.appointmentTypeSelect.cleaning"]', this.translations.patientDashboard?.appointmentTypeSelect?.cleaning);
        this.setText('[data-i18n="patientDashboard.appointmentTypeSelect.filling"]', this.translations.patientDashboard?.appointmentTypeSelect?.filling);
        this.setText('[data-i18n="patientDashboard.appointmentTypeSelect.extraction"]', this.translations.patientDashboard?.appointmentTypeSelect?.extraction);
        this.setText('[data-i18n="patientDashboard.appointmentTypeSelect.orthodontic"]', this.translations.patientDashboard?.appointmentTypeSelect?.orthodontic);
        this.setText('[data-i18n="patientDashboard.appointmentTypeSelect.emergency"]', this.translations.patientDashboard?.appointmentTypeSelect?.emergency);
        this.setText('[data-i18n="patientDashboard.preferredDateLabel"]', this.translations.patientDashboard?.preferredDateLabel);
        this.setText('[data-i18n="patientDashboard.preferredTimeLabel"]', this.translations.patientDashboard?.preferredTimeLabel);
        this.setText('[data-i18n="patientDashboard.selectedTime"]', this.translations.patientDashboard?.selectedTime);
        this.setText('[data-i18n="patientDashboard.additionalNotesLabel"]', this.translations.patientDashboard?.additionalNotesLabel);
        this.setText('[data-i18n="patientDashboard.bookAppointmentButton"]', this.translations.patientDashboard?.bookAppointmentButton);
        this.setText('[data-i18n="patientDashboard.emptyBookingHistory.title"]', this.translations.patientDashboard?.emptyBookingHistory?.title);
        this.setText('[data-i18n="patientDashboard.emptyBookingHistory.subtitle"]', this.translations.patientDashboard?.emptyBookingHistory?.subtitle);
        this.setText('[data-i18n="patientDashboard.emptyBookingHistory.button"]', this.translations.patientDashboard?.emptyBookingHistory?.button);
        this.setPlaceholder('[data-i18n-placeholder="patientDashboard.searchDoctorsPlaceholder"]', this.translations.patientDashboard?.searchDoctorsPlaceholder);
        this.setPlaceholder('[data-i18n-placeholder="patientDashboard.additionalNotesLabelPlaceholder"]', this.translations.patientDashboard?.additionalNotesLabelPlaceholder);

        // Doctor Dashboard
        this.setText('[data-i18n="doctorDashboard.welcome"]', this.translations.doctorDashboard?.welcome);
        this.setText('[data-i18n="doctorDashboard.subtitle"]', this.translations.doctorDashboard?.subtitle);
        this.setText('[data-i18n="doctorDashboard.calendarLegend.Scheduled"]', this.translations.doctorDashboard?.calendarLegend?.Scheduled);
        this.setText('[data-i18n="doctorDashboard.calendarLegend.Confirmed"]', this.translations.doctorDashboard?.calendarLegend?.Confirmed);
        this.setText('[data-i18n="doctorDashboard.calendarLegend.Completed"]', this.translations.doctorDashboard?.calendarLegend?.Completed);
        this.setText('[data-i18n="doctorDashboard.calendarLegend.Cancelled"]', this.translations.doctorDashboard?.calendarLegend?.Cancelled);
        this.setText('[data-i18n="doctorDashboard.appointmentsSection.title"]', this.translations.doctorDashboard?.appointmentsSection?.title);
        this.setText('[data-i18n="doctorDashboard.appointmentsSection.statusFilter.all"]', this.translations.doctorDashboard?.appointmentsSection?.statusFilter?.all);
        this.setText('[data-i18n="doctorDashboard.appointmentsSection.statusFilter.scheduled"]', this.translations.doctorDashboard?.appointmentsSection?.statusFilter?.scheduled);
        this.setText('[data-i18n="doctorDashboard.appointmentsSection.statusFilter.confirmed"]', this.translations.doctorDashboard?.appointmentsSection?.statusFilter?.confirmed);
        this.setText('[data-i18n="doctorDashboard.appointmentsSection.statusFilter.completed"]', this.translations.doctorDashboard?.appointmentsSection?.statusFilter?.completed);
        this.setText('[data-i18n="doctorDashboard.appointmentsSection.statusFilter.cancelled"]', this.translations.doctorDashboard?.appointmentsSection?.statusFilter?.cancelled);
        this.setText('[data-i18n="doctorDashboard.appointmentsSection.dateFilter.all"]', this.translations.doctorDashboard?.appointmentsSection?.dateFilter?.all);
        this.setText('[data-i18n="doctorDashboard.appointmentsSection.dateFilter.today"]', this.translations.doctorDashboard?.appointmentsSection?.dateFilter?.today);
        this.setText('[data-i18n="doctorDashboard.appointmentsSection.dateFilter.upcoming"]', this.translations.doctorDashboard?.appointmentsSection?.dateFilter?.upcoming);
        this.setText('[data-i18n="doctorDashboard.appointmentsSection.dateFilter.past"]', this.translations.doctorDashboard?.appointmentsSection?.dateFilter?.past);

        // Update dynamic content that depends on user data
        this.updateUserSpecificContent();
    }

    updateUserSpecificContent() {
        // Update welcome message in patient dashboard if user data is available
        if (typeof currentUser !== 'undefined' && currentUser && currentUser.first_name) {
            const dashboardHeader = document.querySelector('.dashboard-header h1');
            if (dashboardHeader && this.translations.patientDashboard?.welcome) {
                const welcomeText = this.translations.patientDashboard.welcome.replace('{{name}}', currentUser.first_name);
                dashboardHeader.textContent = welcomeText;
            }
        }
        
        // Update welcome message in doctor dashboard if user data is available
        // Check if we're on doctor dashboard by looking for doctor-specific elements
        const doctorElements = document.querySelector('[data-i18n="doctorDashboard.welcome"]');
        if (doctorElements && typeof window.doctorCurrentUser !== 'undefined' && window.doctorCurrentUser && window.doctorCurrentUser.last_name) {
            const dashboardHeader = document.querySelector('.dashboard-header h1');
            if (dashboardHeader && this.translations.doctorDashboard?.welcome) {
                const welcomeText = this.translations.doctorDashboard.welcome.replace('{{name}}', window.doctorCurrentUser.last_name);
                dashboardHeader.textContent = welcomeText;
            }
        }
    }

    setTextWithVars(selector, text, variables = {}) {
        if (!text) return;
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            let finalText = text;
            // Replace variables like {{name}} with actual values
            Object.keys(variables).forEach(key => {
                const placeholder = `{{${key}}}`;
                finalText = finalText.replace(new RegExp(placeholder, 'g'), variables[key]);
            });
            element.textContent = finalText;
        });
    }

    setText(selector, text) {
        if (!text) return;
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.textContent = text;
        });
    }

    setHTML(selector, html) {
        if (!html) return;
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.innerHTML = html;
        });
    }

    setPlaceholder(selector, text) {
        if (!text) return;
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.placeholder = text;
        });
    }

    showLoadingState() {
        // Add a subtle loading indicator
        document.body.style.opacity = '0.8';
    }

    hideLoadingState() {
        document.body.style.opacity = '1';
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }
}

// Initialize localization when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.i18n = new LocalizationManager();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocalizationManager;
}