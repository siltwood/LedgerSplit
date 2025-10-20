import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { LABEL_FONT_WEIGHT } from '../styles/constants';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestion?: string;
  isMobile: boolean;
  label?: string;
}

export default function SearchInput({ value, onChange, suggestion, isMobile, label = 'Search' }: SearchInputProps) {
  return (
    <div style={{ marginBottom: '16px', maxWidth: isMobile ? '100%' : '600px' }}>
      <label style={{ display: 'block', marginBottom: '4px', fontWeight: LABEL_FONT_WEIGHT, color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
        {label}
      </label>
      <div style={{ position: 'relative', width: '100%' }}>
        {/* Ghost text for in-place suggestion */}
        {suggestion && value && (
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '12px',
            color: colors.text,
            opacity: 0.4,
            fontSize: '16px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden'
          }}>
            <span style={{ visibility: 'hidden' }}>{value}</span>{suggestion.slice(value.length)}
          </div>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Tab' && suggestion) {
              e.preventDefault();
              onChange(suggestion);
            }
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '16px',
            border: `2px solid ${colors.border}`,
            borderRadius: '8px',
            background: colors.surface,
            color: colors.text,
            outline: 'none',
            marginBottom: '8px',
            position: 'relative',
            zIndex: 1
          }}
        />
      </div>
    </div>
  );
}
