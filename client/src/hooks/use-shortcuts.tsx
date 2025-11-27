import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from './use-auth';

export function useShortcuts() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Only trigger if no input/textarea is focused
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl/Cmd + Key combinations
      if (event.ctrlKey || event.metaKey) {
        switch(event.key.toLowerCase()) {
          case 'd':
            event.preventDefault();
            navigate('/');
            break;
          case 'v':
            event.preventDefault();
            navigate('/sales');
            break;
          case 'u':
            if (user?.role === 'admin') {
              event.preventDefault();
              navigate('/users');
            }
            break;
          case '/':
            event.preventDefault();
            // Focus search input
            const searchInput = document.querySelector('input[placeholder*="Pesquisar"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
            }
            break;
        }
      } else {
        // Single key shortcuts
        switch(event.key.toLowerCase()) {
          case 'h':
            navigate('/');
            break;
          case 't':
            // Toggle theme
            const themeButton = document.querySelector('button[aria-label*="tema"]');
            if (themeButton instanceof HTMLButtonElement) {
              themeButton.click();
            }
            break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, user]);
}
