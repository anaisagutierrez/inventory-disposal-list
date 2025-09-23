// Get references to DOM elements
const itemSearch = document.getElementById('item-search');
const searchBtn = document.getElementById('search-btn');
const refreshBtn = document.getElementById('refresh-btn');
const productList = document.getElementById('product-list');
const loadingIndicatorElement = document.getElementById('loading-indicator');

// New DOM references for the disposal list feature
const disposalItemsTableBody = document.getElementById('disposal-items-table-body');
const unknownItemBtn = document.getElementById('unknown-item-btn');
const totalCostSummary = document.getElementById('total-cost-summary');
const totalQuantitySummary = document.getElementById('total-quantity-summary'); // New DOM reference

// Pagination elements
const paginationControls = document.getElementById('pagination-controls');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageInfoSpan = document.getElementById('page-info');

// New disposal list pagination elements
const disposalPaginationControls = document.getElementById('disposal-pagination-controls');
const prevDisposalPageBtn = document.getElementById('prev-disposal-page-btn');
const nextDisposalPageBtn = document.getElementById('next-disposal-page-btn');
const disposalPageInfoSpan = document.getElementById('disposal-page-info');

// Global Variables
let allProductsData = [];
let currentDisplayedProducts = [];
let selectedItem = null; // Store the currently selected item object
const itemsPerPage = 12;
let currentPage = 1;
let totalPages = 1;

// Global variables for disposal list pagination
let disposalItemsData = {};
let currentDisposalPage = 1;
const disposalItemsPerPage = 12;
let totalDisposalPages = 1;

const configurations = {
    'GREATDEALS': {
        title: 'Great & Good Deals',
        jsonFile: 'items-GREATDEALS.json'
    },
    'LASTCHANCE': {
        title: 'Last Chance Wholesale',
        jsonFile: 'items-LASTCHANCE.json'
    },
    'BROTHERSHOME': {
        title: 'Brothers Home Equipment',
        jsonFile: 'items-BROTHERSHOME.json'
    },
    'VICTORIA': {
        title: 'Victoria',
        jsonFile: 'items-VICTORIA.json'
    },
};

// --- Firebase Configuration ---
// The provided configuration details have been added here
const firebaseConfig = {
    apiKey: "AIzaSyB1LCgmA9eb1tNsmdmQTuPGeYRKhet4RaWM",
    authDomain: "language-entry.firebaseapp.com",
    databaseURL: "https://language-entry-default-rtdb.firebaseio.com",
    projectId: "language-entry",
    storageBucket: "language-entry.firebasestorage.app",
    messagingSenderId: "72772945167",
    appId: "1:72772945167:web:3a6f9d2c3e2083952daa7a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const disposalListRef = database.ref('inventorydisposal');
// --- End Firebase Configuration ---

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

const storeName = getUrlParameter('store').toUpperCase() || 'GREATDEALS';
const currentConfig = configurations[storeName] || {
    title: 'Great & Good Deals',
    jsonFile: 'items-GREATDEALS.json'
};
const jsonFileName = currentConfig.jsonFile || 'items-GREATDEALS.json';
// document.getElementById('page-header').textContent = `🛍️ Item Search - ${currentConfig.title}`;

function getProducts() {
    return new Promise((resolve, reject) => {
        fetch(jsonFileName)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const productList = data.map((product, index) => ({
                    id: product.ITEM || `unique-id-${index}`,
                    ...product
                }));
                productList.sort((a, b) => {
                    const descriptionA = String(a.DESCRIPTION || '').trimStart();
                    const descriptionB = String(b.DESCRIPTION || '').trimStart();
                    return descriptionA.localeCompare(descriptionB);
                });
                allProductsData = productList;
                resolve(productList);
            })
            .catch(error => {
                console.error('Error fetching products from JSON:', error);
                reject(error);
            });
    });
}

function renderProducts(product) {
    const productItem = document.createElement('li');
    productItem.className = 'item-card';

    const productInfo = document.createElement('span');
    productInfo.classList.add('product-info');

    let textContent = '';
    if (product.ITEM !== undefined) {
        textContent += `#${product.ITEM}`;
    }
    if (product.DESCRIPTION) {
        if (textContent) {
            textContent += ' / ';
        }
        textContent += product.DESCRIPTION;
    }
    productInfo.textContent = textContent;
    productItem.appendChild(productInfo);

    // Create the "Add" button
    const addButton = document.createElement('button');
    addButton.classList.add('btn', 'btn-primary', 'add-btn-left');
    addButton.innerHTML = `<i class="fa-solid fa-plus"></i> `;
    
    // Add event listener to the button
    addButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent the list item's click event from firing
        addItemToTableAndSave(product);
    });

    productItem.appendChild(addButton);
    productList.appendChild(productItem);
}

