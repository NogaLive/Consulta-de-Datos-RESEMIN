import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Moon, Search, Upload, Lock, FileSpreadsheet, LogOut, Loader2, User, X, 
  ShieldAlert, CheckCircle, Filter, ChevronDown, Eye, ArrowUpDown, ChevronUp 
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// --- HOOK TEMA OSCURO ---
const useTheme = () => {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark]);
  return { dark, setDark };
};

// --- NUEVO COMPONENTE: TABLA TIPO EXCEL (LOCAL) ---
// Este componente permite ordenar, filtrar y ocultar columnas solo visualmente
const ExcelTable = ({ data }) => {
  if (!data || data.length === 0) return null;

  const allColumns = Object.keys(data[0]);
  
  // Estados Locales de la Tabla
  const [hiddenCols, setHiddenCols] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [globalFilter, setGlobalFilter] = useState('');
  const [showColMenu, setShowColMenu] = useState(false);

  // 1. Filtrado Local
  const filteredData = useMemo(() => {
    return data.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(globalFilter.toLowerCase())
      )
    );
  }, [data, globalFilter]);

  // 2. Ordenamiento Local
  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  // Handlers
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const toggleColumn = (col) => {
    setHiddenCols(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const visibleColumns = allColumns.filter(c => !hiddenCols.includes(c));

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg border dark:border-slate-800 overflow-hidden flex flex-col h-full max-h-[600px] mt-8 animate-in fade-in zoom-in duration-300">
      
      {/* TOOLBAR DE LA TABLA */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800 flex flex-col sm:flex-row justify-between gap-3 items-center">
        <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400 font-bold">
          <FileSpreadsheet size={20}/> 
          <span>Resultados Encontrados ({sortedData.length})</span>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {/* Buscador Local */}
          <div className="relative flex-1 sm:w-64">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
             <input 
               type="text" 
               placeholder="Filtrar en tabla..." 
               value={globalFilter}
               onChange={(e) => setGlobalFilter(e.target.value)}
               className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-1 focus:ring-primary-500"
             />
          </div>

          {/* Menú Columnas */}
          <div className="relative">
            <button 
              onClick={() => setShowColMenu(!showColMenu)}
              className="px-3 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 dark:text-white"
            >
              <Eye size={16}/> <span className="hidden sm:inline">Columnas</span> <ChevronDown size={14}/>
            </button>
            
            {showColMenu && (
              <div className="absolute right-0 top-12 w-56 bg-white dark:bg-slate-800 shadow-xl rounded-lg border dark:border-slate-700 z-50 p-2 max-h-60 overflow-y-auto">
                <div className="text-xs font-bold text-slate-400 mb-2 uppercase px-2">Mostrar / Ocultar</div>
                {allColumns.map(col => (
                  <label key={col} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer text-sm dark:text-slate-200">
                    <input 
                      type="checkbox" 
                      checked={!hiddenCols.includes(col)}
                      onChange={() => toggleColumn(col)}
                      className="rounded text-primary-600 focus:ring-primary-500"
                    />
                    <span className="truncate">{col}</span>
                  </label>
                ))}
              </div>
            )}
            {/* Backdrop para cerrar menú al hacer click fuera */}
            {showColMenu && <div className="fixed inset-0 z-40" onClick={() => setShowColMenu(false)}></div>}
          </div>
        </div>
      </div>

      {/* TABLA SCROLLABLE */}
      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-xs text-slate-500 uppercase bg-slate-100 dark:bg-slate-800 dark:text-slate-400 sticky top-0 z-10 shadow-sm">
            <tr>
              {visibleColumns.map(col => (
                <th key={col} scope="col" className="px-6 py-3 font-bold whitespace-nowrap border-b dark:border-slate-700 select-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center gap-2">
                    {col}
                    {sortConfig.key === col && (
                       sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>
                    )}
                    {sortConfig.key !== col && <ArrowUpDown size={12} className="opacity-30"/>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {sortedData.map((row, idx) => (
              <tr key={idx} className="bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                {visibleColumns.map(col => (
                  <td key={`${idx}-${col}`} className="px-6 py-4 whitespace-nowrap text-slate-700 dark:text-slate-300 border-r last:border-0 border-slate-100 dark:border-slate-800">
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
            {sortedData.length === 0 && (
               <tr>
                 <td colSpan={visibleColumns.length} className="text-center py-8 text-slate-500">
                   No hay coincidencias con el filtro actual.
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-2 bg-slate-50 dark:bg-slate-950 border-t dark:border-slate-800 text-xs text-slate-500 text-center">
         Mostrando {sortedData.length} registros.
      </div>
    </div>
  );
};

// --- COMPONENTE: MODAL DE AUTH (LOGIN/REGISTER) ---
const AuthModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isRegister) {
        // REGISTRO
        await axios.post(`${API_URL}/api/auth/register`, formData);
        setSuccessMsg("Registro exitoso. Solicita al administrador que active tu rol de ADMIN en la base de datos.");
        setIsRegister(false); 
      } else {
        // LOGIN
        const loginForm = new FormData();
        loginForm.append('username', formData.username);
        loginForm.append('password', formData.password);
        
        const res = await axios.post(`${API_URL}/api/auth/login`, loginForm);
        const { access_token, role } = res.data;
        
        // VERIFICAR ROL
        if (role !== 'ADMIN') {
          setError("Acceso denegado. Tu usuario existe pero NO tiene permisos de Administrador.");
        } else {
          localStorage.setItem('admin_token', access_token);
          onLoginSuccess();
          onClose();
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Error de conexión o credenciales inválidas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative border dark:border-slate-800"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
        
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-primary-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
            <Lock className="text-primary-600" size={24}/>
          </div>
          <h2 className="text-xl font-bold dark:text-white">{isRegister ? "Registro Admin" : "Acceso Administrativo"}</h2>
          <p className="text-xs text-slate-500 mt-1">Solo personal autorizado de RESEMIN</p>
        </div>

        {successMsg && <div className="mb-4 p-3 bg-green-100 text-green-700 text-xs rounded-lg border border-green-200">{successMsg}</div>}
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 text-xs rounded-lg flex gap-2 border border-red-200"><ShieldAlert size={16} className="shrink-0"/> <span>{error}</span></div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Usuario</label>
            <input type="text" required className="w-full p-2.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
            <input type="password" required className="w-full p-2.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
               value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>
          
          <button disabled={loading} className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold transition-all flex justify-center shadow-lg shadow-primary-500/30">
            {loading ? <Loader2 className="animate-spin"/> : (isRegister ? "Registrarme" : "Ingresar")}
          </button>
        </form>

        <div className="mt-4 text-center pt-4 border-t dark:border-slate-800">
          <button onClick={() => { setIsRegister(!isRegister); setError(''); setSuccessMsg(''); }} className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
            {isRegister ? "¿Ya tienes cuenta? Inicia Sesión" : "¿Nuevo usuario? Regístrate aquí"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- COMPONENTE: ADMIN DASHBOARD (MANTENIDO EXACTAMENTE IGUAL) ---
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upload');
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState({ text: '', type: '' });
  
  // Datos y Configuración
  const [allColumns, setAllColumns] = useState([]);
  const [config, setConfig] = useState({
    dni_column: '',
    date_column: '',
    selected_columns: []
  });

  // UX de Gestión de Columnas
  const [colSearch, setColSearch] = useState(''); 
  
  // Buscador Admin
  const [queryDni, setQueryDni] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [adminSearchResult, setAdminSearchResult] = useState(null); // Nuevo estado para resultado admin
  const [loadingSearch, setLoadingSearch] = useState(false);

  const token = localStorage.getItem('admin_token');
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    if (!token) navigate('/');
    else fetchConfig(); 
  }, [navigate, token]);

  const fetchConfig = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/config`, axiosConfig);
      if (res.data) {
        setConfig({
          dni_column: res.data.dni_column || '',
          date_column: res.data.date_column || '',
          selected_columns: res.data.visible_columns || [] 
        });
      }
    } catch (e) { console.error("Sin config previa"); }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/');
  };

  const handleUpload = async () => {
    if(!file) return;
    const formData = new FormData(); formData.append('file', file);
    setMsg({ text: 'Procesando archivo...', type: 'info' });
    try {
      const res = await axios.post(`${API_URL}/api/admin/upload`, formData, axiosConfig);
      setAllColumns(res.data.columns);
      const backendConfig = res.data.current_config;
      if(backendConfig && backendConfig.visible_columns) {
        setConfig({
            dni_column: backendConfig.dni_column || '',
            date_column: backendConfig.date_column || '',
            selected_columns: backendConfig.visible_columns || []
        });
      }
      setMsg({ text: 'Archivo cargado correctamente.', type: 'success' });
    } catch (e) { setMsg({ text: 'Error al subir archivo.', type: 'error' }); }
  };

  const toggleColumn = (col) => {
    const isSelected = config.selected_columns.includes(col);
    if (isSelected) {
      setConfig(prev => ({ ...prev, selected_columns: prev.selected_columns.filter(c => c !== col) }));
    } else {
      setConfig(prev => ({ ...prev, selected_columns: [...prev.selected_columns, col] }));
    }
  };

  const toggleAll = (select) => {
    const filteredColumns = allColumns.filter(c => c.toLowerCase().includes(colSearch.toLowerCase()));
    if (select) {
      const newSelection = new Set([...config.selected_columns, ...filteredColumns]);
      setConfig(prev => ({ ...prev, selected_columns: Array.from(newSelection) }));
    } else {
      const newSelection = config.selected_columns.filter(c => !filteredColumns.includes(c));
      setConfig(prev => ({ ...prev, selected_columns: newSelection }));
    }
  };

  const handleSaveConfig = async () => {
    if (!config.dni_column || !config.date_column) {
      setMsg({ text: 'ERROR: Debes seleccionar las columnas de DNI y FECHA en el paso 2.', type: 'error' });
      return;
    }
    if (config.selected_columns.length === 0) {
      setMsg({ text: 'ADVERTENCIA: No has seleccionado columnas visibles.', type: 'error' });
      return;
    }
    try {
      await axios.post(`${API_URL}/api/admin/config`, config, axiosConfig);
      setMsg({ text: '¡Configuración del sistema guardada con éxito!', type: 'success' });
    } catch (e) { setMsg({ text: 'Error al guardar configuración.', type: 'error' }); }
  };

  // --- LÓGICA BÚSQUEDA ADMIN ---
  const searchSuggestions = async (val) => {
    setQueryDni(val);
    if(val.length > 2) {
        try {
            const res = await axios.get(`${API_URL}/api/admin/suggestions?dni_fragment=${val}`, axiosConfig);
            setSuggestions(res.data);
        } catch(e) {}
    } else setSuggestions([]);
  };

  const selectSuggestion = async (dni) => {
    setQueryDni(dni);
    setSuggestions([]); // Ocultar sugerencias
    setLoadingSearch(true);
    setAdminSearchResult(null);
    try {
        // Llamada al endpoint de detalle
        const res = await axios.get(`${API_URL}/api/admin/user-detail?dni=${dni}`, axiosConfig);
        setAdminSearchResult(res.data);
    } catch (e) {
        alert("No se pudo obtener la información del usuario.");
    } finally {
        setLoadingSearch(false);
    }
  };

  const filteredColumns = allColumns.filter(c => c.toLowerCase().includes(colSearch.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl md:text-2xl font-bold dark:text-white flex items-center gap-2">
              <ShieldAlert className="text-primary-600"/> Panel de Administración
            </h1>
            <button onClick={handleLogout} className="text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1 rounded-lg transition-colors flex items-center gap-2">
              <LogOut size={18}/> <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden min-h-[600px] flex flex-col border dark:border-slate-800">
            <div className="flex border-b dark:border-slate-800">
                <button onClick={() => setActiveTab('upload')} 
                  className={`flex-1 p-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors
                  ${activeTab === 'upload' ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600 dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <Upload size={18}/> Configuración Base de Datos
                </button>
                <button onClick={() => setActiveTab('query')} 
                  className={`flex-1 p-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors
                  ${activeTab === 'query' ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600 dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <Search size={18}/> Buscador Maestro
                </button>
            </div>

            <div className="p-4 md:p-8 flex-1 bg-slate-50/50 dark:bg-slate-950/50">
                {activeTab === 'upload' ? (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* PASO 1 */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-lg mb-4 dark:text-white flex items-center gap-2">
                              <span className="bg-primary-100 text-primary-700 w-6 h-6 rounded-full flex items-center justify-center text-xs ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-800">1</span>
                              Subir Base de Datos (.xlsx)
                            </h3>
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                              <div className="w-full">
                                <input type="file" accept=".xlsx" onChange={e => setFile(e.target.files[0])} 
                                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer border rounded-lg dark:bg-slate-900 dark:border-slate-600"/>
                              </div>
                              <button onClick={handleUpload} className="w-full md:w-auto bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 shadow-lg shadow-primary-500/30 transition-all">Procesar</button>
                            </div>
                        </div>

                        {/* PASO 2 */}
                        {(allColumns.length > 0 || config.dni_column) && (
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                             <h3 className="font-bold text-lg mb-4 dark:text-white flex items-center gap-2">
                                <span className="bg-primary-100 text-primary-700 w-6 h-6 rounded-full flex items-center justify-center text-xs ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-800">2</span>
                                Definir Columnas Clave
                             </h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Columna DNI</label>
                                  <select value={config.dni_column} onChange={(e) => setConfig({...config, dni_column: e.target.value})} className="w-full p-3 rounded-lg border bg-slate-50 dark:bg-slate-900 dark:border-slate-600 dark:text-white outline-none">
                                    <option value="">-- Seleccionar --</option>
                                    {allColumns.length > 0 ? allColumns.map(c => <option key={c} value={c}>{c}</option>) : <option value={config.dni_column}>{config.dni_column}</option>}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Columna Fecha Ingreso</label>
                                  <select value={config.date_column} onChange={(e) => setConfig({...config, date_column: e.target.value})} className="w-full p-3 rounded-lg border bg-slate-50 dark:bg-slate-900 dark:border-slate-600 dark:text-white outline-none">
                                    <option value="">-- Seleccionar --</option>
                                    {allColumns.length > 0 ? allColumns.map(c => <option key={c} value={c}>{c}</option>) : <option value={config.date_column}>{config.date_column}</option>}
                                  </select>
                                </div>
                             </div>
                          </div>
                        )}

                        {/* PASO 3 */}
                        {(allColumns.length > 0 || config.selected_columns.length > 0) && (
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                                  <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                      <span className="bg-primary-100 text-primary-700 w-6 h-6 rounded-full flex items-center justify-center text-xs ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-800">3</span>
                                      Columnas Visibles
                                  </h3>
                                  <div className="flex items-center gap-2 w-full md:w-auto">
                                      <input type="text" placeholder="Filtrar..." value={colSearch} onChange={(e) => setColSearch(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border bg-slate-50 dark:bg-slate-900 dark:border-slate-600 dark:text-white"/>
                                      <button onClick={() => toggleAll(true)} className="px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-200">Todo</button>
                                      <button onClick={() => toggleAll(false)} className="px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-200">Nada</button>
                                  </div>
                                </div>
                                <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar p-1">
                                  <div className="flex flex-wrap gap-2">
                                      {(allColumns.length > 0 ? filteredColumns : config.selected_columns).map(c => {
                                          const isActive = config.selected_columns.includes(c);
                                          return (
                                            <button key={c} onClick={() => toggleColumn(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 flex items-center gap-1 ${isActive ? 'bg-primary-100 border-primary-300 text-primary-700 dark:bg-primary-900/40 dark:border-primary-700 dark:text-primary-300 scale-105' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'}`}>
                                              {isActive && <CheckCircle size={12}/>} {c}
                                            </button>
                                          )
                                      })}
                                  </div>
                                </div>
                                <div className="mt-6 pt-6 border-t dark:border-slate-700">
                                  <button onClick={handleSaveConfig} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold shadow-lg shadow-green-500/20 transition-all flex justify-center items-center gap-2"><Upload size={20}/> Guardar Configuración</button>
                                </div>
                            </div>
                        )}
                        {msg.text && <div className={`p-4 rounded-lg text-center font-medium ${msg.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{msg.text}</div>}
                    </div>
                ) : (
                    // PESTAÑA QUERY ADMIN (ACTUALIZADA)
                    <div className="animate-in fade-in duration-500 flex flex-col h-full">
                        <div className="w-full max-w-2xl mx-auto">
                            <h3 className="text-center text-xl font-bold dark:text-white mb-2">Buscador Maestro</h3>
                            <p className="text-center text-slate-400 text-sm mb-6">Acceso total a la base de datos</p>
                            
                            <div className="relative mb-6">
                                <input type="text" placeholder="Escriba DNI para autocompletar..." value={queryDni} onChange={e => searchSuggestions(e.target.value)} 
                                    className="w-full p-4 pl-12 rounded-xl border shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none text-lg"/>
                                <Search className="absolute left-4 top-4 text-slate-400"/>
                                
                                {/* LISTA DE SUGERENCIAS */}
                                {suggestions.length > 0 && (
                                    <ul className="absolute z-10 w-full bg-white dark:bg-slate-800 shadow-2xl rounded-b-xl border dark:border-slate-700 mt-1 max-h-60 overflow-auto">
                                        {suggestions.map((s, i) => (
                                          <li key={i} 
                                            className="p-3 hover:bg-primary-50 dark:hover:bg-slate-700 cursor-pointer dark:text-slate-200 transition-colors border-b dark:border-slate-700 last:border-0" 
                                            onClick={() => selectSuggestion(String(s))}>
                                            {s}
                                          </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* RESULTADOS DE BÚSQUEDA ADMIN */}
                            {loadingSearch && <div className="text-center p-4"><Loader2 className="animate-spin mx-auto text-primary-600"/></div>}
                            
                            {adminSearchResult && (
                              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border dark:border-slate-700 overflow-hidden">
                                <div className="bg-slate-100 dark:bg-slate-900 p-3 border-b dark:border-slate-700 font-bold dark:text-white flex justify-between">
                                  <span>Ficha Completa del Empleado</span>
                                  <span className="text-primary-600">DNI: {queryDni}</span>
                                </div>
                                <div className="p-0 overflow-x-auto">
                                  <table className="w-full text-sm text-left">
                                    <tbody className="divide-y dark:divide-slate-700">
                                      {Object.entries(adminSearchResult).map(([key, val]) => (
                                        <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                          <td className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800 w-1/3 break-words">{key}</td>
                                          <td className="px-4 py-3 text-slate-900 dark:text-slate-200 break-words">{String(val)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

// --- PAGINA PRINCIPAL (CONSULTA USUARIO) ---
const HomePage = () => {
  const { dark, setDark } = useTheme();
  const [isModalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ dni: '', fecha_ingreso: '' });
  const [data, setData] = useState([]); // AHORA ES ARRAY
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setData([]); setSearched(false);
    try {
      const res = await axios.post(`${API_URL}/api/query/user`, formData);
      // El backend ahora devuelve un ARRAY de objetos
      setData(res.data);
      setSearched(true);
    } catch (err) {
      if(err.response?.status === 500 && err.response?.data?.detail.includes("configurado")) {
        setError("El sistema está en mantenimiento (Falta configuración).");
      } else {
        setError(err.response?.data?.detail || "Datos no encontrados.");
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* HEADER */}
      <header className="w-full p-4 flex justify-between items-center bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-40 border-b dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-primary-500/30">R</div>
          <span className="font-bold text-lg dark:text-white hidden sm:block tracking-tight">Consulta RESEMIN</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setDark(!dark)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-yellow-400 transition-all">
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all border border-slate-200 dark:border-slate-700"
          >
            <User size={18}/> <span className="hidden sm:inline">Ingresar Admin</span>
          </button>
        </div>
      </header>

      {/* CONTENIDO USUARIO */}
      <main className="flex-1 flex flex-col items-center p-4">
        {/* FORMULARIO */}
        <motion.div layout className={`w-full max-w-4xl transition-all duration-500 ${searched ? 'mt-4' : 'mt-20'}`}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 border dark:border-slate-800">
            {!searched && (
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold dark:text-white mb-2">Bienvenido</h1>
                    <p className="text-slate-500 text-sm">Consulta tu historial laboral completo.</p>
                </div>
            )}
            
            <form onSubmit={handleSearch} className={`grid gap-4 ${searched ? 'grid-cols-1 md:grid-cols-3 items-end' : 'grid-cols-1'}`}>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">DNI</label>
                <input type="text" required value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} 
                  className="w-full p-3 rounded-lg border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500" placeholder="Número de Documento"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Fecha Ingreso</label>
                <input type="date" required value={formData.fecha_ingreso} onChange={e => setFormData({...formData, fecha_ingreso: e.target.value})} 
                  className="w-full p-3 rounded-lg border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"/>
              </div>
              <button disabled={loading} className="w-full bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-lg font-bold transition-all flex justify-center items-center shadow-lg">
                 {loading ? <Loader2 className="animate-spin"/> : "Consultar"}
              </button>
            </form>
            {error && <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100 text-center">{error}</div>}
          </div>
        </motion.div>

        {/* TABLA DE RESULTADOS (EXCEL VIEW) */}
        {/* Aquí está la nueva funcionalidad solicitada */}
        <AnimatePresence>
            {searched && data.length > 0 && (
                <div className="w-full max-w-6xl">
                    <ExcelTable data={data} />
                </div>
            )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isModalOpen && <AuthModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onLoginSuccess={() => navigate('/admin-dashboard')} />}
      </AnimatePresence>
    </div>
  );
};

// --- ROUTER ---
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;