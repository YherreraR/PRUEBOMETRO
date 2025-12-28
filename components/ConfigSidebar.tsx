
import React from 'react';
import { DocumentSettings } from '../types';

interface Props {
  settings: DocumentSettings;
  setSettings: React.Dispatch<React.SetStateAction<DocumentSettings>>;
}

const ConfigSidebar: React.FC<Props> = ({ settings, setSettings }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const fontSizes: { label: string; value: DocumentSettings['fontSize'] }[] = [
    { label: 'XS', value: 'text-xs' },
    { label: 'S', value: 'text-sm' },
    { label: 'M', value: 'text-base' },
    { label: 'L', value: 'text-lg' },
    { label: 'XL', value: 'text-xl' },
  ];

  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold mb-4 text-slate-700 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Formato de Entrega
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Nombre Colegio</label>
          <input 
            type="text"
            name="schoolName"
            value={settings.schoolName}
            onChange={handleChange}
            className="w-full p-2 border rounded-md text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Docente</label>
          <input 
            type="text"
            name="teacherName"
            value={settings.teacherName}
            onChange={handleChange}
            className="w-full p-2 border rounded-md text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Color del Cabezal</label>
          <select 
            name="headerColor"
            value={settings.headerColor}
            onChange={handleChange}
            className="w-full p-2 border rounded-md text-sm"
          >
            <option value="bg-indigo-600">Índigo (Profesional)</option>
            <option value="bg-slate-800">Gris Oscuro (Clásico)</option>
            <option value="bg-teal-600">Teal (Moderno)</option>
            <option value="bg-white text-slate-900 border-b">Blanco (Minimalista)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input 
            type="checkbox"
            name="showInstructions"
            id="showInstructions"
            checked={settings.showInstructions}
            onChange={handleChange}
          />
          <label htmlFor="showInstructions" className="text-sm font-medium">Mostrar Instrucciones Generales</label>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Tamaño de Fuente</label>
          <div className="flex flex-wrap gap-2">
            {fontSizes.map(size => (
              <button
                key={size.value}
                onClick={() => setSettings(prev => ({ ...prev, fontSize: size.value }))}
                className={`flex-1 py-1.5 px-2 border rounded-md text-xs font-bold transition-all ${settings.fontSize === size.value ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`}
              >
                {size.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-slate-400">Selecciona el tamaño base para el documento.</p>
        </div>
      </div>
    </section>
  );
};

export default ConfigSidebar;