function showLoadingIndicator() {
    loadingIndicatorElement.classList.remove('hidden');
}

function hideLoadingIndicator() {
    loadingIndicatorElement.classList.add('hidden');
}

// Function to add the selected item to the table and save to database
function addItemToTableAndSave(product) {
    if (!product) {
        alert("Product information not available.");
        return;
    }
    const timestamp = new Date().toLocaleString();
    console.log("Adding item to disposal list:", product);
    const newEntry = {
        itemNumber: product.ITEM,
        description: product.DESCRIPTION,
        quantity: 1,
        cost: product['GREAT DEALS PRICE COST'].toFixed(2),
        timestamp: timestamp,
       
        isUnknownItem: false
    };
    
    // Push the new item to the database
    disposalListRef.push(newEntry)
        .then(() => {
            console.log("Item added and saved to the database!");
            updateTotalQuantitySummary(); // Update total quantity after adding
        })
        .catch(error => {
            console.error("Error saving data to Firebase:", error);
            alert("An error occurred while adding the item. Please check the console for details.");
        });
}

// New function to add an unknown item to the database
function addUnknownItem() {
    const timestamp = new Date().toLocaleString();
    const newEntry = {
        itemNumber: "",
        description: "",
        quantity: 1,
        cost: 0.00,
        timestamp: timestamp,
        isUnknownItem: true
    };
    
    disposalListRef.push(newEntry)
        .then(() => {
            console.log("Unknown item added to the database!");
            updateTotalQuantitySummary(); // Update total quantity after adding
        })
        .catch(error => {
            console.error("Error adding unknown item to Firebase:", error);
            alert("An error occurred while adding the unknown item. Please check the console for details.");
        });
}


// Function to handle updating values in Firebase
function updateValueInFirebase(event) {
    const input = event.target;
    const firebaseKey = input.closest('tr').dataset.firebaseKey;
    let updateObject = {};

    if (input.classList.contains('quantity-input')) {
        const newQuantity = parseInt(input.value, 10);
        if (!isNaN(newQuantity) && newQuantity > 0) {
            updateObject.quantity = newQuantity;
        } else {
            // Revert to the last valid value or 1 if the input is invalid
            input.value = input.dataset.originalValue || 1;
            return;
        }
    } else if (input.classList.contains('item-number-input')) {
        updateObject.itemNumber = input.value;
    } else if (input.classList.contains('description-input')) {
        updateObject.description = input.value;
    } else if (input.classList.contains('cost-input')) {
        const newCost = parseFloat(input.value);
        if (!isNaN(newCost) && newCost >= 0) {
            updateObject.cost = newCost.toFixed(2);
        } else {
            // Revert to the last valid value or 0 if the input is invalid
            input.value = input.dataset.originalValue || '0.00';
            return;
        }
    }
    
    if (firebaseKey && Object.keys(updateObject).length > 0) {
        disposalListRef.child(firebaseKey).update(updateObject)
            .then(() => {
                console.log("Value updated in database.");
                updateTotalCostSummary();
                updateTotalQuantitySummary(); // Update total quantity after updating
            })
            .catch(error => {
                console.error("Error updating value in database:", error);
            });
    }
}


// Function to handle removing an item from the table and the database
function removeTableRow(event) {
    if (event.target.classList.contains('remove-btn')) {
        const row = event.target.closest('tr');
        const firebaseKey = row.dataset.firebaseKey;
        
        // Get the description from the row
        const descriptionCell = row.querySelector('.description-input') || row.children[1];
        const description = descriptionCell.value || descriptionCell.textContent;

        // Add the description to the confirmation message
        if (confirm(`Are you sure you want to remove this item: "${description}"? This action cannot be undone.`)) {
            if (firebaseKey) {
                disposalListRef.child(firebaseKey).remove()
                    .then(() => {
                        console.log("Item removed from database.");
                        updateTotalCostSummary();
                        updateTotalQuantitySummary(); // Update total quantity after removing
                    })
                    .catch(error => {
                        console.error("Error removing item from database:", error);
                    });
            } else {
                console.warn("Could not find Firebase key to remove item.");
                row.remove();
            }
        }
    }
}

