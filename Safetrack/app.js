let auth = [];
let map; // Declarar 'map' para evitar errores
const markers = {}; 
const apiUrl = "http://127.0.0.1:3000/sensores";

// Cargar datos desde auth.json
async function loadAuthData() {
    try {
        const response = await fetch("auth.json");
        if (!response.ok) {
            throw new Error(`Error al cargar auth.json: ${response.status}`);
        }
        auth = await response.json();
        console.log("Datos cargados:", auth);

        // Verificar si el usuario ya está autenticado al cargar la aplicación
        redirectIfAuthenticated();
    } catch (error) {
        console.error("Error al cargar auth.json:", error);
    }
}

// Guardar el estado de sesión en localStorage
function saveSession(username) {
    localStorage.setItem("currentUser", username);
}

// Obtener el usuario en sesión
function getSession() {
    return localStorage.getItem("currentUser");
}

// Validar credenciales de usuario
function validateLogin(username, password) {
    const user = auth.find((u) => u.usr === username && u.pwd === password);
    if (user) {
        user.status = 1; // Cambiar estado a sesión activa
        saveSession(username);
        //console.log("Estado actualizado tras login:", auth);
        return true;
    }
    return false;
}

// Actualizar la contraseña del usuario y enviar al servidor
async function updatePassword(recoveryCode, newPassword) {
    try {
        const response = await fetch("http://localhost:3000/update", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                recoveryCode: recoveryCode,
                newPassword: newPassword,
            }),
        });

        const result = await response.json();

        if (response.ok) {
            console.log("Contraseña actualizada en el servidor:", result);
            return true;
        } else {
            console.error("Error al actualizar la contraseña:", result.error);
            return false;
        }
    } catch (error) {
        console.error("Error de conexión con el servidor:", error);
        return false;
    }
}

// Redirigir al dashboard si el usuario ya está autenticado
function redirectIfAuthenticated() {
    const currentUser = getSession();
    if (currentUser) {
        const user = auth.find((u) => u.usr === currentUser);
        if (user && user.status === 1) {
            loadDashboardComponent(); // Cargar el dashboard
        }
    }
}

// Cerrar sesión
function logout() {
    const currentUser = getSession();
    if (currentUser) {
        const user = auth.find((u) => u.usr === currentUser);
        if (user) {
            user.status = 0; // Cambiar estado a inactivo
            console.log("Estado actualizado tras logout:", auth);
        }
        localStorage.removeItem("currentUser");
    }
    window.location.reload(); // Recargar la página para mostrar el login
}

// Manejar el login
document
    .getElementById("loginForm")
    .addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        if (validateLogin(username, password)) {
            loadDashboardComponent(); // Cargar el dashboard
            inicializarMapa(); // Inicializar el mapa dentro del dashboard
        } else {
            document.getElementById("errorMessage").textContent =
                "Credenciales inválidas.";
        }
    });

// Componente de recuperación de contraseña
function loadRecoveryComponent() {
    const container = document.getElementById("appContainer");
    container.innerHTML = `
        <div id="resetContainer" class="w-full h-screen flex items-center justify-center">
            <div class="space-y-6 w-full max-w-md h-100v mx-auto p-8 bg-white shadow-lg rounded-lg mt-10">
                <h1 class="text-2xl font-bold text-center text-gray-700 mb-4">Recuperar Contraseña</h1>
                <form id="resetForm" class="space-y-6">
                    <div>
                        <label for="recoveryCode" class="block text-gray-600">Ingresa el código de recuperación:</label>
                        <input type="text" id="recoveryCode" placeholder="Código de recuperación" required class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-300">
                    </div>
                    <div>
                        <label for="newPassword" class="block text-gray-600">Ingresa tu nueva contraseña:</label>
                        <input type="password" id="newPassword" placeholder="Nueva contraseña" required class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:ring-blue-300">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors">Restablecer contraseña</button>
                </form>
                <p id="recoveryMessage" class="text-center text-red-500 mt-4"></p>
                <button id="backToLogin" class="mt-4 w-full text-blue-600 hover:underline focus:outline-none">Regresar al login</button>
            </div>
        </div>
    `;

    document
        .getElementById("resetForm")
        .addEventListener("submit", async (event) => {
            event.preventDefault();
            const recoveryCode = document.getElementById("recoveryCode").value;
            const newPassword = document.getElementById("newPassword").value;
            const recoveryMessage = document.getElementById("recoveryMessage");

            const success = await updatePassword(recoveryCode, newPassword);
            if (success) {
                recoveryMessage.textContent =
                    "Contraseña restablecida con éxito. Redirigiendo al login...";
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                recoveryMessage.textContent =
                    "Error al restablecer la contraseña. Intenta de nuevo.";
            }
        });

    document.getElementById("backToLogin").addEventListener("click", () => {
        window.location.reload();
    });
}

