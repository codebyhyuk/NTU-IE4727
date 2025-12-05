<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PATCH, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config.php';

class CancelAppointment
{
    private $pdo;

    public function __construct()
    {
        $this->pdo = DatabaseConfig::getConnection();
    }

    public function cancelAppointment($data)
    {
        try {
            if (!isset($_SESSION['user_id'])) {
                return $this->errorResponse('User not logged in');
            }

            $userId = $_SESSION['user_id'];

            if (empty($data['appointment_id'])) {
                return $this->errorResponse('Appointment ID is required');
            }

            $appointmentId = (int)$data['appointment_id'];

            $sql = "SELECT id, patient_id, status FROM appointments WHERE id = :id LIMIT 1";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $appointmentId]);
            $appointment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$appointment) {
                return $this->errorResponse('Appointment not found');
            }

            if ((int)$appointment['patient_id'] !== (int)$userId) {
                return $this->errorResponse('Not authorized to cancel this appointment');
            }

            if ($appointment['status'] === 'cancelled') {
                return $this->errorResponse('Appointment already cancelled');
            }

            $updateSql = "UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = :id";
            $updateStmt = $this->pdo->prepare($updateSql);
            $result = $updateStmt->execute([':id' => $appointmentId]);

            if ($result) {
                return $this->successResponse('Appointment cancelled successfully', ['appointment_id' => $appointmentId]);
            }

            return $this->errorResponse('Failed to cancel appointment');

        } catch (PDOException $e) {
            error_log('Cancel appointment DB error: ' . $e->getMessage());
            return $this->errorResponse('Database error occurred');
        } catch (Exception $e) {
            error_log('Cancel appointment error: ' . $e->getMessage());
            return $this->errorResponse('An error occurred while cancelling appointment');
        }
    }

    private function successResponse($message, $data = null)
    {
        $response = ['success' => true, 'message' => $message];
        if ($data) $response['data'] = $data;
        return json_encode($response);
    }

    private function errorResponse($message)
    {
        return json_encode(['success' => false, 'message' => $message]);
    }
}

$cancel = new CancelAppointment();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'PATCH' || $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
        exit;
    }

    echo $cancel->cancelAppointment($input);
} else {
    echo json_encode(['success' => false, 'message' => 'Only PATCH or POST method allowed']);
}