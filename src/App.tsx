
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { GuardProvider } from "@/contexts/GuardContext";
import RequireAuth from "@/components/RequireAuth";
import RequireOwner from "@/components/RequireOwner";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Account from "./pages/Account";
import Privacy from "./pages/Privacy";
import Vault from "./pages/Vault";
import Memory from "./pages/owner/Memory";
import OwnerLog from "./pages/owner/OwnerLog";
import Waitlist from "./pages/owner/Waitlist";
import ComingSoon from "./pages/ComingSoon";
import Stub from "./pages/owner/Stub";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <GuardProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/vk/callback" element={<AuthCallback />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/vault" element={<Vault />} />
              <Route
                path="/account"
                element={
                  <RequireAuth>
                    <Account />
                  </RequireAuth>
                }
              />
              <Route
                path="/owner"
                element={
                  <RequireOwner>
                    <Memory />
                  </RequireOwner>
                }
              />
              <Route
                path="/owner/memory"
                element={
                  <RequireOwner>
                    <Memory />
                  </RequireOwner>
                }
              />
              <Route
                path="/owner/log"
                element={
                  <RequireOwner>
                    <OwnerLog />
                  </RequireOwner>
                }
              />
              <Route
                path="/demo"
                element={
                  <ComingSoon pass="" alreadyInWaitlist={false} userName="Иван" />
                }
              />
              <Route
                path="/owner/waitlist"
                element={
                  <RequireOwner>
                    <Waitlist />
                  </RequireOwner>
                }
              />
              <Route
                path="/owner/users"
                element={
                  <RequireOwner>
                    <Stub
                      title="Пользователи"
                      icon="Users"
                      planned={[
                        "Список зарегистрированных",
                        "Поиск и фильтры",
                        "Карточка человека",
                        "Блокировка",
                      ]}
                    />
                  </RequireOwner>
                }
              />
              <Route
                path="/owner/products"
                element={
                  <RequireOwner>
                    <Stub
                      title="Товары"
                      icon="Package"
                      planned={["Добавление товаров", "Скидки и цены", "Категории", "Поставщики"]}
                    />
                  </RequireOwner>
                }
              />
              <Route
                path="/owner/settings"
                element={
                  <RequireOwner>
                    <Stub
                      title="Настройки"
                      icon="Settings"
                      planned={[
                        "Способы входа",
                        "Код в Telegram",
                        "Оформление сайта",
                        "Уведомления",
                      ]}
                    />
                  </RequireOwner>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </GuardProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;