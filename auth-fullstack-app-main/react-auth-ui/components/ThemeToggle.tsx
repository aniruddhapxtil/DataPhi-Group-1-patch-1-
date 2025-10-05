"use client";
import { useTheme } from '../context/ThemeContext'; // Make sure this path is correct for your project

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    // This container is positioned by the #theme-toggle-container ID in your global.css
    <div id="theme-toggle-container">
      {/* This specific structure is required for the custom CSS to work */}
      <label className="switch">
        <input
          type="checkbox"
          // The toggle is checked when the theme is 'light'
          checked={theme === 'light'}
          onChange={toggleTheme}
        />
        <span className="slider"></span>
      </label>
    </div>
  );
}
