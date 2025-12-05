<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';

class PatientRegistration
{
    private $pdo;

    public function __construct()
    {
        $this->pdo = DatabaseConfig::getConnection();
    }

    public function register($data)
    {
        try {
            // Validate input data
            $validation = $this->validateInput($data);
            if (!$validation['valid']) {
                return $this->errorResponse($validation['message']);
            }

            // Check if email already exists
            if ($this->emailExists($data['email'])) {
                return $this->errorResponse('Email already registered');
            }

            // Hash password
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);

            // Begin transaction to ensure both inserts succeed
            $this->pdo->beginTransaction();

            try {
                // Insert patient into database (role defaults to 'user')
                $sql = "INSERT INTO patients (first_name, last_name, email, phone, date_of_birth, gender, address, password, created_at) 
                        VALUES (:first_name, :last_name, :email, :phone, :date_of_birth, :gender, :address, :password, NOW())";

                $stmt = $this->pdo->prepare($sql);
                $result = $stmt->execute([
                    ':first_name' => $data['firstName'],
                    ':last_name' => $data['lastName'],
                    ':email' => $data['email'],
                    ':phone' => $data['phone'],
                    ':date_of_birth' => $data['dateOfBirth'],
                    ':gender' => $data['gender'],
                    ':address' => $data['address'],
                    ':password' => $hashedPassword
                ]);

                if (!$result) {
                    throw new Exception('Failed to insert patient');
                }

                $patientId = $this->pdo->lastInsertId();

                // Insert into acc_credentials table with email, password, and default role 'user'
                $acc_sql = "INSERT INTO acc_credentials (email, password, role) 
                            VALUES (:email, :password, 'user')";

                $acc_stmt = $this->pdo->prepare($acc_sql);
                $acc_result = $acc_stmt->execute([
                    ':email' => $data['email'],
                    ':password' => $hashedPassword
                ]);

                if (!$acc_result) {
                    throw new Exception('Failed to insert credentials');
                }

                // Commit transaction
                $this->pdo->commit();

                return $this->successResponse('Registration successful', [
                    'patient_id' => $patientId,
                    'email' => $data['email']
                ]);

            } catch (Exception $e) {
                // Rollback transaction on error
                $this->pdo->rollBack();
                throw $e;
            }

        } catch (PDOException $e) {
            error_log("Registration error: " . $e->getMessage());
            return $this->errorResponse('Database error occurred');
        } catch (Exception $e) {
            error_log("Registration error: " . $e->getMessage());
            return $this->errorResponse('An error occurred during registration');
        }
    }

    private function validateInput($data)
    {
        // Required fields
        $requiredFields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender', 'password'];

        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                return ['valid' => false, 'message' => ucfirst($field) . ' is required'];
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

        // Phone validation (basic)
        if (!preg_match('/^[0-9+\-\s()]{8,20}$/', $data['phone'])) {
            return ['valid' => false, 'message' => 'Invalid phone number format'];
        }

        // Date of birth validation
        $dob = DateTime::createFromFormat('Y-m-d', $data['dateOfBirth']);
        if (!$dob) {
            return ['valid' => false, 'message' => 'Invalid date of birth format'];
        }

        // Check if patient is at least 13 years old
        $today = new DateTime();
        $age = $today->diff($dob)->y;
        if ($age < 13) {
            return ['valid' => false, 'message' => 'Patients must be at least 13 years old'];
        }

        return ['valid' => true, 'message' => 'Valid'];
    }

    private function emailExists($email)
    {
        $sql = "SELECT id FROM patients WHERE email = :email LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':email' => $email]);
        return $stmt->fetch() !== false;
    }

    private function successResponse($message, $data = null)
    {
        $response = ['success' => true, 'message' => $message];
        if ($data) {
            $response['data'] = $data;
        }
        return json_encode($response);
    }

    private function errorResponse($message)
    {
        return json_encode(['success' => false, 'message' => $message]);
    }
}

// Handle POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
        exit;
    }

    $registration = new PatientRegistration();
    echo $registration->register($input);
} else {
    echo json_encode(['success' => false, 'message' => 'Only POST method allowed']);
}
?>