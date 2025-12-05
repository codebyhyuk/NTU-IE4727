<?php
// Doctor Registration Script
// This script creates doctor accounts in doctors (for professional info) tables

require_once 'config.php';

class DoctorRegistration
{
    private $pdo;

    public function __construct()
    {
        $this->pdo = DatabaseConfig::getConnection();
    }

    public function registerDoctor($data)
    {
        try {
            // Start transaction
            $this->pdo->beginTransaction();

            // Validate input
            $validation = $this->validateInput($data);
            if (!$validation['valid']) {
                throw new Exception($validation['message']);
            }

            // Check if email already exists in doctors table
            if ($this->emailExistsInDoctors($data['email'])) {
                throw new Exception("Email already exists in doctors database");
            }

            // Check if license number already exists
            if ($this->licenseExists($data['license_number'])) {
                throw new Exception("License number already exists");
            }

            // Hash password
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);

            // Insert into doctors table (for professional information)
            $doctorSql = "INSERT INTO doctors (first_name, last_name, email, password, role, phone, specialization, license_number, bio, image_url, created_at) 
                         VALUES (:first_name, :last_name, :email, :password, :role, :phone, :specialization, :license_number, :bio, :image_url, NOW())";

            $doctorStmt = $this->pdo->prepare($doctorSql);
            $doctorResult = $doctorStmt->execute([
                ':first_name' => $data['first_name'],
                ':last_name' => $data['last_name'],
                ':email' => $data['email'],
                ':password' => $hashedPassword,
                ':role' => $data['role'] ?? 'admin', // Default to 'admin' if not specified
                ':phone' => $data['phone'],
                ':specialization' => $data['specialization'],
                ':license_number' => $data['license_number'],
                ':bio' => $data['bio'] ?? '',
                ':image_url' => $data['image_url'] ?? 'assets/doc_placeholder.png'
            ]);

            if (!$doctorResult) {
                throw new Exception("Failed to create doctor profile");
            }

            $doctorId = $this->pdo->lastInsertId();

            // Insert into acc_credentials table with email, password, and role 'admin'
            $accSql = "INSERT INTO acc_credentials (email, password, role) 
                       VALUES (:email, :password, 'admin')";

            $accStmt = $this->pdo->prepare($accSql);
            $accResult = $accStmt->execute([
                ':email' => $data['email'],
                ':password' => $hashedPassword
            ]);

            if (!$accResult) {
                throw new Exception("Failed to create doctor credentials");
            }

            // Commit transaction
            $this->pdo->commit();

            return [
                'success' => true,
                'message' => 'Doctor registered successfully',
                'doctor_id' => $doctorId,
                'email' => $data['email'],
                'full_name' => $data['first_name'] . ' ' . $data['last_name']
            ];

        } catch (Exception $e) {
            // Rollback transaction on error
            $this->pdo->rollBack();
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    private function validateInput($data)
    {
        // Required fields
        $requiredFields = ['first_name', 'last_name', 'email', 'phone', 'specialization', 'license_number', 'password'];

        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                return ['valid' => false, 'message' => ucfirst(str_replace('_', ' ', $field)) . ' is required'];
            }
        }