function loadDashboardComponent() {
    const container = document.getElementById("appContainer");
    container.innerHTML = `
    <div class="min-h-screen flex flex-col bg-gray-900 text-white font-sans">
        <!-- Navbar -->
        <nav class="bg-gray-800 text-white py-4 px-6 flex justify-between items-center shadow-lg">
            <div class="text-2xl font-bold">kukoapp tracking</div>
            <div class="flex space-x-4">
                <button class="bg-gray-700 py-2 px-4 rounded-lg hover:bg-gray-600 transition" onclick="llamarSoporte()">Contactar Soporte</button>
                <button id="logout-btn" class="bg-red-600 py-2 px-4 rounded-lg hover:bg-red-500 transition">Cerrar Sesión</button>
            </div>
        </nav>

        <!-- Contenedor principal -->
        <div class="flex flex-grow relative">
            <!-- Menú lateral izquierdo -->
            <aside class="w-20 bg-gray-800 flex flex-col items-center py-6 space-y-6 z-10">
                <div class="flex flex-col items-center justify-center space-y-4">
                    <button class="menu-btn bg-gray-700 hover:bg-gray-600 w-12 h-12 rounded-full flex items-center justify-center" onclick="mostrarHistorial()">
                        <img src="icon-historial.svg" alt="Historial de Recorridos" class="w-6 h-6">
                    </button>
                    <button class="menu-btn bg-gray-700 hover:bg-gray-600 w-12 h-12 rounded-full flex items-center justify-center" onclick="mostrarHistorialAlertas()">
                        <img src="icon-alertas.svg" alt="Historial de Alertas" class="w-6 h-6">
                    </button>
                </div>
            </aside>

            <!-- Mapa de fondo -->
            <div id="map" class="absolute inset-0 left-20 z-0"></div>

            <!-- Panel de Historial -->
            <aside id="historialPanel" class="hidden absolute top-10 left-28 bg-gray-800 rounded-lg p-6 shadow-lg w-1/2 z-10 overflow-y-auto" style="margin: 20px; max-height: 70%;"></aside>

            <!-- Panel de Historial de Alertas -->
            <aside id="historialAlertasPanel" class="hidden absolute top-10 left-28 bg-gray-800 rounded-lg p-6 shadow-lg w-1/2 z-10 overflow-y-auto" style="margin: 20px; max-height: 70%;"></aside>

            <!-- Panel de Alertas -->
            <aside class="absolute bottom-40 right-10 bg-gray-800 rounded-lg p-6 shadow-lg w-1/3 z-10" style="margin: 20px;">
                <h3 class="text-lg font-semibold mb-4">Alertas</h3>
                <div id="alertas-container" class="space-y-4"></div>
            </aside>

            <!-- Panel de datos del vehículo -->
            <aside id="movilData" class="absolute bottom-10 right-10 bg-gray-800 rounded-lg p-6 shadow-lg w-1/3 z-10" style="margin: 20px;">
                <h3 class="text-lg font-semibold">Datos del Vehículo</h3>
                <div id="datosCamion" class="space-y-4"></div>
            </aside>
        </div>
    </div>
    `;

    inicializarMapa();

    const logoutButton = document.getElementById("logout-btn");
    logoutButton.addEventListener("click", () => {
        logout();
    });
}

const llamarSoporte = () => {
    const numeroSoporte = "+57 3114998327";
    window.location.href = `tel:${numeroSoporte}`;
};

