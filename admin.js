// Lógica principal para el Editor de Administrador
document.addEventListener('DOMContentLoaded', () => {
    
    const editorContainer = document.getElementById('editor-container');
    const btnGenerate = document.getElementById('btn-generate');
    const exportArea = document.getElementById('export-area');
    const exportOutput = document.getElementById('export-output');
    
    // costData viene expuesta globalmente por app.js (window.costData)
    const currentData = JSON.parse(JSON.stringify(window.costData)); // Clon profundo

    // Renderizar la UI de Edición iterando sobre la data jerárquica
    function renderEditor() {
        editorContainer.innerHTML = '';

        Object.keys(currentData).forEach(city => {
            const cityData = currentData[city];
            
            const cityDiv = document.createElement('div');
            cityDiv.className = 'city-group';
            
            let categoriesHtml = '';
            
            Object.keys(cityData).forEach(category => {
                const items = cityData[category];
                
                let inputsHtml = items.map((item, index) => `
                    <div class="input-row">
                        <div class="input-name">
                            <input type="text" 
                                   class="name-field"
                                   data-city="${city}" 
                                   data-category="${category}" 
                                   data-index="${index}" 
                                   value="${item.name}" 
                                   placeholder="Nombre del Producto">
                        </div>
                        <div class="input-price">
                            <input type="text" 
                                   class="price-field"
                                   data-city="${city}" 
                                   data-category="${category}" 
                                   data-index="${index}" 
                                   value="${item.price}" 
                                   placeholder="Ej. $5.00">
                        </div>
                    </div>
                `).join('');

                categoriesHtml += `
                    <div class="category-group">
                        <div class="category-title">${category}</div>
                        ${inputsHtml}
                    </div>
                `;
            });

            cityDiv.innerHTML = `
                <div class="city-title">📍 ${city}</div>
                ${categoriesHtml}
            `;
            
            editorContainer.appendChild(cityDiv);
        });
    }

    // Recolectar datos y generar JSON plano al hacer clic
    btnGenerate.addEventListener('click', () => {
        // Clonamos the currentData framework
        const updatedData = JSON.parse(JSON.stringify(currentData));
        
        // Iteramos por todas las filas de inputs (.input-row)
        const allRows = document.querySelectorAll('.input-row');
        
        allRows.forEach(row => {
            const nameInput = row.querySelector('.name-field');
            const priceInput = row.querySelector('.price-field');
            
            if(nameInput && priceInput) {
                const city = nameInput.getAttribute('data-city');
                const category = nameInput.getAttribute('data-category');
                const index = nameInput.getAttribute('data-index');
                
                updatedData[city][category][index].name = nameInput.value.trim();
                updatedData[city][category][index].price = priceInput.value.trim();
            }
        });

        // Parseamos a string con formato indentado para JS
        const jsString = `window.costData = ${JSON.stringify(updatedData, null, 4)};`;
        
        // Preservamos el init logic que va debajo de window.costData en app.js
        const finalOutputStr = `// Base de datos simulada (Mock Data) de precios generalizados
${jsString}

// Iconos por categoría
const categoryIcons = {
    "Comida": "🛒",
    "Vivienda": "🏠",
    "Transporte": "🚕",
    "Cuidado Personal": "⚕️",
    "Ropa y Calzado": "👕",
    "Entretenimiento": "🎬",
    "Economía": "📈"
};

// Función para renderizar los precios
function renderPrices(city) {
    const container = document.getElementById('prices-container');
    const currentCityLabel = document.getElementById('current-city');
    
    container.innerHTML = ''; // Limpiar
    
    // Normalizar la entrada para hacer coincidir con las llaves ignorando acentos/mayúsculas en un escenario real
    // En este caso nos basamos en formato Capitalizado.
    const cityData = window.costData[city];
    
    if (!cityData) {
        currentCityLabel.textContent = city;
        container.innerHTML = \`
            <div class="category-card" style="padding: 40px; text-align: center;">
                <p style="font-size: 1.2rem; margin-bottom: 20px;">Lo sentimos, aún no tenemos datos suficientes para <strong>\${city}</strong>.</p>
                <p style="color: #6b7280;">Intenta buscar: <span style="color: #0047AB; font-weight: 500;">San Salvador, Miami, USA o España</span>.</p>
            </div>
        \`;
        return;
    }

    currentCityLabel.textContent = city;

    // Recorrer categorías y agregar cards dinámicamente
    Object.keys(cityData).forEach(category => {
        const items = cityData[category];
        
        const card = document.createElement('div');
        card.className = 'category-card';
        
        let itemsHtml = items.map(item => \`
            <div class="price-item">
                <span class="item-name">\${item.name}</span>
                <span class="item-price">\${item.price}</span>
            </div>
        \`).join('');

        card.innerHTML = \`
            <div class="category-header">
                \${categoryIcons[category] || "📌"} \${category}
            </div>
            <div class="category-body">
                \${itemsHtml}
            </div>
        \`;
        
        container.appendChild(card);
    });
}

// Función para renderizar la comparativa de 2 ciudades
function renderComparison(city1, city2) {
    const container = document.getElementById('prices-container');
    const currentCityLabel = document.getElementById('current-city');
    
    container.innerHTML = '';
    
    const data1 = window.costData[city1];
    const data2 = window.costData[city2];
    
    if (!data1 || !data2) {
        currentCityLabel.textContent = \`\${city1 || '?'} vs \${city2 || '?'}\`;
        container.innerHTML = \`
            <div class="category-card" style="padding: 40px; text-align: center;">
                <p style="font-size: 1.2rem; margin-bottom: 20px;">Por favor selecciona dos ciudades válidas para comparar.</p>
            </div>
        \`;
        return;
    }

    currentCityLabel.textContent = \`\${city1} vs \${city2}\`;

    // Obtener todas las categorías únicas de ambas ciudades (por si una tiene categorias que otra no)
    const allCategories = new Set([...Object.keys(data1), ...Object.keys(data2)]);

    allCategories.forEach(category => {
        const items1 = data1[category] || [];
        const items2 = data2[category] || [];
        
        // Juntar todos los items por ID para mostrarlos juntos
        const itemMap = new Map();
        
        items1.forEach(item => {
            itemMap.set(item.id, { name: item.name, price1: item.price, price2: 'N/D' });
        });
        
        items2.forEach(item => {
            if (itemMap.has(item.id)) {
                itemMap.get(item.id).price2 = item.price;
            } else {
                itemMap.set(item.id, { name: item.name, price1: 'N/D', price2: item.price });
            }
        });

        const card = document.createElement('div');
        card.className = 'category-card compare-view'; // Añadida la clase compare-view
        
        let itemsHtml = Array.from(itemMap.values()).map(item => \`
            <div class="price-item">
                <span class="item-name" style="width: 100%; margin-bottom: 8px;">\${item.name}</span>
                <div style="display: flex; width: 100%; justify-content: space-between;">
                    <div style="flex: 1;">
                        <div class="compare-city-label">\${city1}</div>
                        <div class="compare-price-val" style="color: var(--primary-color);">\${item.price1}</div>
                    </div>
                    <div style="flex: 1; text-align: right;">
                        <div class="compare-city-label">\${city2}</div>
                        <div class="compare-price-val" style="color: var(--secondary-color);">\${item.price2}</div>
                    </div>
                </div>
            </div>
        \`).join('');

        card.innerHTML = \`
            <div class="category-header">
                \${categoryIcons[category] || "📌"} \${category}
            </div>
            <div class="category-body">
                \${itemsHtml}
            </div>
        \`;
        
        container.appendChild(card);
    });
}

// Función para normalizar consultas de búsqueda (Aliases / Typos)
function resolveCityQuery(query) {
    const q = query.toLowerCase().trim();
    
    // Diccionario de aliases ("lo que el usuario escribe" -> "Llave exacta en costData")
    const aliases = {
        "romania": "Rumania",
        "rumania": "Rumania",
        "us": "Estados Unidos (Nacional)",
        "usa": "Estados Unidos (Nacional)",
        "eeuu": "Estados Unidos (Nacional)",
        "estados unidos": "Estados Unidos (Nacional)",
        "e.e.u.u": "Estados Unidos (Nacional)",
        "spain": "España",
        "españa": "España",
        "mexico": "México",
        "colombia": "Colombia",
        "sv": "El Salvador",
        "el salvador": "El Salvador",
        "san salvador": "San Salvador",
        "santa tecla": "Santa Tecla",
        "santa ana": "Santa Ana",
        "san miguel": "San Miguel",
        "miami": "Miami, USA",
        "miami florida": "Miami, USA",
        "los angeles": "Los Ángeles, USA",
        "los ángeles": "Los Ángeles, USA",
        "la": "Los Ángeles, USA",
        "new york": "Nueva York, USA",
        "nueva york": "Nueva York, USA",
        "ny": "Nueva York, USA",
        "nyc": "Nueva York, USA"
    };

    return aliases[q] || null; // Devuelve la llave correcta o null si no se conoce
}

// Inicialización de Eventos en Cliente Frontend
document.addEventListener('DOMContentLoaded', () => {
    // Si la inicialización es solicitada para la pantalla principal (Home app)
    if(document.getElementById('current-city')){
        // 1. Mostrar ciudad por defecto
        renderPrices('San Salvador');

    // 2. Lógica de Búsqueda
    const searchBtn = document.getElementById('btn-search');
    const searchInput = document.getElementById('city-search');

    const triggerSearch = () => {
        const query = searchInput.value.trim();
        if (query) {
            const mappedTarget = resolveCityQuery(query);
            
            if (mappedTarget) {
                renderPrices(mappedTarget);
            } else {
                // Intento fallback: Capitalizar la primera letra de cada palabra como antes por si es una nueva ciudad no mapeada
                const fallbackQuery = query.toLowerCase().split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                renderPrices(fallbackQuery);
            }
            
            window.scrollTo({ top: document.querySelector('.content').offsetTop - 100, behavior: 'smooth' });
        }
    };

    searchBtn.addEventListener('click', triggerSearch);
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            triggerSearch();
        }
    });

    // 3. Tabs Lógica (Búsqueda Sencilla vs Comparar)
    const tabs = document.querySelectorAll('.tab-btn');
    const searchModeBox = document.getElementById('search-mode');
    const compareModeBox = document.getElementById('compare-mode');
    let currentMode = 'search-mode';

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const target = tab.getAttribute('data-target');
            currentMode = target;
            
            if (target === 'search-mode') {
                searchModeBox.classList.remove('hidden-mode');
                compareModeBox.classList.add('hidden-mode');
                // Restaurar vista sencilla
                renderPrices('San Salvador'); 
                searchInput.value = '';
            } else {
                searchModeBox.classList.add('hidden-mode');
                compareModeBox.classList.remove('hidden-mode');
                // Restaurar vista comparativa usando selects por defecto
                const c1 = document.getElementById('compare-city-1').value;
                const c2 = document.getElementById('compare-city-2').value;
                renderComparison(c1 || 'San Salvador', c2 || 'Santa Tecla');
            }
        });
    });

    // 4. Lógica de Botón Comparar
    const compareBtn = document.getElementById('btn-compare');
    compareBtn.addEventListener('click', () => {
        const city1 = document.getElementById('compare-city-1').value;
        const city2 = document.getElementById('compare-city-2').value;
        
        if (city1 && city2) {
            renderComparison(city1, city2);
            window.scrollTo({ top: document.querySelector('.content').offsetTop - 100, behavior: 'smooth' });
        } else {
            alert('Por favor selecciona dos ciudades para comparar.');
        }
    });

    // 5. Selección de Ciudades Populares en el Sidebar
    const cityLinks = document.querySelectorAll('.city-list li');
    cityLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const city = e.target.getAttribute('data-city');
            
            if (currentMode === 'search-mode') {
                renderPrices(city);
                searchInput.value = city;
            } else {
                // Si estamos en modo comparar, cambiamos la ciudad de destino
                const select2 = document.getElementById('compare-city-2');
                select2.value = city;
                const city1 = document.getElementById('compare-city-1').value;
                renderComparison(city1 || 'San Salvador', city);
            }
            
            
            // Scroll suave hacia la sección de resultados
            window.scrollTo({ top: document.querySelector('.content').offsetTop - 100, behavior: 'smooth' });
        });
    });
    }
});`;
        
        exportOutput.value = finalOutputStr;
        exportArea.style.display = 'block';
        
        // Efecto scroll abajo
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });

    // Iniciar
    renderEditor();
});
