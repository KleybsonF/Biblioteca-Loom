
const file = 'C:\\Users\\TSMX\\Desktop\\Projeto\\Biblioteca-Loom\\frontend\\category.html';
const fs = require('fs');

let content = fs.readFileSync(file, 'utf8');

// Replace the HTML
const oldHtml = <div class="search-section-inline">
        <div class="search-wrapper-inline">
            <i class="fas fa-search"></i>
            <input type="text" id="searchInput" placeholder="Buscar nesta categoria..." autocomplete="off">
        </div>
    </div>;

const newHtml = <div class="search-section">
        <div class="search-wrapper">
          <div class="search-input-wrap">
            <i class="fas fa-search"></i>
            <input type="text" id="searchInput" placeholder="Buscar nesta categoria..." autocomplete="off">
          </div>
  
          <div class="filter-group">
            <select id="filterSubcategory" class="filter-select" disabled>
              <option value="all">Todas as subcategorias</option>
            </select>
  
            <button id="btnClearFilters" class="btn-clear-filters hidden">
              <i class="fas fa-times"></i> Limpar filtros
            </button>
          </div>
        </div>
      </div>;

content = content.replace(oldHtml, newHtml);

// Insert filter logic in loadVideos
const oldLoadVideos = if (currentCategory !== "Arquivados") {
                    allVideos = allVideos.filter(v => v.category !== "Arquivados");
                };

const newLoadVideos = if (currentCategory !== "Arquivados") {
                    allVideos = allVideos.filter(v => v.category !== "Arquivados");
                }
                
                const subFilter = document.getElementById('filterSubcategory').value;
                if (subFilter && subFilter !== 'all') {
                    allVideos = allVideos.filter(v => v.subcategory === subFilter);
                };

content = content.replace(oldLoadVideos, newLoadVideos);

// Insert init logic
const initAnchor = searchTimeout = setTimeout(() => loadVideos(1), 400);
        });;

const initLogic = searchTimeout = setTimeout(() => { loadVideos(1); updateClearButton(); }, 400);
        });
        
        document.getElementById('filterSubcategory').addEventListener('change', () => {
            loadVideos(1);
            updateClearButton();
        });
        
        document.getElementById('btnClearFilters').addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('filterSubcategory').value = 'all';
            loadVideos(1);
            updateClearButton();
        });
        
        function updateClearButton() {
            const search = document.getElementById('searchInput').value;
            const sub = document.getElementById('filterSubcategory').value;
            const btn = document.getElementById('btnClearFilters');
            if (search || sub !== 'all') {
                btn.classList.remove('hidden');
            } else {
                btn.classList.add('hidden');
            }
        }
        
        LoomLib.fetchCategories().then(allCategories => {
            const subSelect = document.getElementById('filterSubcategory');
            if (currentCategory && allCategories[currentCategory]) {
                const subs = allCategories[currentCategory];
                if (subs && subs.length > 0) {
                    subSelect.innerHTML = '<option value="all">Todas as subcategorias</option>';
                    subs.forEach(sub => {
                        subSelect.innerHTML += \<option value="\">\</option>\;
                    });
                    subSelect.disabled = false;
                } else {
                    subSelect.innerHTML = '<option value="all">Nenhuma subcategoria</option>';
                    subSelect.disabled = true;
                }
            }
        });;

content = content.replace(initAnchor, initLogic);

fs.writeFileSync(file, content, 'utf8');
console.log('Done');

