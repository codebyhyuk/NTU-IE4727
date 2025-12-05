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

require_once __DIR__ . '/../config.php';

class AppointmentBooking
{
    private $pdo;

    public function __construct()
    {
        $this->pdo = DatabaseConfig::getConnection();
    }

    public function bookAppointment($data)
    {
        try {
            // Check if user is logged in
            if (!isset($_SESSION['user_id'])) {
                return $this->errorResponse('User not logged in');
            }

            $userId = $_SESSION['user_id'];

            // Validate input data
            $validation = $this->validateInput($data);
            if (!$validation['valid']) {
                return $this->errorResponse($validation['message']);
            }

            // Check if the time slot is available
            if (!$this->isTimeSlotAvailable($data['doctor'], $data['date'], $data['time'])) {
                return $this->errorResponse('Selected time slot is not available');
            }

            // Insert appointment into database
            $sql = "INSERT INTO appointments (patient_id, doctor_id, appointment_type, appointment_date, appointment_time, notes, status, created_at) 
                    VALUES (:patient_id, :doctor_id, :appointment_type, :appointment_date, :appointment_time, :notes, 'scheduled', NOW())";

            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute([
                ':patient_id' => $userId,
                ':doctor_id' => $data['doctor'],
                ':appointment_type' => $data['appointmentType'] ?? 'consultation',
                ':appointment_date' => $data['date'],
                ':appointment_time' => $data['time'],
                ':notes' => $data['notes'] ?? ''
            ]);

            if ($result) {
                $appointmentId = $this->pdo->lastInsertId();

                // Get appointment details with doctor info
                $appointmentDetails = $this->getAppointmentDetails($appointmentId);

                return $this->successResponse('Appointment booked successfully', [
                    'appointment_id' => $appointmentId,
                    'appointment' => $appointmentDetails
                ]);
            } else {
                return $this->errorResponse('Failed to book appointment');
            }

        } catch (PDOException $e) {
            error_log("Booking error: " . $e->getMessage());
            return $this->errorResponse('Database error occurred');
        } catch (Exception $e) {
            error_log("Booking error: " . $e->getMessage());
            return $this->errorResponse('An error occurred while booking appointment');
        }
    }

    private function validateInput($data)
    {
        // Required fields
        $requiredFields = ['doctor', 'appointmentType', 'date', 'time'];

        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                return ['valid' => false, 'message' => ucfirst($field) . ' is required'];
            }
        }

        // Validate appointment type
        $validTypes = ['consultation', 'cleaning', 'filling', 'extraction', 'orthodontic', 'emergency'];
        if (!in_array($data['appointmentType'], $validTypes)) {
            return ['valid' => false, 'message' => 'Invalid appointment type'];
        }

        // Date validation
        $appointmentDate = DateTime::createFromFormat('Y-m-d', $data['date']);
        if (!$appointmentDate) {
            return ['valid' => false, 'message' => 'Invalid date format'];
        }

        // Check if date is not in the past (allow today)
        $today = new DateTime();
        $today->setTime(0, 0, 0); // Set to beginning of day
        if ($appointmentDate < $today) {
            return ['valid' => false, 'message' => 'Cannot book appointments in the past'];
        }

        // Time validation
        if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $data['time'])) {
            return ['valid' => false, 'message' => 'Invalid time format'];
        }

        return ['valid' => true, 'message' => 'Valid'];
    }

    private function isTimeSlotAvailable($doctorId, $date, $time)
    {
        $sql = "SELECT id FROM appointments 
                WHERE doctor_id = :doctor_id 
                AND appointment_date = :date 
                AND appointment_time = :time 
                AND status NOT IN ('cancelled') 
                LIMIT 1";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':doctor_id' => $doctorId,
            ':date' => $date,
            ':time' => $time
        ]);

        return $stmt->fetch() === false; // True if no existing appointment found
    }

    private function getAppointmentDetails($appointmentId)
    {
        $sql = "SELECT a.*, d.first_name as doctor_first_name, d.last_name as doctor_last_name, 
                       d.specialization, p.first_name as patient_first_name, p.last_name as patient_last_name
                FROM appointments a
                LEFT JOIN doctors d ON a.doctor_id = d.id
                LEFT JOIN patients p ON a.patient_id = p.id
                WHERE a.id = :appointment_id";

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

// Handle POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
        exit;
    }

    $booking = new AppointmentBooking();
    echo $booking->bookAppointment($input);
} else {
    echo json_encode(['success' => false, 'message' => 'Only POST method allowed']);
}
?>