import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Properties from "./pages/Properties";
import Users from "./pages/Users";
import Commissions from "./pages/Commissions";
import MyCommissions from "./pages/MyCommissions";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import AgentDashboard from "./pages/AgentDashboard";
import PropertyDetails from "./pages/PropertyDetails";
import AuditHistory from "./pages/AuditHistory";

import { ProtectedRoute } from "./components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/"} component={Home} />
      
      {/* Public/Authenticated routes */}
      <ProtectedRoute path="/perfil" component={Profile} />
      <ProtectedRoute path="/imovel/:id" component={PropertyDetails} />
      
      {/* Agent & Admin routes */}
      <ProtectedRoute 
        path="/propriedades" 
        component={Properties} 
        allowedRoles={["agent", "admin"]} 
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
