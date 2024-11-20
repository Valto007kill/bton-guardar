<?php
$host = "localhost";
$user = "root";
$password = "";
$dbname = "guardar_gr";

//conexion creada
$conn = new mysqli($host, $user, $password, $dbname);

// Verificar conexión
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// Verificar si se recibió un archivo
if (isset($_FILES['audioFile'])) {
    $audioFile = $_FILES['audioFile'];

    // Nombre del archivo
    $fileName = basename($audioFile['name']);

    // Ruta temporal del archivo
    $fileTmpPath = $audioFile['tmp_name'];

    // Ruta donde se guardará el archivo
    $uploadDir = "uploads/";
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true); // Crear la carpeta si no existe
    }
    $uploadPath = $uploadDir . $fileName;

    // Mover el archivo a la carpeta de destino
    if (move_uploaded_file($fileTmpPath, $uploadPath)) {
        // Guardar la información del archivo en la base de datos
        $sql = "INSERT INTO audios (nombre_archivo, ruta) VALUES (?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ss", $fileName, $uploadPath);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Archivo guardado exitosamente."]);
        } else {
            echo json_encode(["success" => false, "message" => "Error al guardar en la base de datos."]);
        }

        $stmt->close();
    } else {
        echo json_encode(["success" => false, "message" => "Error al mover el archivo."]);
    }
} else {
    echo json_encode(["success" => false, "message" => "No se recibió ningún archivo."]);
}

$conn->close();

?>