const MENU_ITEMS = [
    { icon: "🖥️", label: "Caixa" },
    { icon: "📦", label: "Estoque", active: true },
    { icon: "👤", label: "Cadastros" },
    { icon: "💰", label: "Financeiro" },
    { icon: "📋", label: "Fiscal" },
    { icon: "📊", label: "Relatórios" },
];

const PRODUCTS = [
    { code: "0001", name: "Dipirona 500mg — cx 20cp", category: "Analgésico", qty: 342, price: 8.9 },
    { code: "0002", name: "Amoxicilina 500mg — cx 15cp", category: "Antibiótico", qty: 87, price: 22.5 },
    { code: "0003", name: "Losartana 50mg — cx 30cp", category: "Anti-hipertensivo", qty: 215, price: 14.3 },
    { code: "0004", name: "Omeprazol 20mg — cx 28cp", category: "Antiúlcera", qty: 3, price: 11.8 },
    { code: "0005", name: "Paracetamol 750mg — cx 20cp", category: "Analgésico", qty: 520, price: 6.5 },
    { code: "0006", name: "Dexametasona creme 10g", category: "Corticóide", qty: 45, price: 18.9 },
    { code: "0007", name: "Insulina NPH 100UI — frasco", category: "Antidiabético", qty: 2, price: 42.0 },
    { code: "0008", name: "Azitromicina 500mg — cx 3cp", category: "Antibiótico", qty: 128, price: 19.7 },
];

const LOW_STOCK_THRESHOLD = 5;

export function DemoPage() {
    return (
        <div className="flex h-screen flex-col bg-gray-50" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
            {/* Header */}
            <header className="flex items-center justify-between bg-[#5B2D8E] px-6 py-3 text-white shadow-md">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-sm font-bold">
                        L
                    </div>
                    <h1 className="text-[15px] font-semibold tracking-tight">Linx Big Farma</h1>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <span className="text-purple-200">Farmácia Central</span>
                    <span className="text-purple-300">—</span>
                    <span className="flex items-center gap-1.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[11px]">
                            AS
                        </span>
                        <span className="text-purple-100">Operador: Ana Silva</span>
                    </span>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="flex w-56 flex-col border-r border-gray-200 bg-white shadow-sm">
                    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
                        {MENU_ITEMS.map((item) => (
                            <button
                                key={item.label}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors ${item.active
                                        ? "bg-[#5B2D8E]/10 font-medium text-[#5B2D8E]"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                                    }`}
                            >
                                <span className="text-base">{item.icon}</span>
                                {item.label}
                                {item.active && (
                                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#5B2D8E]" />
                                )}
                            </button>
                        ))}
                    </nav>
                    <div className="border-t border-gray-100 px-4 py-3 text-[11px] text-gray-400">
                        v3.42.1 — Linx S.A.
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-auto p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">Consulta de Estoque</h2>
                            <p className="text-xs text-gray-400">Produtos disponíveis em tempo real</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Buscar produto..."
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none transition-colors placeholder:text-gray-300 focus:border-[#5B2D8E]/40 focus:ring-2 focus:ring-[#5B2D8E]/10"
                            />
                            <button className="rounded-lg bg-[#5B2D8E] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#4a2474]">
                                Filtrar
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/80">
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Código
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Produto
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Categoria
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Quantidade
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Preço Unit.
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {PRODUCTS.map((p, idx) => {
                                    const isLow = p.qty <= LOW_STOCK_THRESHOLD;
                                    return (
                                        <tr
                                            key={p.code}
                                            className={`border-b border-gray-50 transition-colors hover:bg-gray-50/50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                                                } ${isLow ? "bg-red-50/60 hover:bg-red-50" : ""}`}
                                        >
                                            <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.code}</td>
                                            <td className="px-4 py-3 font-medium text-gray-700">{p.name}</td>
                                            <td className="px-4 py-3 text-gray-500">{p.category}</td>
                                            <td className="px-4 py-3 text-center">
                                                {isLow ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                                                        ⚠ {p.qty}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-600">{p.qty}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-700">
                                                R$ {p.price.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-3 text-right text-xs text-gray-400">
                        {PRODUCTS.length} produtos encontrados
                    </div>
                </main>
            </div>
        </div>
    );
}
