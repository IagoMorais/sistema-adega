import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  X,
  Home,
  Users,
  ShoppingCart,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  onClose?: () => void;
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

export function Sidebar({ onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/auth");
        onClose?.();
      },
    });
  };

  const navItems = useMemo<NavItem[]>(() => {
    switch (user?.role) {
      case "admin":
        return [
          { icon: Home, label: "Dashboard", path: "/" },
          { icon: Users, label: "Usuários", path: "/users" },
        ];
      case "seller":
        return [{ icon: ShoppingCart, label: "PDV", path: "/" }];
      default:
        return [{ icon: Home, label: "Início", path: "/" }];
    }
  }, [user?.role]);

  return (
    <div className="flex h-full flex-col bg-white text-gray-900 border-r border-gray-200 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 p-4 bg-white">
        <h1 className="text-xl font-bold text-blue-600">Gestão Estoque</h1>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-blue-50 text-gray-600 hover:text-gray-900 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-4 bg-white">
        <ul className="space-y-3">
          {navItems.map(({ icon: Icon, label, path }) => (
            <li key={path}>
              <Link
                href={path}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors font-medium ${
                  location === path
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-gray-700 border border-gray-100 hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600"
                }`}
                onClick={onClose}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50">
        <div className="flex items-center gap-3 rounded-md px-3 py-2 bg-white shadow-sm border border-gray-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
            {user?.username?.slice(0, 2).toUpperCase() ?? "US"}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-bold text-gray-900">{user?.username ?? "Usuário"}</p>
            <p className="text-xs text-gray-600">
              {user?.role
                ? {
                  admin: "Administrador",
                  seller: "Vendedor",
                }[user.role] || user.role
                : "Visitante"}
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          className="w-full justify-start gap-3 bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-red-600 shadow-sm"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </Button>
      </div>
    </div>
  );
}
