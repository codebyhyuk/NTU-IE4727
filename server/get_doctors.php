<?php
// Get Doctors API
// This script fetches all doctors from the database with their name and specialization

require_once 'config.php';

class DoctorAPI
{
    private $pdo;

    public function __construct()
    {
        try {
            $this->pdo = DatabaseConfig::getConnection();
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed']);
            exit;
        }
    }

    public function getAllDoctors()
    {
        try {
            $sql = "SELECT id, first_name, last_name, specialization, image_url
                    FROM doctors 
                    ORDER BY first_name, last_name";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            
            $doctors = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Format the doctors data
            $formattedDoctors = [];
            foreach ($doctors as $doctor) {
                $formattedDoctors[] = [
                    'id' => $doctor['id'],
                    'name' => $doctor['first_name'] . ' ' . $doctor['last_name'],
                    'specialization' => $doctor['specialization'],
                    'image_url' => $doctor['image_url'],
                    'display_text' => 'Dr. ' . $doctor['first_name'] . ' ' . $doctor['last_name'] . ' - ' . $doctor['specialization']
                ];
            }
            
            return [
                'success' => true,
                'doctors' => $formattedDoctors
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'error' => 'Failed to fetch doctors: ' . $e->getMessage()
            ];
        }
    }
}

// Handle the API request
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $api = new DoctorAPI();
    $result = $api->getAllDoctors();
    
    if ($result['success']) {
        http_response_code(200);
        echo json_encode($result);
    } else {
        http_response_code(500);
        echo json_encode($result);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>