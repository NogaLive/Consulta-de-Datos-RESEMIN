# 1. Usar una imagen oficial de Python ligera
FROM python:3.12-slim

# 2. Evitar que Python cree archivos .pyc y forzar logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Crear carpeta de trabajo en el contenedor
WORKDIR /app

# 4. Instalar dependencias del sistema necesarias para compilar
RUN apt-get update && apt-get install -y --no-install-recommends gcc

# 5. Copiar el requirements e instalar librerías
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# 6. Copiar todo el código del backend al contenedor
COPY . .

# 7. Crear la carpeta uploads si no existe (para evitar errores)
RUN mkdir -p uploads

# 8. Comando para iniciar la aplicación (Puerto 8080 es estándar en Google)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]