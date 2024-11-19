//declaracion de variables
let mediaRecorder;
let audioContext;
let audioInput;
let recorder;
let recordedChunks = [];
let startTime;
let recordingInterval;

//obteniendo los botones del html para poder agregarles
//la funcionalidad 
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const audioPlayback = document.getElementById('audioPlayback');
const downloadLink = document.getElementById('downloadLink');
const recordingTime = document.getElementById('recordingTime');

// Evento para iniciar la grabación
startBtn.addEventListener('click', async () => {
    try {
        // Solicita acceso al micrófono del usuario
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Crea un contexto de audio para procesar el audio grabado
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Establece la fuente de audio como el micrófono del usuario
        audioInput = audioContext.createMediaStreamSource(stream);

        // Crea un procesador de audio para manejar los datos en tiempo real
        recorder = audioContext.createScriptProcessor(4096, 1, 1);

        // Evento que se dispara durante el procesamiento de audio
        recorder.onaudioprocess = (e) => {
            // Si la grabación está en curso, almacena los fragmentos grabados
            if (mediaRecorder && mediaRecorder.state === "recording") {
                recordedChunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
            }
        };

        // Conecta el procesador de audio al flujo de audio
        audioInput.connect(recorder);
        recorder.connect(audioContext.destination);

        // Configura el MediaRecorder para capturar el audio del micrófono
        mediaRecorder = new MediaRecorder(stream);

        // Evento que se dispara al iniciar la grabación
        mediaRecorder.onstart = () => {
            recordedChunks = []; // Limpia los fragmentos previos
            startTime = Date.now(); // Registra el tiempo de inicio
            recordingInterval = setInterval(updateRecordingTime, 1000); // Inicia un temporizador para actualizar el tiempo grabado
        };

        // Evento que se dispara al detener la grabación
        mediaRecorder.onstop = async () => {
            clearInterval(recordingInterval); // Detiene el temporizador
            const mp3Blob = await convertToMP3(recordedChunks); // Convierte los fragmentos grabados a formato MP3
            const url = URL.createObjectURL(mp3Blob); // Crea una URL para el archivo MP3
            audioPlayback.src = url; // Configura el reproductor de audio con la grabación
            downloadLink.href = url; // Configura el enlace de descarga
            saveBtn.disabled = false; // Habilita el botón "Guardar"
            recordedChunks = []; // Limpia los fragmentos grabados
        };

        // Inicia la grabación
        mediaRecorder.start();

        // Actualiza el estado de los botones
        startBtn.disabled = true; // Deshabilita el botón "Iniciar Grabación"
        stopBtn.disabled = false; // Habilita el botón "Detener Grabación"
    } catch (err) {
        console.error('Error accessing audio devices:', err); // Maneja errores de acceso al micrófono
    }
});

// Evento para detener la grabación
stopBtn.addEventListener('click', () => {
    mediaRecorder.stop(); // Detiene la grabación
    startBtn.disabled = false; // Habilita el botón "Iniciar Grabación"
    stopBtn.disabled = true; // Deshabilita el botón "Detener Grabación"
});

// Evento para guardar la grabación (implementación futura)
saveBtn.addEventListener('click', () => {
    alert('Funcionalidad de guardar aún no implementada.'); 
    // Aquí puedes agregar lógica para guardar el archivo en el servidor o en localStorage
});

// Función para actualizar el tiempo de grabación en la interfaz
function updateRecordingTime() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000); // Calcula el tiempo transcurrido en segundos
    const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0'); // Calcula los minutos
    const seconds = (elapsedTime % 60).toString().padStart(2, '0'); // Calcula los segundos
    recordingTime.textContent = `${minutes}:${seconds}`; // Actualiza el texto del temporizador en la interfaz
}

// Función para convertir los fragmentos grabados a formato MP3
async function convertToMP3(chunks) {
    const sampleRate = audioContext.sampleRate; // Obtiene la tasa de muestreo del audio
    const samples = flattenArray(chunks); // Une todos los fragmentos de audio en un solo array
    const buffer = new Int16Array(samples.length); // Crea un buffer de 16 bits para almacenar los datos de audio

    // Convierte los valores de los fragmentos a un formato adecuado para MP3
    for (let i = 0; i < samples.length; i++) {
        buffer[i] = samples[i] * 32767.5; // Escala los datos de audio
    }

    // Configura el codificador MP3 con un bitrate de 128 kbps
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
    const mp3Data = []; // Array para almacenar los datos codificados

    // Codifica los datos de audio
    let mp3Buffer = mp3encoder.encodeBuffer(buffer);
    if (mp3Buffer.length > 0) {
        mp3Data.push(mp3Buffer); // Almacena el buffer codificado
    }

    // Finaliza la codificación y almacena los datos restantes
    mp3Buffer = mp3encoder.flush();
    if (mp3Buffer.length > 0) {
        mp3Data.push(mp3Buffer);
    }

    return new Blob(mp3Data, { type: 'audio/mp3' }); // Devuelve un archivo MP3 como Blob
}

// Función para unir todos los fragmentos grabados en un único array
function flattenArray(channelBuffer) {
    const result = new Float32Array(channelBuffer.reduce((acc, arr) => acc + arr.length, 0)); // Crea un array del tamaño total necesario
    let offset = 0;

    // Copia los datos de cada fragmento en el array resultante
    for (let i = 0; i < channelBuffer.length; i++) {
        result.set(channelBuffer[i], offset);
        offset += channelBuffer[i].length; // Actualiza el offset para el siguiente fragmento
    }

    return result; // Devuelve el array combinado
}