import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
const NotFound = lazy(() => import("./pages/NotFound"));
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Properties = lazy(() => import("./pages/Properties"));
const Users = lazy(() => import("./pages/Users"));
const Commissions = lazy(() => import("./pages/Commissions"));
const MyCommissions = lazy(() => import("./pages/MyCommissions"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AgentDashboard = lazy(() => import("./pages/AgentDashboard"));
const PropertyDetails = lazy(() => import("./pages/PropertyDetails"));
const AuditHistory = lazy(() => import("./pages/AuditHistory"));

import { ProtectedRoute } from "./components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/signup"} component={Signup} />
      <Route path={"/"} component={Home} />
      
      {/* Public/Authenticated routes */}
      <ProtectedRoute path="/perfil" component={Profile} />
      <ProtectedRoute path="/imovel/:id" component={PropertyDetails} />
      
      {/* Agent & Admin routes */}
      <ProtectedRoute 
        path="/propriedades" 
        component={Properties} 
        allowedRoles={["user", "agent", "admin"]} 
      />
      <ProtectedRoute 
        path="/meu-dashboard" 
        component={AgentDashboard} 
        allowedRoles={["agent", "admin"]} 
      />
      <ProtectedRoute 
        path="/minhas-comissoes" 
        component={MyCommissions} 
        allowedRoles={["agent", "admin"]} 
      />
      
      {/* Admin only routes */}
      <ProtectedRoute 
        path="/usuarios" 
        component={Users} 
        allowedRoles={["admin"]} 
      />
      <ProtectedRoute 
        path="/comissoes" 
        component={Commissions} 
        allowedRoles={["admin"]} 
      />
      <ProtectedRoute 
        path="/admin" 
        component={AdminDashboard} 
        allowedRoles={["admin"]} 
      />
      <ProtectedRoute 
        path="/historico" 
        component={AuditHistory} 
        allowedRoles={["admin"]} 
      />
      
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center" role="status">Carregando...</div>}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
