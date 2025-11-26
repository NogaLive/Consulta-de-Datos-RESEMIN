import os
import json
import shutil
from typing import List, Optional, Dict
from datetime import datetime, timedelta

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import JWTError, jwt
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# --- CONFIGURACIÓN GENERAL ---
SECRET_KEY = "SUPER_SECRET_KEY_RESEMIN_PROJECT_2025"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
UPLOAD_DIR = "uploads"
DATA_FILE = os.path.join(UPLOAD_DIR, "database.xlsx")
CONFIG_FILE = os.path.join(UPLOAD_DIR, "config.json")
USERS_FILE = os.path.join(UPLOAD_DIR, "users.json")

os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_real_user_ip(request: Request):
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0]
    return request.client.host

limiter = Limiter(key_func=get_real_user_ip)

app = FastAPI(title="Consulta de Datos RESEMIN", version="3.2.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# --- VARIABLES GLOBALES ---
global_df = None
app_config = {
    "dni_column": "",
    "date_column": "",
    "visible_columns": []
}

# --- GESTIÓN DE USUARIOS ---
def load_users() -> Dict:
    if not os.path.exists(USERS_FILE):
        default_admin = {
            "admin": {
                "password": "$argon2id$v=19$m=65536,t=3,p=4$DnX/wP8H6+tX4wXq+YkZqQ$P/u3u+u3u+u3u+u3u+u3u+u3u+u3u+u3",
                "role": "ADMIN"
            }
        }
        with open(USERS_FILE, 'w') as f: json.dump(default_admin, f, indent=4)
        return default_admin
    try:
        with open(USERS_FILE, 'r') as f: return json.load(f)
    except: return {}

def save_users(users_data: Dict):
    with open(USERS_FILE, 'w') as f: json.dump(users_data, f, indent=4)

# --- MODELOS ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class UserCreate(BaseModel):
    username: str
    password: str

class UserQuery(BaseModel):
    dni: str
    fecha_ingreso: str 

class SystemConfig(BaseModel):
    dni_column: str
    date_column: str
    selected_columns: List[str]

# --- FUNCIONES AUXILIARES ---
def load_data_into_memory():
    global global_df, app_config
    if os.path.exists(DATA_FILE):
        try:
            # Leemos el Excel sin convertir todo a string todavía para detectar fechas
            global_df = pd.read_excel(DATA_FILE)
            # Limpiamos nombres de columnas
            global_df.columns = global_df.columns.str.strip()
            print("Datos cargados en memoria.")
        except Exception as e:
            print(f"Error cargando Excel: {e}")
            global_df = pd.DataFrame()
    else:
        global_df = pd.DataFrame()
    
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f: app_config = json.load(f)
        except: pass

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user_data(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role is None: raise HTTPException(status_code=401)
        return {"username": username, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

async def require_admin(user_data: dict = Depends(get_current_user_data)):
    if user_data["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Acceso denegado. Se requiere rol ADMIN.")
    return user_data

# --- ENDPOINTS ---

@app.on_event("startup")
async def startup_event():
    load_data_into_memory()

@app.post("/api/auth/register")
async def register(user: UserCreate):
    users_db = load_users()
    if user.username in users_db: raise HTTPException(status_code=400, detail="Usuario existe")
    users_db[user.username] = { "password": pwd_context.hash(user.password), "role": "USER" }
    save_users(users_db)
    return {"message": "Registrado. Solicite activación."}

@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    users_db = load_users()
    user_record = users_db.get(form_data.username)
    if not user_record or not pwd_context.verify(form_data.password, user_record["password"]):
        raise HTTPException(status_code=401, detail="Incorrecto")
    role = user_record.get("role", "USER")
    return {"access_token": create_access_token({"sub": form_data.username, "role": role}), "token_type": "bearer", "role": role}

@app.post("/api/admin/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(require_admin)):
    if not file.filename.endswith('.xlsx'): raise HTTPException(status_code=400, detail="Solo .xlsx")
    try:
        with open(DATA_FILE, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
        load_data_into_memory()
        return {
            "message": "Archivo cargado", 
            "columns": global_df.columns.tolist(),
            "current_config": app_config
        }
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/config")
async def set_config(config: SystemConfig, user: dict = Depends(require_admin)):
    global app_config
    if global_df is not None and not global_df.empty:
        all_cols = global_df.columns.tolist()
        if config.dni_column not in all_cols: raise HTTPException(status_code=400, detail=f"Columna DNI no existe")
        if config.date_column not in all_cols: raise HTTPException(status_code=400, detail=f"Columna Fecha no existe")
    
    app_config = {
        "dni_column": config.dni_column,
        "date_column": config.date_column,
        "visible_columns": config.selected_columns
    }
    with open(CONFIG_FILE, "w") as f: json.dump(app_config, f, indent=4) 
    return {"message": "Configuración actualizada"}

@app.get("/api/admin/config")
async def get_config(user: dict = Depends(require_admin)):
    return app_config

@app.get("/api/admin/suggestions")
async def get_suggestions(dni_fragment: str, user: dict = Depends(require_admin)):
    if global_df is None or global_df.empty: return []
    target_col = app_config.get("dni_column")
    if not target_col or target_col not in global_df.columns: return []
    
    # Convertimos a string para buscar
    mask = global_df[target_col].astype(str).str.contains(dni_fragment, na=False)
    return global_df[mask][target_col].head(5).astype(str).tolist()

# NUEVO ENDPOINT: OBTENER DETALLE COMPLETO (SOLO ADMIN)
@app.get("/api/admin/user-detail")
async def get_admin_user_detail(dni: str, user: dict = Depends(require_admin)):
    if global_df is None or global_df.empty: return {}
    target_col = app_config.get("dni_column")
    
    # Búsqueda exacta por DNI (convirtiendo a string para asegurar coincidencia)
    user_row = global_df[global_df[target_col].astype(str).str.strip() == dni.strip()]
    
    if user_row.empty:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Convertir a dict y manejar NaNs y Fechas para JSON
    record = user_row.iloc[0].to_dict()
    # Convertir timestamps a string para que no falle el JSON
    clean_record = {k: (v.strftime('%Y-%m-%d') if isinstance(v, pd.Timestamp) else str(v)) for k, v in record.items()}
    
    return clean_record

@app.post("/api/query/user")
@limiter.limit("5/minute")
async def query_user_data(request: Request, query: UserQuery):
    if global_df is None or global_df.empty: 
        raise HTTPException(status_code=503, detail="El sistema está en mantenimiento (Base de datos no cargada).")

    dni_col = app_config.get("dni_column")
    fecha_col = app_config.get("date_column")
    visible = app_config.get("visible_columns", [])

    if not dni_col or not fecha_col:
         raise HTTPException(status_code=500, detail="Error de configuración: Columnas clave no definidas.")

    try:
        # 1. Procesar fechas
        excel_dates = pd.to_datetime(global_df[fecha_col], dayfirst=True, errors='coerce')
        input_date = pd.to_datetime(query.fecha_ingreso, errors='coerce')

        # 2. Filtrar
        dni_mask = global_df[dni_col].astype(str).str.strip() == query.dni.strip()
        date_mask = excel_dates.dt.date == input_date.date()

        # OBTENEMOS TODAS LAS FILAS QUE COINCIDAN (NO SOLO UNA)
        user_rows = global_df[dni_mask & date_mask]

    except Exception as e:
        print(f"Error backend: {e}")
        raise HTTPException(status_code=500, detail="Error procesando la consulta.")

    if user_rows.empty:
        raise HTTPException(status_code=404, detail="No se encontraron registros con esas credenciales.")

    # 3. Convertir a lista de diccionarios
    # orient='records' crea una lista: [{col:val}, {col:val}, ...]
    raw_data = user_rows.to_dict(orient='records')
    
    clean_results = []
    
    for row in raw_data:
        clean_row = {}
        for k, v in row.items():
            # Solo columnas visibles
            if visible and k not in visible: 
                continue 
            
            # Formatear valores
            if isinstance(v, pd.Timestamp):
                clean_row[k] = v.strftime('%d/%m/%Y')
            elif pd.isna(v): # Manejar valores vacíos (NaN)
                clean_row[k] = "-" 
            else:
                clean_row[k] = str(v)
        clean_results.append(clean_row)

    return clean_results
