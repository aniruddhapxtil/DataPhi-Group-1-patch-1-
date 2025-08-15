import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="fixed top-8 left-8 z-50">
      <label className="switch">
        <input 
          type="checkbox" 
          checked={theme === 'light'} 
          onChange={toggleTheme} 
        />
        <span className="slider"></span>
      </label>
    </div>
  );
}
