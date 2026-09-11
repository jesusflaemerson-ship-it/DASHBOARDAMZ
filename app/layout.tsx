import "./globals.css";

export const metadata = {
  title: "Painel Operacional — Marketplace",
  description: "Gestão de pedidos, financeiro e estoque para Amazon/Shopee",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
