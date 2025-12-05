<?php
// Database configuration
class DatabaseConfig
{
    private static $host = 'localhost';
    private static $username = 'root';
    private static $password = '';
    private static $database = 'keke_dental';
    private static $port = 3306;

    public static function getConnection()
    {
        try {
            $dsn = "mysql:host=" . self::$host . ";port=" . self::$port . ";dbname=" . self::$database . ";charset=utf8mb4";
            $pdo = new PDO($dsn, self::$username, self::$password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            return $pdo;
        } catch (PDOException $e) {
            error_log("Database connection error: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
    }

    // Load environment variables from .env file
    public static function loadEnv()
    {
        $envFile = __DIR__ . '/.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos($line, '#') === 0)
                    continue; // Skip comments
                if (strpos($line, '=') !== false) {
                    list($key, $value) = explode('=', $line, 2);
                    $key = trim($key);
                    $value = trim($value);

                    switch ($key) {
                        case 'DB_HOST':
                            self::$host = $value;
                            break;
                        case 'DB_USERNAME':
                            self::$username = $value;
                            break;
                        case 'DB_PASSWORD':
                            self::$password = $value;
                            break;
                        case 'DB_DATABASE':
                            self::$database = $value;
                            break;
                        case 'DB_PORT':
                            self::$port = (int) $value;
                            break;
                    }
                }
            }
        }
    }
}

// Load environment variables when this file is included
DatabaseConfig::loadEnv();
?>