// Declaración de variables para almacenar los objetos y datos utilizados en la grabación
let mediaRecorder; // Objeto para grabar el audio del micrófono
let audioContext; // Contexto de audio para procesar señales de audio
let audioInput; // Fuente de entrada de audio
let recorder; // Procesador de audio para manejar los datos del flujo de audio
let recordedChunks = []; // Arreglo para almacenar fragmentos de audio grabados
let startTime; // Marca de tiempo cuando comienza la grabación
let recordingInterval; // Intervalo para actualizar la duración de la grabación

// Referencia a elementos HTML para interactuar con la interfaz
const startBtn = document.getElementById('startBtn'); // Botón para iniciar la grabación
const stopBtn = document.getElementById('stopBtn'); // Botón para detener la grabación
const saveBtn = document.getElementById('saveBtn'); // Botón para guardar la grabación
const audioPlayback = document.getElementById('audioPlayback'); // Elemento de reproducción de audio
const downloadLink = document.getElementById('downloadLink'); // Enlace para descargar la grabación
const recordingTime = document.getElementById('recordingTime'); // Elemento que muestra el tiempo de grabación

// Evento que inicia la grabación de audio
startBtn.addEventListener('click', async () => {
    try {
        // Solicita acceso al micrófono del usuario
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Inicializa un contexto de audio para procesar la señal
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioInput = audioContext.createMediaStreamSource(stream); // Fuente del flujo de audio
        recorder = audioContext.createScriptProcessor(4096, 1, 1); // Procesador de audio

        // Define un evento para capturar los datos de audio en tiempo real
        recorder.onaudioprocess = (e) => {
            if (mediaRecorder && mediaRecorder.state === "recording") {
                recordedChunks.push(new Float32Array(e.inputBuffer.getChannelData(0))); // Guarda los datos en fragmentos
            }
        };

        // Conecta el flujo de entrada al procesador
        audioInput.connect(recorder);
        recorder.connect(audioContext.destination); // Salida del procesador al destino

        // Inicializa el grabador de medios para el flujo de audio
        mediaRecorder = new MediaRecorder(stream);

        // Define acciones al iniciar la grabación
        mediaRecorder.onstart = () => {
            recordedChunks = []; // Limpia los fragmentos grabados
            startTime = Date.now(); // Registra el tiempo de inicio
            recordingInterval = setInterval(updateRecordingTime, 1000); // Actualiza la duración cada segundo
        };

        // Define acciones al detener la grabación
        mediaRecorder.onstop = async () => {
            clearInterval(recordingInterval); // Detiene el intervalo de tiempo
            const mp3Blob = await convertToMP3(recordedChunks); // Convierte los datos grabados a MP3
            const url = URL.createObjectURL(mp3Blob); // Crea una URL para el archivo MP3
            audioPlayback.src = url; // Muestra el archivo en el reproductor
            downloadLink.href = url; // Establece el enlace de descarga
            saveBtn.disabled = false; // Habilita el botón de guardar
            recordedChunks = []; // Limpia los datos grabados
        };

        // Inicia la grabación
        mediaRecorder.start();
        startBtn.disabled = true; // Desactiva el botón de iniciar
        stopBtn.disabled = false; // Activa el botón de detener
    } catch (err) {
        console.error('Error accessing audio devices:', err); // Manejo de errores
    }
});

// Evento que detiene la grabación
stopBtn.addEventListener('click', () => {
    mediaRecorder.stop(); // Detiene la grabación
    startBtn.disabled = false; // Activa el botón de iniciar
    stopBtn.disabled = true; // Desactiva el botón de detener
});

// Evento para guardar la grabación
saveBtn.addEventListener('click', async () => {
    const fileName = `grabacion_${Date.now()}.mp3`; // Nombre del archivo con marca de tiempo
    const mp3Blob = audioPlayback.src ? await fetch(audioPlayback.src).then(res => res.blob()) : null; // Obtiene el archivo MP3 desde la URL

    if (mp3Blob) {
        const formData = new FormData();
        formData.append('audioFile', mp3Blob, fileName); // Prepara el archivo para enviar al servidor

        try {
            // Envía el archivo al servidor
            const response = await fetch('http://localhost/bton-guardar/guardar_audio.php', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json(); // Respuesta del servidor
            if (result.success) {
                alert('Archivo guardado exitosamente.');
            } else {
                alert(`Error al guardar el archivo: ${result.message}`);
            }
        } catch (error) {
            console.error('Error al enviar el archivo:', error);
            alert('Error al guardar el archivo.');
        }
    } else {
        alert('No hay grabación para guardar.');
    }
});

// Función para actualizar el tiempo de grabación en la interfaz
function updateRecordingTime() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000); // Tiempo transcurrido en segundos
    const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0'); // Minutos
    const seconds = (elapsedTime % 60).toString().padStart(2, '0'); // Segundos
    recordingTime.textContent = `${minutes}:${seconds}`; // Actualiza el texto en la interfaz
}

// Función para convertir los datos grabados a formato MP3
async function convertToMP3(chunks) {
    const sampleRate = audioContext.sampleRate; // Frecuencia de muestreo del audio
    const samples = flattenArray(chunks); // Une todos los fragmentos grabados
    const buffer = new Int16Array(samples.length);

    // Convierte los datos de Float32 a Int16 para el codificador MP3
    for (let i = 0; i < samples.length; i++) {
        buffer[i] = samples[i] * 32767.5;
    }

    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128); // Inicializa el codificador MP3
    const mp3Data = [];
    let mp3Buffer = mp3encoder.encodeBuffer(buffer);
    if (mp3Buffer.length > 0) {
        mp3Data.push(mp3Buffer); // Almacena los datos codificados
    }
    mp3Buffer = mp3encoder.flush(); // Finaliza la codificación
    if (mp3Buffer.length > 0) {
        mp3Data.push(mp3Buffer);
    }
    return new Blob(mp3Data, { type: 'audio/mp3' }); // Devuelve el archivo MP3 como Blob
}

// Función para combinar todos los fragmentos en un solo array
function flattenArray(channelBuffer) {
    const result = new Float32Array(channelBuffer.reduce((acc, arr) => acc + arr.length, 0)); // Calcula el tamaño total
    let offset = 0;
    for (let i = 0; i < channelBuffer.length; i++) {
        result.set(channelBuffer[i], offset); // Copia los datos al array final
        offset += channelBuffer[i].length; // Actualiza el offset
    }
    return result; // Devuelve el array combinado
}
