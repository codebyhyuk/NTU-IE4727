<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';

class SessionManager
{
    private $pdo;

    public function __construct()
    {
        $this->pdo = DatabaseConfig::getConnection();
    }

    public function checkSession()
    {
        if (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in']) {
            return $this->errorResponse('Not logged in');
        }

        // Get fresh user data from database
        $userData = $this->getUserData($_SESSION['user_id']);
        if (!$userData) {
            $this->logout();
            return $this->errorResponse('User not found');
        }
        // Return the user data directly so caller can access role-specific fields
        $responseData = $userData;
        $responseData['login_time'] = $_SESSION['login_time'] ?? null;

        return $this->successResponse('Session valid', $responseData);
    }

    public function logout()
    {
        // Destroy session
        $_SESSION = array();
        if (isset($_COOKIE[session_name()])) {
            setcookie(session_name(), '', time() - 42000, '/');
        }
        session_destroy();

        return $this->successResponse('Logged out successfully');
    }

    public function getUserAppointments($userId)
    {
        try {
            $sql = "SELECT a.*, d.first_name as doctor_first_name, d.last_name as doctor_last_name, 
                           d.specialization 
                    FROM appointments a 
                    LEFT JOIN doctors d ON a.doctor_id = d.id 
                    WHERE a.patient_id = :user_id 
                    ORDER BY a.appointment_date DESC, a.appointment_time DESC";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':user_id' => $userId]);
            $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return $this->successResponse('Appointments retrieved', ['appointments' => $appointments]);

        } catch (PDOException $e) {
            error_log("Get appointments error: " . $e->getMessage());
            return $this->errorResponse('Failed to retrieve appointments');
        }
    }

    private function getUserData($userId)
    {
        // Determine whether the logged-in user is a doctor or patient
        // Prefer session flag set at login (user_type) but fall back to checking tables
        $isDoctor = (isset($_SESSION['user_type']) && $_SESSION['user_type'] === 'doctor');

        if ($isDoctor) {
            $sql = "SELECT id, first_name, last_name, email, phone, specialization, license_number, 'doctor' AS role
                    FROM doctors WHERE id = :user_id LIMIT 1";
        } else {
            $sql = "SELECT id, first_name, last_name, email, phone, date_of_birth, gender, address, 'patient' AS role
                    FROM patients WHERE id = :user_id LIMIT 1";
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
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

// Handle different actions
$sessionManager = new SessionManager();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? 'check';

    switch ($action) {
        case 'check':
            echo $sessionManager->checkSession();
            break;
        case 'logout':
            echo $sessionManager->logout();
            break;
        case 'appointments':
            if (isset($_SESSION['user_id'])) {
                echo $sessionManager->getUserAppointments($_SESSION['user_id']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Not logged in']);
            }
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Only GET method allowed']);
}
?>