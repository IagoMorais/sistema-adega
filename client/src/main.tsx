import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./mobile-base.css";
import "./global-styles.css"; // Importar estilos globais para garantir tema claro

createRoot(document.getElementById("root")!).render(<App />);
