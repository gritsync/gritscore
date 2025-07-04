import { useTheme } from '../contexts/ThemeContext'

const ThemePreview = () => {
  const { themes, currentTheme, changeTheme } = useTheme()

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-theme-text mb-4">Theme Preview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(themes).map(([key, theme]) => (
          <div
            key={key}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
              currentTheme === key
                ? 'border-theme-primary shadow-lg'
                : 'border-theme-border hover:border-theme-primary hover:shadow-md'
            }`}
            onClick={() => changeTheme(key)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-theme-text">{theme.name}</h3>
              {currentTheme === key && (
                <div className="w-4 h-4 rounded-full bg-theme-primary"></div>
              )}
            </div>
            
            {/* Color palette preview */}
            <div className="grid grid-cols-5 gap-1 mb-3">
              {Object.entries(theme.primary).slice(0, 5).map(([shade, color]) => (
                <div
                  key={shade}
                  className="w-full h-8 rounded"
                  style={{ backgroundColor: color }}
                  title={`${shade}: ${color}`}
                ></div>
              ))}
            </div>
            
            {/* Accent color */}
            <div className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: theme.accent }}
              ></div>
              <span className="text-sm text-theme-primary">Accent: {theme.accent}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ThemePreview 