// Function to load the disposal list from Firebase on page load and handle pagination
function loadDisposalListFromFirebase() {
    disposalListRef.on('value', (snapshot) => {
        disposalItemsData = snapshot.val();
        currentDisposalPage = 1; // Reset to the first page when data changes
        renderDisposalPage();
        updateTotalCostSummary();
        updateTotalQuantitySummary(); // Update total quantity after initial load
    }, (error) => {
        console.error("Error loading disposal list from Firebase:", error);
    });
}

// New function to calculate and update the total cost
function updateTotalCostSummary() {
    let totalCost = 0;
    if (disposalItemsData) {
        Object.values(disposalItemsData).forEach(item => {
            const cost = parseFloat(item.cost);
            const quantity = parseInt(item.quantity, 10);
            if (!isNaN(cost) && !isNaN(quantity)) {
                totalCost += cost * quantity;
            }
        });
    }
    totalCostSummary.textContent = `Total Cost: $${totalCost.toFixed(2)}`;
}

// New function to calculate and update the total quantity
function updateTotalQuantitySummary() {
    let totalQuantity = 0;
    if (disposalItemsData) {
        Object.values(disposalItemsData).forEach(item => {
            const quantity = parseInt(item.quantity, 10);
            if (!isNaN(quantity)) {
                totalQuantity += quantity;
            }
        });
    }
    totalQuantitySummary.textContent = `Total Quantity: ${totalQuantity}`;
}


function renderDisposalPage() {
    disposalItemsTableBody.innerHTML = '';
    if (!disposalItemsData) {
        disposalPaginationControls.classList.add('hidden');
        return;
    }

    const sortedKeys = Object.keys(disposalItemsData).sort((a, b) => {
        return new Date(disposalItemsData[b].timestamp) - new Date(disposalItemsData[a].timestamp);
    });
    
    totalDisposalPages = Math.ceil(sortedKeys.length / disposalItemsPerPage);
    const startIndex = (currentDisposalPage - 1) * disposalItemsPerPage;
    const endIndex = startIndex + disposalItemsPerPage;
    const keysToRender = sortedKeys.slice(startIndex, endIndex);

    keysToRender.forEach(key => {
        const item = disposalItemsData[key];
        const newRow = document.createElement('tr');
        newRow.dataset.firebaseKey = key;
        
        const isUnknown = item.isUnknownItem === true;

        let itemNumberCell = `<td>${isUnknown ? `<input type="text" class="item-number-input" value="${item.itemNumber || ''}" placeholder="Enter number...">` : item.itemNumber}</td>`;
        let descriptionCell = `<td>${isUnknown ? `<input type="text" class="description-input" value="${item.description || ''}" placeholder="Enter description...">` : item.description}</td>`;
        let costCell = `<td>${isUnknown ? `<input type="number" step="0.01" class="cost-input" value="${item.cost || '0.00'}" min="0">` : item.cost}</td>`;

        newRow.innerHTML = `
            ${itemNumberCell}
            ${descriptionCell}
            <td class="quantity-cell"><input type="number" class="quantity-input" value="${item.quantity}" min="1"></td>
            ${costCell}
            <td>${item.timestamp}</td>
            <td><button class="remove-btn">Remove</button></td>
        `;
        disposalItemsTableBody.appendChild(newRow);
    });

    renderDisposalPaginationControls();

    if (sortedKeys.length > disposalItemsPerPage) {
        disposalPaginationControls.classList.remove('hidden');
    } else {
        disposalPaginationControls.classList.add('hidden');
    }
}

function renderDisposalPaginationControls() {
    disposalPageInfoSpan.textContent = `Page ${currentDisposalPage} of ${totalDisposalPages}`;
    prevDisposalPageBtn.disabled = currentDisposalPage === 1;
    nextDisposalPageBtn.disabled = currentDisposalPage === totalDisposalPages || totalDisposalPages === 0;
}

function changeDisposalPage(direction) {
    if (direction === 'prev' && currentDisposalPage > 1) {
        currentDisposalPage--;
    } else if (direction === 'next' && currentDisposalPage < totalDisposalPages) {
        currentDisposalPage++;
    }
    renderDisposalPage();
}

