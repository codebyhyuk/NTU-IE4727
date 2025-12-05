<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config.php';

class DoctorAppointments
{
    private $pdo;

    public function __construct()
    {
        $this->pdo = DatabaseConfig::getConnection();
    }

    public function getAppointmentsForDoctor($doctorId)
    {
        try {
            $sql = "SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name
                    FROM appointments a
                    LEFT JOIN patients p ON a.patient_id = p.id
                    WHERE a.doctor_id = :doctor_id
                    ORDER BY a.appointment_date ASC, a.appointment_time ASC";

            error_log('Executing SQL query for doctor: ' . $doctorId);
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':doctor_id' => $doctorId]);
            $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log('Found ' . count($appointments) . ' appointments for doctor ' . $doctorId);

            return json_encode(['success' => true, 'appointments' => $appointments]);
        } catch (PDOException $e) {
            error_log('Get doctor appointments error: ' . $e->getMessage());
            return json_encode(['success' => false, 'message' => 'Failed to retrieve appointments']);
        }
    }
}

// Require logged-in doctor
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

$doctorId = $_SESSION['user_id'];
error_log('Getting appointments for doctor ID: ' . $doctorId);

$manager = new DoctorAppointments();
echo $manager->getAppointmentsForDoctor($doctorId);