        // Email validation
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return ['valid' => false, 'message' => 'Invalid email format'];
        }

        // Password validation
        if (strlen($data['password']) < 6) {
            return ['valid' => false, 'message' => 'Password must be at least 6 characters long'];
        }

        // Phone validation
        if (!preg_match('/^[0-9+\-\s()]{8,20}$/', $data['phone'])) {
            return ['valid' => false, 'message' => 'Invalid phone number format'];
        }

        // License number validation (basic)
        if (strlen($data['license_number']) < 5) {
            return ['valid' => false, 'message' => 'License number must be at least 5 characters'];
        }

        return ['valid' => true, 'message' => 'Valid'];
    }

    private function emailExistsInPatients($email)
    {
        $sql = "SELECT id FROM patients WHERE email = :email LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':email' => $email]);
        return $stmt->fetch() !== false;
    }

    private function emailExistsInDoctors($email)
    {
        $sql = "SELECT id FROM doctors WHERE email = :email LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':email' => $email]);
        return $stmt->fetch() !== false;
    }

    private function licenseExists($license)
    {
        $sql = "SELECT id FROM doctors WHERE license_number = :license LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':license' => $license]);
        return $stmt->fetch() !== false;
    }

    public function listDoctors()
    {
        $sql = "SELECT d.*, p.role as patient_role, p.created_at as account_created 
                FROM doctors d 
                LEFT JOIN patients p ON d.email = p.email 
                ORDER BY d.created_at DESC";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function deleteDoctor($doctorId)
    {
        try {
            $this->pdo->beginTransaction();

            // Get doctor email first
            $sql = "SELECT email FROM doctors WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $doctorId]);
            $doctor = $stmt->fetch();

            if (!$doctor) {
                throw new Exception("Doctor not found");
            }

            // Delete from doctors table
            $sql = "DELETE FROM doctors WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $doctorDeleted = $stmt->execute([':id' => $doctorId]);

            // Delete from patients table
            $sql = "DELETE FROM patients WHERE email = :email";
            $stmt = $this->pdo->prepare($sql);
            $patientDeleted = $stmt->execute([':email' => $doctor['email']]);

            $this->pdo->commit();

            return [
                'success' => true,
                'message' => 'Doctor deleted successfully'
            ];

        } catch (Exception $e) {
            $this->pdo->rollBack();
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
}

// Handle different request methods
$doctorReg = new DoctorRegistration();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
        exit;
    }

    if (isset($input['action']) && $input['action'] === 'delete') {
        $result = $doctorReg->deleteDoctor($input['doctor_id']);
        echo json_encode($result);
    } else {
        $result = $doctorReg->registerDoctor($input);
        echo json_encode($result);
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? 'form';

    if ($action === 'list') {
        header('Content-Type: application/json');
        $doctors = $doctorReg->listDoctors();
        echo json_encode(['success' => true, 'doctors' => $doctors]);
        exit;
    }

    // Show web interface
    ?>
    <!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Doctor Registration - KEKE Dental</title>
        <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet" />
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f8fafc;
            }

            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }

            h1 {
                color: #1e293b;
                border-bottom: 3px solid #3b82f6;
                padding-bottom: 10px;
                margin-bottom: 30px;
            }

            .form-section,
            .list-section {
                margin-bottom: 40px;
            }

            .form-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }

            .form-group {
                margin-bottom: 15px;
            }

            .form-group.full-width {
                grid-column: 1 / -1;
            }

            label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
                color: #374151;
            }

            input,
            select,
            textarea {
                width: 100%;
                padding: 12px;
                border: 2px solid #e5e7eb;
                border-radius: 6px;
                font-size: 14px;
                transition: border-color 0.3s;
            }

            input:focus,
            select:focus,
            textarea:focus {
                outline: none;
                border-color: #3b82f6;
            }

            textarea {
                resize: vertical;
                min-height: 80px;
            }

            .btn {
                padding: 12px 24px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.3s;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            .btn-primary {
                background: #3b82f6;
                color: white;
            }

            .btn-primary:hover {
                background: #2563eb;
            }

            .btn-secondary {
                background: #6b7280;
                color: white;
            }

            .btn-danger {
                background: #dc2626;
                color: white;
            }

            .btn-small {
                padding: 6px 12px;
                font-size: 12px;
            }

            .result {
                margin-top: 20px;
                padding: 15px;
                border-radius: 6px;
            }

            .success {
                background: #d1fae5;
                border: 1px solid #10b981;
                color: #065f46;
            }

            .error {
                background: #fee2e2;
                border: 1px solid #dc2626;
                color: #991b1b;
            }

            .doctors-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }

            .doctors-table th,
            .doctors-table td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #e5e7eb;
            }

            .doctors-table th {
                background: #f9fafb;
                font-weight: 600;
                color: #374151;
            }

            .loading {
                display: none;
                color: #6b7280;
            }

            .specializations {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                margin-top: 5px;
            }

            .spec-tag {
                background: #e0e7ff;
                color: #3730a3;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
            }
        </style>
    </head>

    <body>
        <div class="container">
            <h1><i class="ri-user-add-line"></i> Doctor Registration System</h1>

            <!-- Registration Form -->
            <div class="form-section">
                <h2>Register New Doctor</h2>
                <form id="doctorForm">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="first_name">First Name *</label>
                            <input type="text" name="first_name" id="first_name" required placeholder="Dr. John">
                        </div>
                        <div class="form-group">
                            <label for="last_name">Last Name *</label>
                            <input type="text" name="last_name" id="last_name" required placeholder="Smith">
                        </div>
                        <div class="form-group">
                            <label for="email">Email *</label>
                            <input type="email" name="email" id="email" required placeholder="john.smith@kekedental.com">
                        </div>
                        <div class="form-group">
                            <label for="phone">Phone *</label>
                            <input type="text" name="phone" id="phone" required placeholder="+1-555-0123">
                        </div>
                        <div class="form-group">
                            <label for="specialization">Specialization *</label>
                            <select name="specialization" id="specialization" required>
                                <option value="">Select Specialization</option>
                                <option value="General Dentistry">General Dentistry</option>
                                <option value="Oral Surgery">Oral Surgery</option>
                                <option value="Orthodontics">Orthodontics</option>
                                <option value="Pediatric Dentistry">Pediatric Dentistry</option>
                                <option value="Periodontics">Periodontics</option>
                                <option value="Endodontics">Endodontics</option>
                                <option value="Prosthodontics">Prosthodontics</option>
                                <option value="Oral Pathology">Oral Pathology</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="license_number">License Number *</label>
                            <input type="text" name="license_number" id="license_number" required
                                placeholder="DDS-2024-001">
                        </div>
                        <div class="form-group">
                            <label for="password">Password *</label>
                            <input type="password" name="password" id="password" required
                                placeholder="Minimum 6 characters">
                        </div>
                        <div class="form-group">
                            <label for="role">Role</label>
                            <select name="role" id="role">
                                <option value="admin" selected>Admin</option>
                                <option value="doctor">Doctor</option>
                                <option value="staff">Staff</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="date_of_birth">Date of Birth</label>
                            <input type="date" name="date_of_birth" id="date_of_birth">
                        </div>
                        <div class="form-group">
                            <label for="gender">Gender</label>
                            <select name="gender" id="gender">
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="image_url">Profile Image URL</label>
                            <input type="url" name="image_url" id="image_url"
                                placeholder="https://example.com/doctor-photo.jpg">
                        </div>
                        <div class="form-group full-width">
                            <label for="address">Address</label>
                            <input type="text" name="address" id="address" placeholder="Clinic address">
                        </div>
                        <div class="form-group full-width">
                            <label for="bio">Bio/Description</label>
                            <textarea name="bio" id="bio" placeholder="Brief professional biography..."></textarea>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary">
                        <i class="ri-user-add-line"></i>
                        Register Doctor
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="loadDoctors()">
                        <i class="ri-refresh-line"></i>
                        Refresh List
                    </button>
                </form>

                <div id="result"></div>
            </div>

            <!-- Doctors List -->
            <div class="list-section">
                <h2>Registered Doctors</h2>
                <div class="loading" id="loading">Loading doctors...</div>
                <table class="doctors-table" id="doctorsTable" style="display: none;">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Specialization</th>
                            <th>License</th>
                            <th>Role</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="doctorsBody">
                    </tbody>
                </table>
            </div>
        </div>

        <script>
            // Form submission
            document.getElementById('doctorForm').addEventListener('submit', async function (e) {
                e.preventDefault();

                const formData = new FormData(this);
                const data = {};
                for (let [key, value] of formData.entries()) {
                    data[key] = value;
                }

                const submitBtn = this.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="ri-loader-4-line"></i> Registering...';
                submitBtn.disabled = true;

                try {
                    const response = await fetch('register_doctor.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();
                    const resultDiv = document.getElementById('result');

                    if (result.success) {
                        resultDiv.innerHTML = `<div class="result success">
                            <i class="ri-check-line"></i> ${result.message}<br>
                            <strong>Doctor ID:</strong> ${result.doctor_id}<br>
                            <strong>Patient ID:</strong> ${result.patient_id}<br>
                            <strong>Email:</strong> ${result.email}
                        </div>`;
                        this.reset();
                        loadDoctors(); // Refresh the list
                    } else {
                        resultDiv.innerHTML = `<div class="result error">
                            <i class="ri-error-warning-line"></i> ${result.message}
                        </div>`;
                    }
                } catch (error) {
                    document.getElementById('result').innerHTML = `<div class="result error">
                        <i class="ri-error-warning-line"></i> Error: ${error.message}
                    </div>`;
                } finally {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });

            // Load doctors list
            async function loadDoctors() {
                const loading = document.getElementById('loading');
                const table = document.getElementById('doctorsTable');

                loading.style.display = 'block';
                table.style.display = 'none';

                try {
                    const response = await fetch('register_doctor.php?action=list');
                    const result = await response.json();

                    if (result.success) {
                        const tbody = document.getElementById('doctorsBody');
                        tbody.innerHTML = result.doctors.map(doctor => `
                            <tr>
                                <td><strong>Dr. ${doctor.first_name} ${doctor.last_name}</strong></td>
                                <td>${doctor.email}</td>
                                <td>${doctor.phone}</td>
                                <td><span class="spec-tag">${doctor.specialization}</span></td>
                                <td><code>${doctor.license_number}</code></td>
                                <td>
                                    <span style="color: ${doctor.role === 'admin' ? '#059669' : doctor.role === 'doctor' ? '#3b82f6' : '#f59e0b'}">
                                        ${doctor.role.charAt(0).toUpperCase() + doctor.role.slice(1)}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-danger btn-small" onclick="deleteDoctor(${doctor.id})">
                                        <i class="ri-delete-bin-line"></i> Delete
                                    </button>
                                </td>
                            </tr>
                        `).join('');

                        table.style.display = 'table';
                    }
                } catch (error) {
                    console.error('Error loading doctors:', error);
                } finally {
                    loading.style.display = 'none';
                }
            }

            // Delete doctor
            async function deleteDoctor(doctorId) {
                if (!confirm('Are you sure you want to delete this doctor? This will remove both the doctor profile and login account.')) {
                    return;
                }

                try {
                    const response = await fetch('register_doctor.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            action: 'delete',
                            doctor_id: doctorId
                        })
                    });

                    const result = await response.json();

                    if (result.success) {
                        alert('Doctor deleted successfully');
                        loadDoctors();
                    } else {
                        alert('Error: ' + result.message);
                    }
                } catch (error) {
                    alert('Error deleting doctor: ' + error.message);
                }
            }

            // Load doctors on page load
            loadDoctors();
        </script>
    </body>

    </html>
    <?php
}
?>