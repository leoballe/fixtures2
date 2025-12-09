from flask import Flask, send_from_directory, request, jsonify
import os

"""
Pequeño servidor Flask que sirve la interfaz web del generador de fixtures
y proporciona un punto de partida para mover la lógica de generación al backend.

Para probarlo localmente:

1.  Copia el archivo HTML definitivo (por ejemplo `index (29).html`) en un
    subdirectorio llamado `static` y renómbralo a `index.html`.  El
    contenido de esa carpeta `static/` se servirá directamente por
    Flask.
2.  Instala Flask (y opcionalmente pandas y otras dependencias) en tu
    entorno de Python:

        pip install flask

3.  Ejecuta este script:

        python app.py

4.  Abre tu navegador en <http://localhost:5000>.  La página mostrará
    el formulario de generación de fixtures tal y como lo viste en
    HTML.  Toda la lógica de generación sigue ejecutándose en el
    navegador por ahora.  Más adelante se puede trasladar al
    endpoint `/generate`.

En el futuro, la ruta `/generate` podrá recibir un JSON con la
configuración del torneo y devolver el calendario generado desde el
servidor.  De momento responde con un mensaje de prueba.
"""

# Crear la aplicación Flask.  `static_folder` indica dónde buscar los
# archivos estáticos (HTML, CSS, JS) que se servirán directamente.
app = Flask(__name__, static_folder='static', static_url_path='')


@app.route('/')
def index():
    """Devuelve la página principal (index.html) situada en la carpeta estática."""
    return app.send_static_file('index.html')


@app.route('/generate', methods=['POST'])
def generate_fixture():
    """Punto de entrada para generar el fixture desde el backend.

    Este endpoint recibirá (vía JSON) la configuración del torneo y los
    equipos en formato de zonas, y devolverá un calendario generado.  La
    lógica de generación todavía no está implementada aquí porque
    actualmente se ejecuta en el navegador (JavaScript).  Cuando se
    implemente la generación en Python, este endpoint sustituirá esa
    lógica.  De momento simplemente devuelve lo que recibe.
    """
    data = request.get_json() or {}
    # Aquí iría la lógica de generación de fixtures en Python
    # Por ahora, responder con los datos recibidos y un mensaje
    return jsonify({
        'status': 'ok',
        'message': 'Generación de fixture aún no implementada en el servidor.',
        'received': data
    })


if __name__ == '__main__':
    # Inicia el servidor en modo debug.  El host 0.0.0.0 permite el
    # acceso desde cualquier interfaz en la máquina local.  El puerto
    # 5000 es el predeterminado de Flask.
    app.run(host='0.0.0.0', port=5000, debug=True)