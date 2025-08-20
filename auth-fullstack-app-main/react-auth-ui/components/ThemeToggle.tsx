"use client"; 

import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    // We've removed all Tailwind positioning classes and added a unique ID.
    // The positioning will now be handled by the global.css file.
    <div id="theme-toggle-container">
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
