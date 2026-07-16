// Base de datos de precios (data.js)
// Separación estructural solicitada para escalabilidad y mantenimiento (Fase 1: Local -> Fase 2: JSON/API)

window.costData = {
    "San Salvador": {
        "Comida": [
            { id: "c1", name: "Comida para 2 (Restaurante Medio, 3 Platos)", price: "$6.00" },
            { id: "c2", name: "Comida en restaurante de comida rápida (Combo)", price: "$7.50" },
            { id: "c3", name: "1 litro (1 qt.) de leche entera", price: "$1.40" },
            { id: "c4", name: "12 Huevos Normales", price: "$2.50" },
            { id: "c5", name: "1 kg (2 lb.) de Filetes de Pollo", price: "$3.50" },
            { id: "c6", name: "Comida Económica (Restaurante Barato)", price: "$3.50" },
            { id: "c7", name: "1 Barra de Pan Blanco (500g)", price: "$1.00" },
            { id: "c8", name: "Combo Big Mac (McDonalds)", price: "$7.50" }
        ],
        "Vivienda": [
            { id: "v1", name: "Apartamento (1 dormitorio) Centro Ciudad", price: "$950.00" },
            { id: "v2", name: "Apartamento (1 dormitorio) Fuera del Centro", price: "$650.00" },
            { id: "v3", name: "Servicios (Luz, agua, basura) 85 m2", price: "$85.00" },
            { id: "v4", name: "Internet (Residencial, 1 mes)", price: "$35.00" }
        ],
        "Transporte": [
            { id: "t1", name: "1 galón de gasolina regular", price: "$4.15" },
            { id: "t2", name: "Boleto de Ida (Transporte Local)", price: "$0.25" },
            { id: "t3", name: "Tarifa de Taxi (Inicio Normal + 1km)", price: "$7.50" },
            { id: "t4", name: "Renta de un coche compacto (Por día)", price: "$35.00" }
        ],
        "Cuidado Personal": [
            { id: "cp1", name: "Medicina para el resfriado (6 días)", price: "$8.00" },
            { id: "cp2", name: "1 caja de antibióticos", price: "$15.00" },
            { id: "cp3", name: "Visita médica privada (15 minutos)", price: "$35.00" },
            { id: "cp4", name: "Corte de pelo básico de hombre en barbería", price: "$6.00" }
        ],
        "Ropa y Calzado": [
            { id: "r1", name: "Pantalón vaquero (Levis, Zara o similar)", price: "$55.00" },
            { id: "r2", name: "Vestido de verano en tienda principal", price: "$40.00" },
            { id: "r3", name: "Par de zapatos deportivos (Nike, Adidas)", price: "$85.00" }
        ],
        "Entretenimiento": [
            { id: "e1", name: "2 entradas para el cine", price: "$12.00" },
            { id: "e2", name: "1 mes de gimnasio abonado", price: "$35.00" },
            { id: "e3", name: "Cena para 2 en restaurante", price: "$40.00" },
            { id: "e4", name: "Cerveza local en el supermercado (0.5 l)", price: "$1.50" }
        ],
        "Economía": [
            { id: "ec1", name: "Salario mínimo mensual (comercio/servicios, bruto — MTPS jun 2025)", price: "$408.80" }
        ]
    },
    "Santa Tecla": {
        "Comida": [
            { id: "c1", name: "Comida para 2 (Estimación)", price: "$5.50" },
            { id: "c8", name: "Combo Big Mac (McDonalds)", price: "$7.50" }
        ],
        "Vivienda": [
            { id: "v1", name: "Apartamento Centro (Valor Referencial)", price: "$850.00" },
            { id: "v3", name: "Servicios", price: "$80.00" }
        ],
        "Transporte": [
            { id: "t1", name: "1 galón de gasolina regular", price: "$4.15" }
        ],
        "Economía": [
            { id: "ec1", name: "Salario mínimo mensual (comercio/servicios, bruto — MTPS jun 2025)", price: "$408.80" }
        ]
    },
    "Santa Ana": {
        "Comida": [
            { id: "c1", name: "Comida para 2 (Estimación)", price: "$4.80" },
            { id: "c8", name: "Combo Big Mac (McDonalds)", price: "$7.50" }
        ],
        "Vivienda": [
            { id: "v1", name: "Apartamento Centro (Valor Referencial)", price: "$550.00" }
        ],
        "Transporte": [
            { id: "t1", name: "1 galón de gasolina regular", price: "$4.11" }
        ]
    },
    "San Miguel": {
        "Comida": [
            { id: "c1", name: "Comida para 2 (Estimación)", price: "$5.00" },
            { id: "c8", name: "Combo Big Mac (McDonalds)", price: "$7.50" }
        ],
        "Vivienda": [
            { id: "v1", name: "Apartamento Centro (Valor Referencial)", price: "$600.00" }
        ],
        "Transporte": [
            { id: "t1", name: "1 galón de gasolina regular", price: "$4.19" }
        ]
    },
    "Colombia": {
        "Comida": [
            { id: "c1", name: "Comida para 2 (Restaurante Medio, 3 Platos)", price: "$4.50" },
            { id: "c2", name: "Comida en restaurante de comida rápida (Combo)", price: "$6.00" },
            { id: "c8", name: "Combo Big Mac (McDonalds)", price: "$5.80" }
        ],
        "Vivienda": [
            { id: "v1", name: "Apartamento (1 dormitorio) Fuera del Centro", price: "$400.00" },
            { id: "v3", name: "Servicios (Luz, agua, basura)", price: "$65.00" }
        ],
        "Transporte": [
            { id: "t1", name: "1 galón de gasolina regular", price: "$3.90" },
            { id: "t2", name: "Boleto de Ida (Transporte Local)", price: "$0.70" }
        ],
        "Economía": [
            { id: "ec1", name: "Salario mínimo mensual neto (Después de impuestos)", price: "$340.00" }
        ]
    },
    "Rumania": {
        "Comida": [
            { id: "c1", name: "Comida para 2 (Restaurante Medio, 3 Platos)", price: "$9.50" },
            { id: "c2", name: "Comida en restaurante de comida rápida (Combo)", price: "$8.00" },
            { id: "c8", name: "Combo Big Mac (McDonalds)", price: "$8.00" }
        ],
        "Vivienda": [
            { id: "v1", name: "Apartamento (1 dormitorio) Fuera del Centro", price: "$450.00" },
            { id: "v3", name: "Servicios (Luz, agua, basura)", price: "$120.00" }
        ],
        "Transporte": [
            { id: "t1", name: "1 galón de gasolina regular", price: "$6.50" },
            { id: "t2", name: "Boleto de Ida (Transporte Local)", price: "$0.75" }
        ],
        "Ropa y Calzado": [
            { id: "r1", name: "Pantalón vaquero (Levis, Zara o similar)", price: "$60.00" }
        ],
        "Economía": [
            { id: "ec1", name: "Salario mínimo mensual neto (Después de impuestos)", price: "$850.00" }
        ]
    },
    "Miami, USA": {
        "Comida": [
            { id: "c1", name: "Comida para 2 (Restaurante Medio, 3 Platos)", price: "$100.00" },
            { id: "c8", name: "Combo Big Mac (McDonalds)", price: "$10.00" }
        ],
        "Vivienda": [
            { id: "v1", name: "Apartamento (1 dormitorio) Centro Ciudad", price: "$2800.00" },
            { id: "v3", name: "Servicios (Luz, agua, basura) 85 m2", price: "$180.00" }
        ],
        "Economía": [
            { id: "ec1", name: "Salario mínimo mensual neto (Después de impuestos)", price: "$3500.00" }
        ]
    },
    "Los Ángeles, USA": {
        "Comida": [
            { id: "c1", name: "Comida para 2 (Restaurante Medio, 3 Platos)", price: "$90.00" },
            { id: "c8", name: "Combo Big Mac (McDonalds)", price: "$11.00" }
        ],
        "Vivienda": [
            { id: "v1", name: "Apartamento (1 dormitorio) Centro Ciudad", price: "$2500.00" },
            { id: "v3", name: "Servicios (Luz, agua, basura) 85 m2", price: "$150.00" }
        ],
        "Economía": [
            { id: "ec1", name: "Salario mínimo mensual neto (Después de impuestos)", price: "$4200.00" }
        ]
    },
    "Nueva York, USA": {
        "Comida": [
            { id: "c1", name: "Comida para 2 (Restaurante Medio, 3 Platos)", price: "$120.00" },
            { id: "c8", name: "Combo Big Mac (McDonalds)", price: "$12.00" }
        ],
        "Vivienda": [
            { id: "v1", name: "Apartamento (1 dormitorio) Centro Ciudad", price: "$3800.00" },
            { id: "v3", name: "Servicios (Luz, agua, basura) 85 m2", price: "$170.00" }
        ],
        "Economía": [
            { id: "ec1", name: "Salario mínimo mensual neto (Después de impuestos)", price: "$4500.00" }
        ]
    },
    "España": {
        "Comida": [
            { id: "c1", name: "Comida para 2 (Restaurante Medio, 3 Platos)", price: "$60.00" },
            { id: "c8", name: "Combo Big Mac (McDonalds)", price: "$9.50" }
        ],
        "Vivienda": [
            { id: "v1", name: "Apartamento (1 dormitorio) Centro Ciudad", price: "$1200.00" }
        ],
        "Economía": [
            { id: "ec1", name: "Salario mínimo mensual neto (Después de impuestos)", price: "$1500.00" }
        ]
    },
    "México": {
         "Comida": [
            { id: "c1", name: "Comida para 2 (Restaurante Medio, 3 Platos)", price: "$35.00" },
            { id: "c8", name: "Combo Big Mac (McDonalds)", price: "$6.50" }
        ],
        "Vivienda": [
            { id: "v1", name: "Apartamento (1 dormitorio) Centro Ciudad", price: "$600.00" }
        ],
        "Economía": [
            { id: "ec1", name: "Salario mínimo mensual neto (Después de impuestos)", price: "$500.00" }
        ]
    }
};