async function searchProducts() {
    const searchValue = itemSearch.value.trim().toLowerCase();
    showLoadingIndicator();

    if (searchValue === '') {
        currentDisplayedProducts = allProductsData;
        currentPage = 1;
        renderCurrentPage();
        hideLoadingIndicator();
        return;
    }

    try {
        let matchingProducts = allProductsData.filter(product => {
            const description = String(product && product.DESCRIPTION || '').toLowerCase();
            const item = String(product && product.ITEM || '').toLowerCase();
            return description.includes(searchValue) || item.includes(searchValue);
        });

        if (searchValue !== '') {
            matchingProducts.sort((a, b) => {
                const itemA = String(a.ITEM || '');
                const itemB = String(b.ITEM || '');
                const descriptionA = String(a.DESCRIPTION || '').toLowerCase();
                const descriptionB = String(b.DESCRIPTION || '').toLowerCase();

                const aIsExactMatch = itemA === searchValue;
                const bIsExactMatch = itemB === searchValue;

                if (aIsExactMatch && !bIsExactMatch) {
                    return -1;
                } else if (!aIsExactMatch && bIsExactMatch) {
                    return 1;
                } else {
                    return descriptionA.localeCompare(descriptionB);
                }
            });
        }

        currentDisplayedProducts = matchingProducts;
        currentPage = 1;
        renderCurrentPage();
    } catch (error) {
        console.error('Error during search:', error);
        productList.innerHTML = '<p>Error searching for products.</p>';
        renderPaginationControls();
    } finally {
        hideLoadingIndicator();
    }
}

async function loadProducts() {
    showLoadingIndicator();
    try {
        const allProducts = await getProducts();
        currentDisplayedProducts = allProducts;
        currentPage = 1;
        renderCurrentPage();
    } catch (error) {
        console.error('Error loading products:', error);
        productList.innerHTML = '<p>Error loading products.</p>';
        renderPaginationControls();
    } finally {
        hideLoadingIndicator();
    }
}

function renderCurrentPage() {
    productList.innerHTML = '';
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const productsToRender = currentDisplayedProducts.slice(startIndex, endIndex);

    if (productsToRender.length === 0 && currentDisplayedProducts.length > 0) {
        if (currentPage > 1) {
            currentPage--;
            renderCurrentPage();
            return;
        } else {
            productList.innerHTML = '<p>No products found.</p>';
        }
    } else if (productsToRender.length === 0 && currentDisplayedProducts.length === 0) {
        productList.innerHTML = '<p>No products found.</p>';
    } else {
        productsToRender.forEach(renderProducts);
    }

    renderPaginationControls();

    if (paginationControls) {
        if (currentDisplayedProducts.length > 0) {
            paginationControls.classList.remove('hidden');
        } else {
            paginationControls.classList.add('hidden');
        }
    }
}

function renderPaginationControls() {
    totalPages = Math.ceil(currentDisplayedProducts.length / itemsPerPage);
    pageInfoSpan.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}

function changePage(direction) {
    if (direction === 'prev' && currentPage > 1) {
        currentPage--;
    } else if (direction === 'next' && currentPage < totalPages) {
        currentPage++;
    }
    renderCurrentPage();
}

function clearElements() {
    itemSearch.value = "";
    loadProducts();
}

// Event Listeners and Initialization
refreshBtn.addEventListener('click', clearElements);
searchBtn.addEventListener('click', searchProducts);
unknownItemBtn.addEventListener('click', addUnknownItem);

// Left panel pagination listeners
itemSearch.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        searchProducts();
    }
});
prevPageBtn.addEventListener('click', () => changePage('prev'));
nextPageBtn.addEventListener('click', () => changePage('next'));

// Right panel disposal list listeners
disposalItemsTableBody.addEventListener('change', updateValueInFirebase);
disposalItemsTableBody.addEventListener('click', removeTableRow);
prevDisposalPageBtn.addEventListener('click', () => changeDisposalPage('prev'));
nextDisposalPageBtn.addEventListener('click', () => changeDisposalPage('next'));

document.addEventListener('DOMContentLoaded', function() {
    const fourHoursInMilliseconds = 4 * 60 * 60 * 1000; // 4 hours * 60 min * 60 sec * 1000 ms
    setInterval(function() {
        location.reload();
    }, fourHoursInMilliseconds);
    
    loadProducts();
    loadDisposalListFromFirebase(); // Load from the database when the page loads
});