// Función para inicializar el mapa
const inicializarMapa = () => {
    if (typeof L === "undefined") {
        console.error("Leaflet no está cargado. Asegúrate de incluirlo en tu proyecto.");
        return;
    }

    map = L.map("map").setView([4.0, -74.0], 8);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "© OpenStreetMap",
    }).addTo(map);

    setInterval(obtenerDatosBuses, 1000);
};

// Función para obtener los datos de la API
const obtenerDatosBuses = async () => {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
            console.error("Datos de la API no válidos o vacíos:", data);
            return;
        }

        actualizarMapa(data);
        mostrarDatosSensores(data);
        generarAlertas(data);
        console.log(data);
    } catch (error) {
        console.error("Error al obtener los datos:", error);
    }
};

// Función para calcular distancias con fórmula de Haversine
const calcularDistanciaHaversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Función para actualizar el mapa con marcadores
const actualizarMapa = (data) => {
    if (!map) return;

    // Limpia los marcadores anteriores
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    // Agrega nuevos marcadores
    Object.keys(data).forEach((id) => {
        const { gps } = data[id] || {};

        if (gps && gps.latitud != null && gps.longitud != null) {
            const marker = L.marker([gps.latitud, gps.longitud], {
                icon: L.icon({
                    iconUrl: "https://img.icons8.com/ios-filled/50/000000/truck.png",
                    iconSize: [32, 32],
                }),
            }).addTo(map);

            // Agregar evento para mostrar datos al hacer clic
            marker.on("click", () => {
                mostrarDatosSensores({ [id]: data[id] });
            });

            marker.bindPopup(`Camión ${id}`);
        } else {
            console.warn(`GPS no disponible para el camión ${id}`);
        }
    });
};

const mostrarDatosSensores = (data) => {
    const contenedor = document.getElementById("datosCamion");
    if (!contenedor) {
        console.error("No se encontró el contenedor con el ID 'datosCamion'");
        return;
    }

    // Limpia el contenedor antes de mostrar nuevos datos
    contenedor.innerHTML = "";

    // Muestra los datos del camión seleccionado
    Object.keys(data).forEach((id) => {
        const { gasolina, temperatura, gps } = data[id] || {};

        if (!gps || gps.latitud == null || gps.longitud == null) {
            console.warn(`Datos incompletos para el camión ${id}`, data[id]);
            return;
        }

        const div = document.createElement("div");
        div.innerHTML = `
            <div class="border p-4 mb-4 bg-gray-100 rounded shadow">
                <p><strong>Camión ID:</strong> ${id}</p>
                <p><strong>Gasolina:</strong> ${gasolina || "Desconocida"}%</p>
                <p><strong>Temperatura:</strong> ${temperatura || "Desconocida"} °C</p>
                <p><strong>Ubicación GPS:</strong> Latitud ${gps.latitud}, Longitud ${gps.longitud}</p>
            </div>
        `;
        contenedor.appendChild(div);
    });
};

// Función para generar alertas
const generarAlertas = (data) => {
    const alertasContainer = document.getElementById("alertas-container");
    if (!alertasContainer) return;

    alertasContainer.innerHTML = "";

    let historialAlertas = [];
    try {
        historialAlertas = JSON.parse(localStorage.getItem("historialAlertas")) || [];
    } catch (error) {
        console.error("Error accediendo a localStorage:", error);
    }

    Object.keys(data).forEach((id) => {
        const { alertas } = data[id];
        if (alertas && alertas.length > 0) {
            alertas.forEach((alerta) => {
                const div = document.createElement("div");
                div.textContent = `Camión ${id}: ${alerta}`;
                div.classList.add("bg-red-500", "text-white", "p-2", "rounded", "mb-2");
                alertasContainer.appendChild(div);

                historialAlertas.push({ id, alerta, timestamp: new Date().toISOString() });
            });
        }
    });

    try {
        localStorage.setItem("historialAlertas", JSON.stringify(historialAlertas));
    } catch (error) {
        console.error("Error guardando en localStorage:", error);
    }
};

loadAuthData();
