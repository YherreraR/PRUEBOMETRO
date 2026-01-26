import React, { useRef } from 'react';
import { DocumentSettings } from '../types';

interface Props {
  settings: DocumentSettings;
  setSettings: React.Dispatch<React.SetStateAction<DocumentSettings>>;
}

const ConfigSidebar: React.FC<Props> = ({ settings, setSettings }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleHeaderImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, headerImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeHeaderImage = () => {
    setSettings(prev => ({ ...prev, headerImage: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveDefaults = () => {
    const defaults = {
      schoolName: settings.schoolName,
      teacherName: settings.teacherName,
      subject: settings.subject
    };
    localStorage.setItem('evaluapp_user_defaults', JSON.stringify(defaults));
    // Pequeño feedback visual o alerta simple
    const btn = document.getElementById('save-defaults-btn');
    if (btn) {
      const originalText = btn.innerText;
      btn.innerText = "¡Guardado!";
      btn.classList.add('bg-emerald-100', 'text-emerald-700', 'border-emerald-200');
      setTimeout(() => {
        btn.innerText = originalText;
        btn.classList.remove('bg-emerald-100', 'text-emerald-700', 'border-emerald-200');
      }, 2000);
    }
  };

  const fontSizes: { label: string; value: DocumentSettings['fontSize'] }[] = [
    { label: 'XS', value: 'text-xs' },
    { label: 'S', value: 'text-sm' },
    { label: 'M', value: 'text-base' },
    { label: 'L', value: 'text-lg' },
    { label: 'XL', value: 'text-xl' },
  ];

  // Estilos comunes para inputs limpios y claros
  const inputClass = "w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-300";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5";

  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
        <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>
        Formato de Entrega
      </h2>
      
      <div className="space-y-5">
        {/* SECCIÓN NUEVA: CARGA DE BANNER */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 border-dashed">
          <label className={labelClass}>Banner / Encabezado (Imagen)</label>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleHeaderImageUpload}
            accept="image/*"
            className="hidden" 
          />
          
          {!settings.headerImage ? (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-white border border-slate-300 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Subir Imagen Encabezado
            </button>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <img src={settings.headerImage} alt="Header Preview" className="w-full h-20 object-cover rounded-lg border border-slate-200" />
                <button 
                  onClick={removeHeaderImage}
                  className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600 transition-colors"
                  title="Quitar imagen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                <input 
                  type="checkbox"
                  name="showInfoWithHeader"
                  id="showInfoWithHeader"
                  checked={settings.showInfoWithHeader !== false}
                  onChange={handleChange}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                />
                <label htmlFor="showInfoWithHeader" className="text-[10px] font-bold text-slate-600 cursor-pointer select-none">
                  Mostrar textos (Colegio/Prof) bajo la imagen
                </label>
              </div>
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-2 text-center leading-tight">
            Sube una captura de tu membrete escolar para usarlo como encabezado.
          </p>
        </div>

        <div>
          <label className={labelClass}>Nombre Colegio</label>
          <input 
            type="text"
            name="schoolName"
            value={settings.schoolName}
            onChange={handleChange}
            className={inputClass}
            placeholder="Ej: Colegio San Mateo"
          />
        </div>

        <div>
          <label className={labelClass}>Docente</label>
          <input 
            type="text"
            name="teacherName"
            value={settings.teacherName}
            onChange={handleChange}
            className={inputClass}
            placeholder="Ej: Prof. Juan Pérez"
          />
        </div>

        <div>
          <label className={labelClass}>Asignatura</label>
          <input 
            type="text"
            name="subject"
            value={settings.subject}
            onChange={handleChange}
            className={inputClass}
            placeholder="Ej: Matemática"
          />
        </div>

        <div>
          <label className={labelClass}>Estilo del Encabezado (Color)</label>
          <div className="relative">
            <select 
              name="headerColor"
              value={settings.headerColor}
              onChange={handleChange}
              className={`${inputClass} appearance-none cursor-pointer`}
            >
              <option value="bg-indigo-600">Índigo (Profesional)</option>
              <option value="bg-slate-800">Gris Oscuro (Clásico)</option>
              <option value="bg-teal-600">Teal (Moderno)</option>
              <option value="bg-white text-slate-900 border-b">Blanco (Minimalista)</option>
            </select>
            <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <input 
            type="checkbox"
            name="showInstructions"
            id="showInstructions"
            checked={settings.showInstructions}
            onChange={handleChange}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
          />
          <label htmlFor="showInstructions" className="text-xs font-bold text-slate-600 cursor-pointer select-none">Mostrar Instrucciones Generales</label>
        </div>

        <div>
          <label className={labelClass}>Tamaño de Fuente Base</label>
          <div className="flex flex-wrap gap-2">
            {fontSizes.map(size => (
              <button
                key={size.value}
                onClick={() => setSettings(prev => ({ ...prev, fontSize: size.value }))}
                className={`flex-1 py-2 px-2 border rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${settings.fontSize === size.value ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'}`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        <button 
          id="save-defaults-btn"
          onClick={saveDefaults}
          className="w-full mt-2 py-2 text-xs font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-200 rounded-lg transition-all flex items-center justify-center gap-2 group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v11a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Guardar como Predeterminado
        </button>

      </div>
    </section>
  );
};

export default ConfigSidebar;