import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Forçar o uso do tema claro sempre
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Aplicar tema claro ao carregar
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add("light");
    
    // Forçar tema claro no localStorage
    localStorage.setItem("theme", "light");
    
    // Aplicar estilos específicos para garantir tema claro
    document.body.style.backgroundColor = "#FFFFFF";
    document.body.style.color = "#1A202C";
    
    // Remover qualquer classe que possa causar tema escuro
    document.body.classList.remove("dark");
    document.documentElement.classList.remove("dark");
    
    // Desativar transições durante a aplicação forçada do tema
    document.body.style.transition = "none";
    setTimeout(() => {
      document.body.style.transition = "";
    }, 100);
  }, []);

  // Manter a função de toggle, mas sempre retornar para light
  const toggleTheme = () => {
    setTheme("light");
    const root = window.document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    localStorage.setItem("theme", "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
