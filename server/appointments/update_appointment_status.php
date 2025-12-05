<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config.php';

class DoctorAppointmentManager
{
    private $pdo;

    public function __construct()
    {
        $this->pdo = DatabaseConfig::getConnection();
    }

    public function updateAppointmentStatus($data)
    {
        try {
            // Check if user is logged in
            if (!isset($_SESSION['logged_in']) || !$_SESSION['logged_in']) {
                return $this->errorResponse('Not logged in');
            }

            // Validate input
            $validation = $this->validateInput($data);
            if (!$validation['valid']) {
                return $this->errorResponse($validation['message']);
            }

            $appointmentId = $data['appointment_id'];
            $newStatus = $data['status'];

            // Verify that the appointment belongs to the logged-in doctor
            if (!$this->verifyDoctorOwnership($appointmentId)) {
                return $this->errorResponse('You can only update your own appointments');
            }

            // Update the appointment status
            $sql = "UPDATE appointments 
                    SET status = :status, updated_at = NOW() 
                    WHERE id = :appointment_id";

            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute([
                ':status' => $newStatus,
                ':appointment_id' => $appointmentId
            ]);

            if ($result && $stmt->rowCount() > 0) {
                // Get updated appointment details for response
                $appointmentDetails = $this->getAppointmentDetails($appointmentId);
                
                return $this->successResponse(
                    'Appointment status updated successfully',
                    ['appointment' => $appointmentDetails]
                );
            } else {
                return $this->errorResponse('Failed to update appointment status');
            }

        } catch (PDOException $e) {
            error_log("Update appointment status error: " . $e->getMessage());
            return $this->errorResponse('Database error occurred');
        } catch (Exception $e) {
            error_log("Update appointment status error: " . $e->getMessage());
            return $this->errorResponse('An error occurred while updating appointment status');
        }
    }

    private function validateInput($data)
    {
        // Check required fields
        if (empty($data['appointment_id'])) {
            return ['valid' => false, 'message' => 'Appointment ID is required'];
        }

        if (empty($data['status'])) {
            return ['valid' => false, 'message' => 'Status is required'];
        }

        // Validate status value
        $allowedStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled'];
        if (!in_array($data['status'], $allowedStatuses)) {
            return ['valid' => false, 'message' => 'Invalid status value'];
        }

        // Validate appointment ID is numeric
        if (!is_numeric($data['appointment_id'])) {
            return ['valid' => false, 'message' => 'Invalid appointment ID'];
        }

        return ['valid' => true, 'message' => 'Valid'];
    }

    private function verifyDoctorOwnership($appointmentId)
    {
        $sql = "SELECT id FROM appointments 
                WHERE id = :appointment_id AND doctor_id = :doctor_id 
                LIMIT 1";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':appointment_id' => $appointmentId,
            ':doctor_id' => $_SESSION['user_id']
        ]);

        return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
    }

    private function getAppointmentDetails($appointmentId)
    {
        $sql = "SELECT a.*, 
                       p.first_name as patient_first_name, 
                       p.last_name as patient_last_name,
                       p.phone as patient_phone
                FROM appointments a
                LEFT JOIN patients p ON a.patient_id = p.id
                WHERE a.id = :appointment_id
                LIMIT 1";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':appointment_id' => $appointmentId]);
        
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

// Handle PATCH request
if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
        exit;
    }

    $manager = new DoctorAppointmentManager();
    echo $manager->updateAppointmentStatus($input);
} else {
    echo json_encode(['success' => false, 'message' => 'Only PATCH method allowed']);
}
?>