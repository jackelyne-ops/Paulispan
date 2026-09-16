import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Clientes from "@/pages/Clientes";
import ClienteDetalhe from "@/pages/ClienteDetalhe";
import Produtos from "@/pages/Produtos";
import Pedidos from "@/pages/Pedidos";
import NovoPedido from "@/pages/NovoPedido";
import PedidoDetalhe from "@/pages/PedidoDetalhe";
import Financeiro from "@/pages/Financeiro";
import Devolucoes from "@/pages/Devolucoes";
import Logistica from "@/pages/Logistica";
import Promotores from "@/pages/Promotores";
import Analisar from "@/pages/Analisar";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster richColors position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="analisar" element={<Analisar />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="clientes/:id" element={<ClienteDetalhe />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="pedidos" element={<Pedidos />} />
            <Route path="pedidos/novo" element={<NovoPedido />} />
            <Route path="pedidos/:id" element={<PedidoDetalhe />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="devolucoes" element={<Devolucoes />} />
            <Route path="logistica" element={<Logistica />} />
            <Route path="promotores" element={<Promotores />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
