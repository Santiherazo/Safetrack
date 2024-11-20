from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import threading
import time

app = Flask(__name__)
CORS(app)  # Permitir acceso desde el frontend

# Archivos de configuración y datos históricos
CONFIG_FILE = 'config.json'
ALERTAS_FILE = 'alertas.json'
HISTORIAL_FILE = 'historial.json'

# Si los archivos no existen, crearlos con datos iniciales
if not os.path.exists(CONFIG_FILE):
    with open(CONFIG_FILE, 'w') as file:
        json.dump({
            "gasolina_baja": 10,
            "temperatura_alta": 35,
            "temperatura_baja": 15
        }, file, indent=2)

if not os.path.exists(ALERTAS_FILE):
    with open(ALERTAS_FILE, 'w') as file:
        json.dump([], file)

if not os.path.exists(HISTORIAL_FILE):
    with open(HISTORIAL_FILE, 'w') as file:
        json.dump({}, file)

# Archivo de autenticación
AUTH_FILE = 'auth.json'
if not os.path.exists(AUTH_FILE):
    with open(AUTH_FILE, 'w') as file:
        json.dump([], file)

# Datos iniciales de los camiones
camiones = {}

# -------------------------------
# Inicialización y actualización de camiones
# -------------------------------

def inicializar_camiones():
    """Inicializa los camiones con datos básicos."""
    camiones.clear()  # Limpiar datos antiguos
    for camion_id in range(1, 6):
        camiones[camion_id] = {
            "gasolina": 50,  # Nivel inicial de gasolina
            "temperatura": 25,  # Temperatura ideal
            "gps": {
                "latitud": 4.0,
                "longitud": -74.0,
                "velocidad": 0
            },
            "alertas": [],
            "recorrido": []  # Historial de recorrido
        }
        actualizar_camion(camion_id)

def actualizar_camion(camion_id):
    """Actualiza los datos del camión con nuevos valores según los umbrales."""
    camion = camiones[camion_id]

    # Obtener configuración de los umbrales
    config = leer_configuracion()

    # Generar alertas basadas en los umbrales
    camion["alertas"] = []

    if camion["gasolina"] <= config["gasolina_baja"]:
        generar_alerta(camion_id, "Nivel de gasolina crítico")
    if camion["temperatura"] > config["temperatura_alta"]:
        generar_alerta(camion_id, "Temperatura alta")
    if camion["temperatura"] < config["temperatura_baja"]:
        generar_alerta(camion_id, "Temperatura baja")

def generar_alerta(camion_id, mensaje):
    """Genera una alerta y la guarda en el archivo de alertas."""
    alerta = {
        "camion_id": camion_id,
        "mensaje": mensaje,
        "timestamp": time.time()
    }
    
    # Guardar la alerta en el archivo alertas.json
    with open(ALERTAS_FILE, 'r+') as file:
        alertas = json.load(file)
        alertas.append(alerta)
        file.seek(0)
        json.dump(alertas, file, indent=2)

def generar_recorrido(camion_id, datos_recorrido):
    """Genera el historial del recorrido del camión y lo guarda en el archivo."""
    with open(HISTORIAL_FILE, 'r+') as file:
        historial = json.load(file)
        
        if camion_id not in historial:
            historial[camion_id] = []

        historial[camion_id].append(datos_recorrido)
        file.seek(0)
        json.dump(historial, file, indent=2)

def leer_configuracion():
    """Leer configuración de umbrales desde el archivo."""
    try:
        with open(CONFIG_FILE, 'r') as file:
            config = json.load(file)
        return config
    except Exception as e:
        print(f"Error al leer el archivo de configuración: {str(e)}")
        return {}

# -------------------------------
# Rutas de la API
# -------------------------------

@app.route('/sensores', methods=['GET'])
def obtener_datos():
    """Devuelve los datos actuales de todos los camiones, incluyendo alertas y recorridos."""
    actualizar_camiones()
    return jsonify({id: camion for id, camion in camiones.items()})

@app.route('/sensores/<int:camion_id>', methods=['GET'])
def obtener_datos_camion(camion_id):
    """Devuelve los datos de un camión específico, incluyendo alertas y recorridos."""
    actualizar_camiones()
    camion = camiones.get(camion_id)
    if not camion:
        return jsonify({"error": "Camión no encontrado"}), 404
    return jsonify(camion)

@app.route('/configuracion', methods=['GET'])
def obtener_configuracion():
    """Devuelve la configuración actual de los umbrales."""
    config = leer_configuracion()
    return jsonify(config)

@app.route('/configuracion', methods=['POST'])
def actualizar_configuracion():
    """Actualiza los umbrales de la configuración a partir de los datos proporcionados."""
    config = request.get_json()
    if not config:
        return jsonify({"error": "No se recibieron datos válidos"}), 400

    try:
        with open(CONFIG_FILE, 'w') as file:
            json.dump(config, file, indent=2)
        return jsonify({"message": "Configuración de umbrales actualizada con éxito"}), 200
    except Exception as e:
        return jsonify({"error": f"Error al actualizar el archivo: {str(e)}"}), 500

@app.route('/alertas', methods=['GET'])
def obtener_alertas():
    """Devuelve todas las alertas registradas."""
    with open(ALERTAS_FILE, 'r') as file:
        alertas = json.load(file)
    return jsonify(alertas)

@app.route('/historial', methods=['GET'])
def obtener_historial():
    """Devuelve el historial de recorrido de todos los camiones."""
    with open(HISTORIAL_FILE, 'r') as file:
        historial = json.load(file)
    return jsonify(historial)

@app.route('/update', methods=['POST'])
def update_password():
    """Permite actualizar la contraseña del usuario con el código de recuperación."""
    data = request.get_json()
    recovery_code = data.get('recoveryCode')
    new_password = data.get('newPassword')

    if not recovery_code or not new_password:
        return jsonify({"error": "Datos incompletos"}), 400

    try:
        with open(AUTH_FILE, 'r') as file:
            auth_data = json.load(file)
        user = next((u for u in auth_data if u['recoveryCode'] == recovery_code), None)
        if not user:
            return jsonify({"error": "Código de recuperación inválido"}), 404

        user['pwd'] = new_password

        with open(AUTH_FILE, 'w') as file:
            json.dump(auth_data, file, indent=2)

        return jsonify({"message": "Contraseña actualizada con éxito"}), 200
    except Exception as e:
        return jsonify({"error": f"Error al actualizar el archivo: {str(e)}"}), 500

# -------------------------------
# Ejecución de la aplicación
# -------------------------------

if __name__ == '__main__':
    inicializar_camiones()
    app.run(debug=True, port=3000)