import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Properties from "./pages/Properties";
import Users from "./pages/Users";
import Commissions from "./pages/Commissions";
import MyCommissions from "./pages/MyCommissions";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import AgentDashboard from "./pages/AgentDashboard";
import PropertyDetails from "./pages/PropertyDetails";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/propriedades" component={Properties} />
      <Route path="/usuarios" component={Users} />
      <Route path="/comissoes" component={Commissions} />
      <Route path="/minhas-comissoes" component={MyCommissions} />
      <Route path="/perfil" component={Profile} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/meu-dashboard" component={AgentDashboard} />
      <Route path="/imovel/:id" component={PropertyDetails} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
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
