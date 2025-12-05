<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';

class UserAuthentication
{
    private $pdo;

    public function __construct()
    {
        $this->pdo = DatabaseConfig::getConnection();
    }

    public function login($data)
    {
        try {
            // Validate input data
            $validation = $this->validateInput($data);
            if (!$validation['valid']) {
                return $this->errorResponse($validation['message']);
            }

            // Get user from database
            $user = $this->getUserByEmail($data['email']);
            if (!$user) {
                return $this->errorResponse('Invalid email or password');
            }

            // Verify password
            if (!password_verify($data['password'], $user['password'])) {
                return $this->errorResponse('Invalid email or password');
            }

            // Create session
            $this->createUserSession($user);

            // Prepare response data based on user role
            $responseData = [
                'user_id' => $user['id'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'email' => $user['email'],
                'role' => $user['role']
            ];

            // Add role-specific data and redirect URL
            if ($user['role'] === 'admin') {
                $responseData['specialization'] = $user['specialization'] ?? '';
                $responseData['license_number'] = $user['license_number'] ?? '';
                $responseData['redirect_url'] = '../doctor_dashboard/doctor.html'; // Doctor dashboard
            } else {
                $responseData['phone'] = $user['phone'] ?? '';
                $responseData['date_of_birth'] = $user['date_of_birth'] ?? '';
                $responseData['gender'] = $user['gender'] ?? '';
                $responseData['address'] = $user['address'] ?? '';
                $responseData['redirect_url'] = '../patient_dashboard/patient.html'; // Patient dashboard
            }

            // Return success with user data (excluding sensitive info)
            return $this->successResponse('Login successful', $responseData);

        } catch (PDOException $e) {
            error_log("Login error: " . $e->getMessage());
            return $this->errorResponse('Database error occurred');
        } catch (Exception $e) {
            error_log("Login error: " . $e->getMessage());
            return $this->errorResponse('An error occurred during login');
        }
    }

    private function validateInput($data)
    {
        // Required fields
        if (empty($data['email']) || empty($data['password'])) {
            return ['valid' => false, 'message' => 'Email and password are required'];
        }

        // Email validation
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return ['valid' => false, 'message' => 'Invalid email format'];
        }

        return ['valid' => true, 'message' => 'Valid'];
    }

    private function getUserByEmail($email)
    {
        // First, get credentials from acc_credentials table
        $credSql = "SELECT email, password, role FROM acc_credentials WHERE email = :email LIMIT 1";
        $credStmt = $this->pdo->prepare($credSql);
        $credStmt->execute([':email' => $email]);
        $credentials = $credStmt->fetch(PDO::FETCH_ASSOC);

        if (!$credentials) {
            return null;
        }

        // Get user details based on role
        if ($credentials['role'] === 'admin') {
            // Get doctor details
            $userSql = "SELECT id, first_name, last_name, email, phone, specialization, license_number 
                        FROM doctors WHERE email = :email LIMIT 1";
        } else {
            // Get patient details
            $userSql = "SELECT id, first_name, last_name, email, phone, date_of_birth, gender, address 
                        FROM patients WHERE email = :email LIMIT 1";
        }

        $userStmt = $this->pdo->prepare($userSql);
        $userStmt->execute([':email' => $email]);
        $userDetails = $userStmt->fetch(PDO::FETCH_ASSOC);

        if (!$userDetails) {
            return null;
        }

        // Merge credentials with user details
        return array_merge($userDetails, [
            'password' => $credentials['password'],
            'role' => $credentials['role']
        ]);
    }

    private function createUserSession($user)
    {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['logged_in'] = true;
        $_SESSION['login_time'] = time();

        // Store role-specific data in session
        if ($user['role'] === 'admin') {
            $_SESSION['user_type'] = 'doctor';
            $_SESSION['specialization'] = $user['specialization'] ?? '';
            $_SESSION['license_number'] = $user['license_number'] ?? '';
        } else {
            $_SESSION['user_type'] = 'patient';
            $_SESSION['phone'] = $user['phone'] ?? '';
            $_SESSION['date_of_birth'] = $user['date_of_birth'] ?? '';
            $_SESSION['gender'] = $user['gender'] ?? '';
            $_SESSION['address'] = $user['address'] ?? '';
        }
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

    $auth = new UserAuthentication();
    echo $auth->login($input);
} else {
    echo json_encode(['success' => false, 'message' => 'Only POST method allowed']);
}
?>