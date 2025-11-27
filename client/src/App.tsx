import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { useAuth } from "@/hooks/use-auth";
import Users from "@/pages/users";
import { ThemeProvider } from "@/hooks/use-theme";
import { useShortcuts } from "@/hooks/use-shortcuts";
import { Sidebar } from "@/components/sidebar";
import SellerPage from "@/pages/seller-page";

function Layout({ children }: { children: React.ReactNode }) {
  useShortcuts();

  return (
    <div className="min-h-screen lg:flex bg-white text-gray-900">
      <Sidebar />
      <main className="flex-1 pt-16 lg:pt-0 px-4 lg:px-8 py-8 bg-white">{children}</main>
    </div>
  );
}

function ProtectedLayout({ component: Component }: { component: () => React.JSX.Element }) {
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function MainApp() {
  const { user } = useAuth();

  if (user?.role === "admin") {
    return <ProtectedLayout component={Dashboard} />;
  }

  if (user?.role === "seller") {
    return <ProtectedLayout component={SellerPage} />;
  }

  return <ProtectedLayout component={Dashboard} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={MainApp} />
      <ProtectedRoute path="/users" component={() => <ProtectedLayout component={Users} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
