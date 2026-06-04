import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { matchesSearch } from '../utils/search';

export default function SearchableSelect({ options, value, onChange, placeholder = 'Seleccionar...' }) {
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

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt => 
    matchesSearch(opt.label, searchTerm) || 
    matchesSearch(opt.value, searchTerm)
  );

  return (
    <div ref={wrapperRef} className="searchable-select-wrapper" style={{ position: 'relative', width: '100%' }}>
      <div 
        className="glass-input" 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} style={{ flexShrink: 0 }} />
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
              placeholder="Escriba para buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredOptions.length > 0 ? filteredOptions.map(opt => (
              <div 
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                style={{ 
                  padding: '8px', 
                  cursor: 'pointer', 
                  borderRadius: '4px',
                  background: value === opt.value ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                  color: value === opt.value ? 'var(--accent-color)' : 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.05)'}
                onMouseLeave={(e) => e.target.style.background = value === opt.value ? 'rgba(0, 240, 255, 0.1)' : 'transparent'}
              >
                {opt.label}
              </div>
            )) : (
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
