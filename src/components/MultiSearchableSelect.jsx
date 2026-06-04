import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { matchesSearch } from '../utils/search';

export default function MultiSearchableSelect({ options, value = [], onChange, placeholder = 'Seleccionar...', maxSelections = 5 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [wrapperRef]);

  // filter options
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options.slice(0, 50); // Only show first 50 to avoid lag when no search term
    return options.filter(opt => 
      matchesSearch(opt.label, searchTerm) || 
      matchesSearch(opt.value, searchTerm)
    ).slice(0, 100);
  }, [options, searchTerm]);

  const handleSelect = (val) => {
    if (value.includes(val)) return; // Already selected
    if (value.length >= maxSelections) return; // Reached max
    onChange([...value, val]);
    setSearchTerm('');
  };

  const handleRemove = (e, val) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== val));
  };

  return (
    <div ref={wrapperRef} className="searchable-select-wrapper" style={{ position: 'relative', width: '100%' }}>
      <div 
        className="glass-input" 
        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '42px', alignItems: 'center', cursor: 'pointer', padding: '6px 12px' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {value.length === 0 && <span style={{ color: 'var(--text-secondary)' }}>{placeholder}</span>}
        {value.map((v, i) => {
          const opt = options.find(o => o.value === v);
          return (
            <div key={v} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: i === 0 ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)', // Highlight principal
              color: i === 0 ? 'var(--accent-color)' : 'var(--text-primary)',
              padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem',
              border: i === 0 ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid transparent'
            }}>
              {i === 0 && <span style={{ fontSize: '0.7rem', opacity: 0.8, marginRight: '4px' }}>Principal:</span>}
              {opt ? opt.label : v}
              <X size={12} style={{ cursor: 'pointer', marginLeft: '4px' }} onClick={(e) => handleRemove(e, v)} />
            </div>
          );
        })}
        <div style={{ marginLeft: 'auto' }}><ChevronDown size={16} style={{ flexShrink: 0 }} /></div>
      </div>

      {isOpen && (
        <div className="glass-panel" style={{ 
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, 
          marginTop: '4px', padding: '8px', maxHeight: '250px', overflowY: 'auto',
          backgroundColor: 'var(--bg-color)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="glass-input" 
              style={{ width: '100%', paddingLeft: '28px', paddingRight: '8px', paddingTop: '6px', paddingBottom: '6px', fontSize: '0.85rem' }}
              placeholder={value.length >= maxSelections ? `Máximo ${maxSelections} seleccionados` : "Escriba para buscar (ej. Neumonía)"}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              disabled={value.length >= maxSelections}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredOptions.length > 0 ? filteredOptions.map(opt => {
              const isSelected = value.includes(opt.value);
              return (
                <div 
                  key={opt.value}
                  onClick={() => {
                    if (!isSelected) handleSelect(opt.value);
                  }}
                  style={{ 
                    padding: '8px', 
                    cursor: isSelected ? 'default' : 'pointer', 
                    borderRadius: '4px',
                    background: isSelected ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    color: isSelected ? 'var(--text-secondary)' : 'var(--text-primary)',
                    fontSize: '0.85rem',
                    opacity: isSelected ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.target.style.background = 'rgba(255, 255, 255, 0.05)' }}
                  onMouseLeave={(e) => { if (!isSelected) e.target.style.background = 'transparent' }}
                >
                  {opt.label}
                </div>
              );
            }) : (
              <div style={{ padding: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                No se encontraron resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
