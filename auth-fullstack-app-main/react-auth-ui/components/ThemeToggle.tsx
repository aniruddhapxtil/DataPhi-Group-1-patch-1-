import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="fixed top-4 left-4 flex items-center space-x-2 z-50">
      <h3 className="text-sm text-gray-500 dark:text-gray-300">Switch Theme</h3>
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