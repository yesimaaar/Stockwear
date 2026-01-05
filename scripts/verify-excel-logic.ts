
// Mock type definitions
type Stock = {
    cantidad: number;
    talla: { nombre: string } | null;
    almacen: { nombre: string } | null;
};

type Product = {
    codigo: string;
    nombre: string;
    categoria: { nombre: string } | null;
    color: string | null;
    precio: number;
    precio_base: number | null;
    descuento: number | null;
    stockMinimo: number;
    descripcion: string | null;
    proveedor: string | null;
    marca: string | null;
    estado: string;
    stock: Stock[];
};

// Logic extracted from GlobalExcelActions.tsx
function transformToExcelParams(productos: Product[]) {
    return productos.map(p => {
        const stockPorTallaMap = new Map<string, number>();
        const almacenesSet = new Set<string>();

        const stock = p.stock || [];
        stock.forEach((item) => {
            const tallaNombre = item.talla?.nombre;
            const almacenNombre = item.almacen?.nombre;
            const cantidad = item.cantidad;

            if (tallaNombre && tallaNombre !== 'none') {
                const current = stockPorTallaMap.get(tallaNombre) || 0;
                stockPorTallaMap.set(tallaNombre, current + cantidad);
            }
            if (almacenNombre) {
                almacenesSet.add(almacenNombre);
            }
        });

        const detalleStock = Array.from(stockPorTallaMap.entries())
            .map(([talla, cant]) => `${talla} (${cant})`)
            .join(", ");

        const almacenesStr = Array.from(almacenesSet).join(", ");

        return {
            Codigo: p.codigo,
            Nombre: p.nombre,
            Categoria: p.categoria?.nombre || '',
            Marca: p.marca || '',
            Color: p.color || "",
            Precio: p.precio,
            Costo: p.precio_base || 0,
            Descuento: p.descuento || 0,
            StockMinimo: p.stockMinimo,
            Descripcion: p.descripcion || "",
            Proveedor: p.proveedor || "",
            StockTotal: stock.reduce((sum, s) => sum + (s.cantidad || 0), 0),
            CantidadTallas: stockPorTallaMap.size,
            Almacen: almacenesStr,
            Talla: detalleStock,
            Estado: p.estado
        };
    });
}

// Test Data
const mockData: Product[] = [
    {
        codigo: "EJEMPLO001",
        nombre: "Camiseta Básica Negra",
        categoria: { nombre: "Camisetas" },
        marca: "Nike",
        color: "Negro",
        precio: 45000,
        precio_base: 25000,
        descuento: 0,
        stockMinimo: 5,
        descripcion: "Camiseta de algodón 100%",
        proveedor: "Textiles SA",
        estado: "activo",
        stock: [
            { cantidad: 10, talla: { nombre: "38" }, almacen: { nombre: "Principal" } },
            { cantidad: 5, talla: { nombre: "40" }, almacen: { nombre: "Principal" } },
            { cantidad: 8, talla: { nombre: "42" }, almacen: { nombre: "Principal" } }
        ]
    }
];

// Run
const result = transformToExcelParams(mockData);
console.log(JSON.stringify(result, null, 2));
