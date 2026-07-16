// Application State
let appData = {
  trucks: [],
  drivers: [],
  trips: [],
  maintenance: [],
  routes: [],
  transactions: [],
  users: [],
  financialAccounts: [],
  fuelLogs: [],
  defLogs: []
};

// Map simulation coordinate mappings (matching CSS percentages)
const CITY_COORDS = {
  "Mumbai": { top: "80%", left: "35%" },
  "Delhi": { top: "20%", left: "45%" },
  "Ahmedabad": { top: "60%", left: "15%" },
  "Bengaluru": { top: "90%", left: "60%" },
  "Kolkata": { top: "40%", left: "80%" },
  "Jaipur": { top: "30%", left: "30%" },
  "Chennai": { top: "92%", left: "70%" }
};

// On Page Load
document.addEventListener("DOMContentLoaded", () => {
  loadUserProfile();
  initApp();
  setupEventListeners();
  startMapSimulation();
});

// Fetch current user details
async function loadUserProfile() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        document.getElementById("header-user-name").innerText = data.user.name;
        document.getElementById("header-user-role").innerText = data.user.role;
        const initials = data.user.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
        document.getElementById("header-user-avatar").innerText = initials;
        // Store role globally and enforce access
        currentUserRole = data.user.role;
        applyRoleBasedAccess();
      }
    }
  } catch (err) {
    console.error("Failed to load user profile:", err);
  }
}

// Role-Based Access Control
// Super Admin & Manager -> full access
// Fleet Manager & Dispatcher -> NO accounts/financial tab, NO user management
function applyRoleBasedAccess() {
  const isAdmin = currentUserRole === 'Super Admin' || currentUserRole === 'Manager';

  // Hide/show Accounts Ledger sidebar tab
  const accountsTab = document.querySelector('.menu-item[data-tab="accounts"]');
  if (accountsTab) {
    accountsTab.style.display = isAdmin ? '' : 'none';
  }

  // If user is currently on accounts tab and not admin, force them to dashboard
  if (!isAdmin) {
    const activeTab = document.querySelector('.menu-item.active');
    if (activeTab && activeTab.getAttribute('data-tab') === 'accounts') {
      const dashboardTab = document.querySelector('.menu-item[data-tab="dashboard"]');
      if (dashboardTab) dashboardTab.click();
    }
  }
}

// Session logout action
async function logout() {
  if (confirm("Are you sure you want to end your session?")) {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) {
      window.location.replace('/login.html');
    }
  }
}
window.logout = logout; // Make global for HTML click binding

// Fetch all database records
async function initApp() {
  try {
    const response = await fetch('/api/db');
    if (!response.ok) throw new Error("Failed to fetch database");
    const dbData = await response.json();
    
    appData.trucks = dbData.trucks || [];
    appData.drivers = dbData.drivers || [];
    appData.trips = dbData.trips || [];
    appData.maintenance = dbData.maintenance || [];
    appData.routes = dbData.routes || [];
    appData.transactions = dbData.transactions || [];
    appData.financialAccounts = dbData.financialAccounts || [];
    appData.fuelLogs = dbData.fuelLogs || [];
    appData.defLogs = dbData.defLogs || [];
    appData.categories = dbData.categories || [];
    
    // Fetch user logins list
    const usersRes = await fetch('/api/users');
    if (usersRes.ok) {
      appData.users = await usersRes.json();
    }
    
    // Update all views
    renderDashboard();
    renderFleet();
    renderDrivers();
    renderTrips();
    renderMaintenance();
    renderAccounts();
    renderUsers();
    renderFinancialAccounts();
    renderFuelLogs();
    renderDefLogs();
    renderCategories();
    
    // Update Form Dropdowns
    populateDropdowns();
  } catch (error) {
    console.error("Initialization Error:", error);
    alert("Connection to backend lost. Please make sure server is running on port 3000.");
  }
}

// Switch between Financial Ledger, Banks, Manager logins, and Categories
function switchAccountsSubTab(tabName) {
  const ledgerPanel = document.getElementById("sub-panel-ledger");
  const usersPanel = document.getElementById("sub-panel-users");
  const banksPanel = document.getElementById("sub-panel-banks");
  const categoriesPanel = document.getElementById("sub-panel-categories");
  
  const ledgerBtn = document.getElementById("sub-tab-btn-ledger");
  const usersBtn = document.getElementById("sub-tab-btn-users");
  const banksBtn = document.getElementById("sub-tab-btn-banks");
  const categoriesBtn = document.getElementById("sub-tab-btn-categories");
  
  ledgerPanel.style.display = "none";
  usersPanel.style.display = "none";
  banksPanel.style.display = "none";
  if (categoriesPanel) categoriesPanel.style.display = "none";
  
  ledgerBtn.className = "btn btn-secondary";
  usersBtn.className = "btn btn-secondary";
  banksBtn.className = "btn btn-secondary";
  if (categoriesBtn) categoriesBtn.className = "btn btn-secondary";
  
  if (tabName === 'ledger') {
    ledgerPanel.style.display = "block";
    ledgerBtn.className = "btn btn-primary";
    renderAccounts();
  } else if (tabName === 'users') {
    usersPanel.style.display = "block";
    usersBtn.className = "btn btn-primary";
    renderUsers();
  } else if (tabName === 'banks') {
    banksPanel.style.display = "block";
    banksBtn.className = "btn btn-primary";
    renderFinancialAccounts();
  } else if (tabName === 'categories') {
    if (categoriesPanel) categoriesPanel.style.display = "block";
    if (categoriesBtn) categoriesBtn.className = "btn btn-primary";
    renderCategories();
  }
}
window.switchAccountsSubTab = switchAccountsSubTab;

// Switch trip details modal sub-tabs (BUG-11 FIX: added DEF sub-tab support)
function switchTripDetailsSubTab(tabName) {
  const expensesPanel = document.getElementById("sub-panel-trip-expenses");
  const fuelPanel = document.getElementById("sub-panel-trip-fuel");
  const defPanel = document.getElementById("sub-panel-trip-def");
  const expensesBtn = document.getElementById("btn-sub-expenses");
  const fuelBtn = document.getElementById("btn-sub-fuel");
  const defBtn = document.getElementById("btn-sub-def");

  // Hide all panels
  expensesPanel.style.display = "none";
  fuelPanel.style.display = "none";
  if (defPanel) defPanel.style.display = "none";

  // Deactivate all buttons
  expensesBtn.className = "btn btn-secondary";
  fuelBtn.className = "btn btn-secondary";
  if (defBtn) defBtn.className = "btn btn-secondary";

  // Show selected
  if (tabName === 'expenses') {
    expensesPanel.style.display = "block";
    expensesBtn.className = "btn btn-primary";
  } else if (tabName === 'fuel') {
    fuelPanel.style.display = "block";
    fuelBtn.className = "btn btn-primary";
  } else if (tabName === 'def') {
    if (defPanel) defPanel.style.display = "block";
    if (defBtn) defBtn.className = "btn btn-primary";
  }
}
window.switchTripDetailsSubTab = switchTripDetailsSubTab;

// Setup main UI event listeners
function setupEventListeners() {
  const sidebarNav = document.getElementById("sidebar-nav");
  const sidebarOverlay = document.getElementById("sidebar-overlay");
  const toggleBtn = document.getElementById("sidebar-toggle-btn");

  if (toggleBtn && sidebarNav && sidebarOverlay) {
    toggleBtn.addEventListener("click", () => {
      sidebarNav.classList.toggle("open");
      sidebarOverlay.classList.toggle("open");
    });

    sidebarOverlay.addEventListener("click", () => {
      sidebarNav.classList.remove("open");
      sidebarOverlay.classList.remove("open");
    });
  }

  // 1. Sidebar Tab Switching
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach(item => {
    item.addEventListener("click", () => {
      menuItems.forEach(btn => btn.classList.remove("active"));
      item.classList.add("active");
      
      const targetTab = item.getAttribute("data-tab");
      const tabPanels = document.querySelectorAll(".tab-panel");
      tabPanels.forEach(panel => panel.classList.remove("active"));
      
      const activePanel = document.getElementById(`${targetTab}-tab`);
      if (activePanel) activePanel.classList.add("active");

      // Auto fallback to Financial Ledger on click of tab
      if (targetTab === 'accounts') {
        switchAccountsSubTab('ledger');
      }

      if (window.innerWidth <= 768 && sidebarNav && sidebarOverlay) {
        sidebarNav.classList.remove("open");
        sidebarOverlay.classList.remove("open");
      }
    });
  });

  // Toggle bank modal conditional fields based on type select
  const accTypeSelect = document.getElementById("acc-type");
  const groupBankName = document.getElementById("group-acc-bank-name");
  const groupAccNumber = document.getElementById("group-acc-number");
  const groupAccIfsc = document.getElementById("group-acc-ifsc");
  
  function toggleBankFields() {
    if (!accTypeSelect) return;
    const val = accTypeSelect.value;
    if (val === 'Bank' || val === 'Credit Card') {
      groupBankName.style.display = "block";
      groupAccNumber.style.display = "block";
      groupAccIfsc.style.display = "block";
      document.getElementById("acc-bank-name").required = true;
      document.getElementById("acc-number").required = true;
      document.getElementById("acc-ifsc").required = true;
    } else {
      groupBankName.style.display = "none";
      groupAccNumber.style.display = "none";
      groupAccIfsc.style.display = "none";
      document.getElementById("acc-bank-name").required = false;
      document.getElementById("acc-number").required = false;
      document.getElementById("acc-ifsc").required = false;
      
      // Clear values when hidden
      document.getElementById("acc-bank-name").value = "";
      document.getElementById("acc-number").value = "";
      document.getElementById("acc-ifsc").value = "";
    }
  }
  
  if (accTypeSelect) {
    accTypeSelect.addEventListener("change", toggleBankFields);
    toggleBankFields(); // initial call
  }

  // 2. Filters
  document.getElementById("truck-filter-status").addEventListener("change", renderFleet);
  document.getElementById("txn-filter-type").addEventListener("change", renderAccounts);
  document.getElementById("txn-filter-category").addEventListener("change", renderAccounts);
  document.getElementById("txn-filter-account").addEventListener("change", renderAccounts);

  // 3. Forms Submissions
  // Add Truck Form
  document.getElementById("add-truck-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      plate: document.getElementById("truck-plate").value,
      model: document.getElementById("truck-model").value,
      capacity: Number(document.getElementById("truck-capacity").value),
      fuelType: document.getElementById("truck-fuel").value,
      location: document.getElementById("truck-location").value,
      driverId: document.getElementById("truck-driver").value || null
    };

    const res = await apiRequest('/api/trucks', 'POST', payload);
    if (res) {
      document.getElementById("add-truck-form").reset();
      closeModal('add-truck-modal');
      initApp();
    }
  });

  // Edit Truck Form
  document.getElementById("edit-truck-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-truck-id").value;
    const payload = {
      plate: document.getElementById("edit-truck-plate").value,
      model: document.getElementById("edit-truck-model").value,
      capacity: Number(document.getElementById("truck-capacity").value),
      fuelType: document.getElementById("edit-truck-fuel").value,
      location: document.getElementById("edit-truck-location").value,
      status: document.getElementById("edit-truck-status").value,
      driverId: document.getElementById("edit-truck-driver").value || null
    };

    const res = await apiRequest(`/api/trucks/${id}`, 'PUT', payload);
    if (res) {
      document.getElementById("edit-truck-form").reset();
      closeModal('edit-truck-modal');
      initApp();
    }
  });

  // Add Driver Form
  document.getElementById("add-driver-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById("driver-name").value,
      phone: document.getElementById("driver-phone").value,
      license: document.getElementById("driver-license").value,
      licenseExpiry: document.getElementById("driver-license-expiry").value,
      rating: Number(document.getElementById("driver-rating").value) || 5.0,
      truckId: document.getElementById("driver-truck").value || null
    };

    const res = await apiRequest('/api/drivers', 'POST', payload);
    if (res) {
      document.getElementById("add-driver-form").reset();
      closeModal('add-driver-modal');
      initApp();
    }
  });

  // Edit Driver Form
  document.getElementById("edit-driver-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-driver-id").value;
    const payload = {
      name: document.getElementById("edit-driver-name").value,
      phone: document.getElementById("edit-driver-phone").value,
      license: document.getElementById("edit-driver-license").value,
      licenseExpiry: document.getElementById("edit-driver-license-expiry").value,
      status: document.getElementById("edit-driver-status").value,
      truckId: document.getElementById("edit-driver-truck").value || null
    };

    const res = await apiRequest(`/api/drivers/${id}`, 'PUT', payload);
    if (res) {
      document.getElementById("edit-driver-form").reset();
      closeModal('edit-driver-modal');
      initApp();
    }
  });

  // Dispatch Trip Form (Manual Route details input, round-trip specs, no cargo/weight)
  document.getElementById("dispatch-trip-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      routeId: null,
      truckId: document.getElementById("trip-truck").value,
      driverId: document.getElementById("trip-driver").value,
      source: document.getElementById("trip-source").value,
      destination: document.getElementById("trip-destination").value,
      distance: Number(document.getElementById("trip-distance").value),
      tollCost: Number(document.getElementById("trip-toll").value),
      returnSource: document.getElementById("trip-return-source").value,
      returnDestination: document.getElementById("trip-return-destination").value,
      returnDistance: Number(document.getElementById("trip-return-distance").value),
      returnTollCost: Number(document.getElementById("trip-return-toll").value),
      status: "In Transit",
      startDate: document.getElementById("trip-start").value,
      endDate: document.getElementById("trip-end").value,
      progress: 0
    };

    const res = await apiRequest('/api/trips', 'POST', payload);
    if (res) {
      document.getElementById("dispatch-trip-form").reset();
      closeModal('dispatch-trip-modal');
      initApp();
    }
  });

  // Edit Trip Form (Manual Route details editing)
  document.getElementById("edit-trip-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-trip-id").value;
    
    const payload = {
      routeId: null,
      truckId: document.getElementById("edit-trip-truck").value,
      driverId: document.getElementById("edit-trip-driver").value,
      source: document.getElementById("edit-trip-source").value,
      destination: document.getElementById("edit-trip-destination").value,
      distance: Number(document.getElementById("edit-trip-distance").value),
      tollCost: Number(document.getElementById("edit-trip-toll").value),
      returnSource: document.getElementById("edit-trip-return-source").value,
      returnDestination: document.getElementById("edit-trip-return-destination").value,
      returnDistance: Number(document.getElementById("edit-trip-return-distance").value),
      returnTollCost: Number(document.getElementById("edit-trip-return-toll").value),
      startDate: document.getElementById("edit-trip-start").value,
      endDate: document.getElementById("edit-trip-end").value,
      status: document.getElementById("edit-trip-status").value,
      progress: Number(document.getElementById("edit-trip-progress").value)
    };

    const res = await apiRequest(`/api/trips/${id}`, 'PUT', payload);
    if (res) {
      document.getElementById("edit-trip-form").reset();
      closeModal('edit-trip-modal');
      initApp();
    }
  });

  // Log Maintenance Form
  document.getElementById("log-maintenance-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      truckId: document.getElementById("maint-truck").value,
      date: document.getElementById("maint-date").value,
      type: document.getElementById("maint-type").value,
      cost: Number(document.getElementById("maint-cost").value),
      status: "In Progress"
    };

    const res = await apiRequest('/api/maintenance', 'POST', payload);
    if (res) {
      document.getElementById("log-maintenance-form").reset();
      closeModal('log-maintenance-modal');
      initApp();
    }
  });

  // Edit Maintenance Form
  document.getElementById("edit-maintenance-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-maintenance-id").value;
    const payload = {
      truckId: document.getElementById("edit-maint-truck").value,
      date: document.getElementById("edit-maint-date").value,
      type: document.getElementById("edit-maint-type").value,
      cost: Number(document.getElementById("edit-maint-cost").value),
      status: document.getElementById("edit-maint-status").value
    };

    const res = await apiRequest(`/api/maintenance/${id}`, 'PUT', payload);
    if (res) {
      document.getElementById("edit-maintenance-form").reset();
      closeModal('edit-maintenance-modal');
      initApp();
    }
  });

  // Add Transaction Form
  document.getElementById("add-transaction-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      date: document.getElementById("txn-date").value,
      type: document.getElementById("txn-type").value,
      category: document.getElementById("txn-category").value,
      paymentMethod: document.getElementById("txn-payment-method").value,
      amount: Number(document.getElementById("txn-amount").value),
      description: document.getElementById("txn-desc").value,
      referenceId: document.getElementById("txn-ref").value || null
    };

    const res = await apiRequest('/api/transactions', 'POST', payload);
    if (res) {
      document.getElementById("add-transaction-form").reset();
      closeModal('add-transaction-modal');
      initApp();
    }
  });

  // Edit Transaction Form
  document.getElementById("edit-transaction-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-transaction-id").value;
    const payload = {
      date: document.getElementById("edit-txn-date").value,
      type: document.getElementById("edit-txn-type").value,
      category: document.getElementById("edit-txn-category").value,
      paymentMethod: document.getElementById("edit-txn-payment-method").value,
      amount: Number(document.getElementById("edit-txn-amount").value),
      description: document.getElementById("edit-txn-desc").value,
      referenceId: document.getElementById("edit-txn-ref").value || null
    };

    const res = await apiRequest(`/api/transactions/${id}`, 'PUT', payload);
    if (res) {
      document.getElementById("edit-transaction-form").reset();
      closeModal('edit-transaction-modal');
      initApp();
    }
  });

  // Add User Form
  document.getElementById("add-user-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById("user-name").value,
      role: document.getElementById("user-role").value,
      username: document.getElementById("user-username").value,
      password: document.getElementById("user-password").value
    };

    const res = await apiRequest('/api/users', 'POST', payload);
    if (res) {
      document.getElementById("add-user-form").reset();
      closeModal('add-user-modal');
      initApp();
    }
  });

  // Add Category Form
  document.getElementById("add-category-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById("category-name").value,
      type: document.getElementById("category-type").value
    };

    const res = await apiRequest('/api/categories', 'POST', payload);
    if (res) {
      document.getElementById("add-category-form").reset();
      closeModal('add-category-modal');
      await initApp();
      switchAccountsSubTab('categories');
    }
  });

  // Edit Category Form
  document.getElementById("edit-category-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-category-id").value;
    const payload = {
      name: document.getElementById("edit-category-name").value,
      type: document.getElementById("edit-category-type").value
    };

    const res = await apiRequest(`/api/categories/${id}`, 'PUT', payload);
    if (res) {
      document.getElementById("edit-category-form").reset();
      closeModal('edit-category-modal');
      await initApp();
      switchAccountsSubTab('categories');
    }
  });

  // Add Financial Account Form
  document.getElementById("add-financial-account-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById("acc-name").value,
      type: document.getElementById("acc-type").value,
      balance: Number(document.getElementById("acc-balance").value),
      bankName: document.getElementById("acc-bank-name").value || null,
      accountNumber: document.getElementById("acc-number").value || null,
      ifscCode: document.getElementById("acc-ifsc").value || null
    };

    const res = await apiRequest('/api/financial-accounts', 'POST', payload);
    if (res) {
      document.getElementById("add-financial-account-form").reset();
      closeModal('add-financial-account-modal');
      toggleBankFields(); // reset field visibility
      initApp();
    }
  });

  // Add Fuel Log Form (Global list tab)
  document.getElementById("add-fuel-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      truckId: document.getElementById("fuel-truck").value,
      driverId: document.getElementById("fuel-driver").value,
      date: document.getElementById("fuel-date").value,
      quantity: Number(document.getElementById("fuel-qty").value),
      pricePerLiter: Number(document.getElementById("fuel-price").value),
      odometer: Number(document.getElementById("fuel-odometer").value),
      paymentMethod: document.getElementById("fuel-payment-method").value,
      tripId: document.getElementById("fuel-trip").value || null
    };

    const res = await apiRequest('/api/fuel-logs', 'POST', payload);
    if (res) {
      document.getElementById("add-fuel-form").reset();
      closeModal('add-fuel-modal');
      initApp();
    }
  });

  // Edit Fuel Log Form (Global list tab)
  document.getElementById("edit-fuel-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-fuel-id").value;
    const payload = {
      truckId: document.getElementById("edit-fuel-truck").value,
      driverId: document.getElementById("edit-fuel-driver").value,
      date: document.getElementById("edit-fuel-date").value,
      quantity: Number(document.getElementById("edit-fuel-qty").value),
      pricePerLiter: Number(document.getElementById("edit-fuel-price").value),
      odometer: Number(document.getElementById("edit-fuel-odometer").value),
      paymentMethod: document.getElementById("edit-fuel-payment-method").value,
      tripId: document.getElementById("edit-fuel-trip").value || null
    };

    const res = await apiRequest(`/api/fuel-logs/${id}`, 'PUT', payload);
    if (res) {
      document.getElementById("edit-fuel-form").reset();
      closeModal('edit-fuel-modal');
      initApp();
    }
  });

  // Trip Specific Expense Form (inside Details modal)
  document.getElementById("trip-expense-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const tripId = document.getElementById("details-trip-id").value;
    const payload = {
      date: document.getElementById("trip-exp-date").value,
      type: "Expense",
      category: document.getElementById("trip-exp-category").value,
      paymentMethod: document.getElementById("trip-exp-method").value,
      amount: Number(document.getElementById("trip-exp-amount").value),
      description: document.getElementById("trip-exp-desc").value,
      referenceId: tripId
    };

    const res = await apiRequest('/api/transactions', 'POST', payload);
    if (res) {
      document.getElementById("trip-expense-form").reset();
      
      // Reload db data and then update Details modal instantly
      await initApp();
      viewTripDetails(tripId);
    }
  });

  // Trip Specific Fuel Log Form (inside Details modal)
  document.getElementById("trip-fuel-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const tripId = document.getElementById("details-trip-id").value;
    const trip = appData.trips.find(t => t.id === tripId);
    if (!trip) return;

    const payload = {
      truckId: trip.truckId,
      driverId: trip.driverId,
      tripId: tripId,
      date: document.getElementById("trip-fuel-date").value,
      quantity: Number(document.getElementById("trip-fuel-qty").value),
      pricePerLiter: Number(document.getElementById("trip-fuel-price").value),
      odometer: Number(document.getElementById("trip-fuel-odometer").value),
      paymentMethod: document.getElementById("trip-fuel-method").value
    };

    const res = await apiRequest('/api/fuel-logs', 'POST', payload);
    if (res) {
      document.getElementById("trip-fuel-form").reset();

      // Reload db data and update Details modal instantly
      await initApp();
      viewTripDetails(tripId);
    }
  });

  // Add DEF Log Form
  document.getElementById("add-def-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      truckId: document.getElementById("def-truck").value,
      driverId: document.getElementById("def-driver").value,
      date: document.getElementById("def-date").value,
      quantity: Number(document.getElementById("def-qty").value),
      pricePerLiter: Number(document.getElementById("def-price").value),
      odometer: Number(document.getElementById("def-odometer").value),
      paymentMethod: document.getElementById("def-payment-method").value,
      tripId: document.getElementById("def-trip").value || null
    };
    const res = await apiRequest('/api/def-logs', 'POST', payload);
    if (res) { document.getElementById("add-def-form").reset(); closeModal('add-def-modal'); initApp(); }
  });

  // Edit DEF Log Form
  document.getElementById("edit-def-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-def-id").value;
    const payload = {
      truckId: document.getElementById("edit-def-truck").value,
      driverId: document.getElementById("edit-def-driver").value,
      date: document.getElementById("edit-def-date").value,
      quantity: Number(document.getElementById("edit-def-qty").value),
      pricePerLiter: Number(document.getElementById("edit-def-price").value),
      odometer: Number(document.getElementById("edit-def-odometer").value),
      paymentMethod: document.getElementById("edit-def-payment-method").value,
      tripId: document.getElementById("edit-def-trip").value || null
    };
    const res = await apiRequest(`/api/def-logs/${id}`, 'PUT', payload);
    if (res) { document.getElementById("edit-def-form").reset(); closeModal('edit-def-modal'); initApp(); }
  });

  // 5. Section-wise Search Filter — only filters the currently active tab
  document.getElementById("global-search").addEventListener("input", (e) => {
    const searchVal = e.target.value.toLowerCase().trim();
    
    // Find which tab is currently active
    const activeMenuItem = document.querySelector(".menu-item.active");
    const activeTab = activeMenuItem ? activeMenuItem.getAttribute("data-tab") : "dashboard";

    // If search cleared, reset the active section
    if (searchVal === "") {
      resetActiveSection(activeTab);
      return;
    }

    // Filter only the active section
    switch (activeTab) {
      case "fleet":
        const filteredTrucks = appData.trucks.filter(t => 
          t.id.toLowerCase().includes(searchVal) || 
          t.plate.toLowerCase().includes(searchVal) ||
          t.model.toLowerCase().includes(searchVal) ||
          t.location.toLowerCase().includes(searchVal) ||
          (t.fuelType && t.fuelType.toLowerCase().includes(searchVal)) ||
          (t.status && t.status.toLowerCase().includes(searchVal))
        );
        renderFleetTable(filteredTrucks);
        break;

      case "drivers":
        const filteredDrivers = appData.drivers.filter(d => 
          d.id.toLowerCase().includes(searchVal) ||
          d.name.toLowerCase().includes(searchVal) ||
          d.license.toLowerCase().includes(searchVal) ||
          (d.phone && d.phone.includes(searchVal)) ||
          (d.status && d.status.toLowerCase().includes(searchVal))
        );
        renderDriversGrid(filteredDrivers);
        break;

      case "trips":
        const filteredTrips = appData.trips.filter(t => 
          t.id.toLowerCase().includes(searchVal) ||
          t.source.toLowerCase().includes(searchVal) ||
          t.destination.toLowerCase().includes(searchVal) ||
          (t.returnSource && t.returnSource.toLowerCase().includes(searchVal)) ||
          (t.returnDestination && t.returnDestination.toLowerCase().includes(searchVal)) ||
          (t.status && t.status.toLowerCase().includes(searchVal)) ||
          (t.truckId && t.truckId.toLowerCase().includes(searchVal))
        );
        renderTripsList(filteredTrips);
        break;

      case "maintenance":
        const filteredMaint = appData.maintenance.filter(m => 
          m.id.toLowerCase().includes(searchVal) ||
          m.truckId.toLowerCase().includes(searchVal) ||
          m.type.toLowerCase().includes(searchVal) ||
          (m.status && m.status.toLowerCase().includes(searchVal))
        );
        renderMaintenanceTable(filteredMaint);
        break;

      case "fuel":
        const filteredFuel = appData.fuelLogs.filter(f =>
          f.id.toLowerCase().includes(searchVal) ||
          f.truckId.toLowerCase().includes(searchVal) ||
          f.driverId.toLowerCase().includes(searchVal) ||
          (f.tripId && f.tripId.toLowerCase().includes(searchVal)) ||
          (f.paymentMethod && f.paymentMethod.toLowerCase().includes(searchVal))
        );
        renderFuelLogsTable(filteredFuel);
        break;

      case "def":
        const filteredDef = appData.defLogs.filter(d =>
          d.id.toLowerCase().includes(searchVal) ||
          d.truckId.toLowerCase().includes(searchVal) ||
          d.driverId.toLowerCase().includes(searchVal) ||
          (d.tripId && d.tripId.toLowerCase().includes(searchVal)) ||
          (d.paymentMethod && d.paymentMethod.toLowerCase().includes(searchVal))
        );
        renderDefLogsTable(filteredDef);
        break;

      case "accounts":
        // Search across all 4 accounts sub-tabs
        const filteredTxns = appData.transactions.filter(t => 
          t.id.toLowerCase().includes(searchVal) ||
          t.category.toLowerCase().includes(searchVal) ||
          t.description.toLowerCase().includes(searchVal) ||
          (t.paymentMethod && t.paymentMethod.toLowerCase().includes(searchVal)) ||
          (t.referenceId && t.referenceId.toLowerCase().includes(searchVal)) ||
          (t.type && t.type.toLowerCase().includes(searchVal))
        );
        renderAccountsTable(filteredTxns);

        const filteredAccts = appData.financialAccounts.filter(a =>
          a.name.toLowerCase().includes(searchVal) ||
          a.type.toLowerCase().includes(searchVal) ||
          (a.bankName && a.bankName.toLowerCase().includes(searchVal))
        );
        renderFinancialAccountsTable(filteredAccts);

        const filteredUsers = appData.users.filter(u =>
          (u.name && u.name.toLowerCase().includes(searchVal)) ||
          (u.username && u.username.toLowerCase().includes(searchVal)) ||
          (u.role && u.role.toLowerCase().includes(searchVal))
        );
        renderUsersTable(filteredUsers);

        const filteredCats = appData.categories.filter(c =>
          c.id.toLowerCase().includes(searchVal) ||
          c.name.toLowerCase().includes(searchVal) ||
          c.type.toLowerCase().includes(searchVal)
        );
        renderCategoriesTable(filteredCats);
        break;

      default:
        // Dashboard — no table filtering
        break;
    }
  });

  // Clear search when switching tabs
  const menuItemsForSearch = document.querySelectorAll(".menu-item");
  menuItemsForSearch.forEach(item => {
    item.addEventListener("click", () => {
      const searchInput = document.getElementById("global-search");
      if (searchInput && searchInput.value.trim() !== "") {
        searchInput.value = "";
        // Reset the new tab's section to full data
        const tab = item.getAttribute("data-tab");
        resetActiveSection(tab);
      }
    });
  });
}

// Helper: reset a specific section to show all data
function resetActiveSection(tab) {
  switch (tab) {
    case "fleet": renderFleet(); break;
    case "drivers": renderDrivers(); break;
    case "trips": renderTrips(); break;
    case "maintenance": renderMaintenance(); break;
    case "fuel": renderFuelLogs(); break;
    case "def": renderDefLogs(); break;
    case "accounts":
      renderAccounts();
      renderUsers();
      renderFinancialAccounts();
      renderCategories();
      break;
    case "dashboard":
    default:
      renderDashboard();
      break;
  }
}

// REST helper function
async function apiRequest(url, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 401) {
        window.location.replace('/login.html');
        return null;
      }
      const err = await response.json();
      throw new Error(err.error || "API Request Failed");
    }
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    alert(`Error: ${error.message}`);
    return null;
  }
}

// Modal Control
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("open");
    const dateInputs = modal.querySelectorAll('input[type="date"]');
    const todayStr = new Date().toISOString().split('T')[0];
    dateInputs.forEach(input => {
      if (!input.value) input.value = todayStr;
    });
  }
}

// Close Modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("open");
}

// -----------------------------------------------------------------------------
// RENDERERS
// -----------------------------------------------------------------------------

function renderDashboard() {
  document.getElementById("kpi-total-trucks").innerText = appData.trucks.length;
  
  const activeDrivers = appData.drivers.filter(d => d.status === "On Duty").length;
  document.getElementById("kpi-active-drivers").innerText = activeDrivers;
  
  const activeTrips = appData.trips.filter(t => t.status === "In Transit").length;
  document.getElementById("kpi-active-trips").innerText = activeTrips;
  
  const inMaintenance = appData.trucks.filter(t => t.status === "Maintenance").length;
  document.getElementById("kpi-in-maintenance").innerText = inMaintenance;

  const totalIncome = appData.transactions
    .filter(t => t.type === 'Income')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  document.getElementById("finance-gross-revenue").innerText = `₹${totalIncome.toLocaleString('en-IN')}`;

  const totalExpense = appData.transactions
    .filter(t => t.type === 'Expense')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  document.getElementById("finance-operating-expenses").innerText = `₹${totalExpense.toLocaleString('en-IN')}`;

  const netProfit = totalIncome - totalExpense;
  const netProfitElement = document.getElementById("finance-net-profit");
  netProfitElement.innerText = `₹${netProfit.toLocaleString('en-IN')}`;
  
  if (netProfit < 0) {
    netProfitElement.style.color = "var(--color-red)";
  } else {
    netProfitElement.style.color = "var(--color-emerald)";
  }

  generateAlerts();

  const recentTripsContainer = document.getElementById("dashboard-recent-trips");
  recentTripsContainer.innerHTML = "";
  
  const sortedTrips = [...appData.trips]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 5);

  if (sortedTrips.length === 0) {
    recentTripsContainer.innerHTML = `<div class="footer-credit" style="padding: 20px;">No trips logged yet.</div>`;
  } else {
    sortedTrips.forEach(trip => {
      const isDelivered = trip.status === "Delivered";
      let statusClass = "";
      if (isDelivered) statusClass = "status-delivered";
      
      const badgeIcon = isDelivered 
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="1" y="3" width="15" height="13"></rect><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`;

      const div = document.createElement("div");
      div.className = "timeline-item";
      div.innerHTML = `
        <div class="timeline-badge ${statusClass}">
          ${badgeIcon}
        </div>
        <div class="timeline-info">
          <div class="timeline-title-row">
            <span class="timeline-title">${trip.id} : ${trip.source} to ${trip.destination}</span>
            <span class="timeline-meta">${trip.startDate}</span>
          </div>
          <div class="timeline-desc">
            Outward: <strong>${trip.source} &rarr; ${trip.destination}</strong> | Return: <strong>${trip.returnSource || 'N/A'} &rarr; ${trip.returnDestination || 'N/A'}</strong> | Status: <strong>${trip.status}</strong>
          </div>
        </div>
      `;
      recentTripsContainer.appendChild(div);
    });
  }

  const fuelDistributionContainer = document.getElementById("fuel-distribution-chart");
  fuelDistributionContainer.innerHTML = "";
  
  const fuelCounts = {};
  appData.trucks.forEach(t => {
    fuelCounts[t.fuelType] = (fuelCounts[t.fuelType] || 0) + 1;
  });

  Object.entries(fuelCounts).forEach(([fuel, count]) => {
    const pct = Math.round((count / appData.trucks.length) * 100);
    const row = document.createElement("div");
    row.className = "chart-bar-row";
    row.innerHTML = `
      <div class="chart-bar-info">
        <span class="chart-bar-label">${fuel}</span>
        <span class="chart-bar-val">${count} (${pct}%)</span>
      </div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill" style="width: ${pct}%"></div>
      </div>
    `;
    fuelDistributionContainer.appendChild(row);
  });
}

function generateAlerts() {
  const alertsList = [];
  const today = new Date();

  appData.trucks.forEach(t => {
    if (t.status === 'Idle' && !t.driverId) {
      alertsList.push({
        type: 'warning',
        message: `Vehicle ${t.plate} (${t.id}) is idle without an assigned operator.`,
        subtext: 'Capacity utilization warning'
      });
    }
  });

  appData.drivers.forEach(d => {
    if (d.rating && d.rating < 4.5) {
      alertsList.push({
        type: 'warning',
        message: `Operator ${d.name} (${d.id}) has a low safety rating of ${d.rating}★.`,
        subtext: 'Performance advisory threshold'
      });
    }
  });

  appData.drivers.forEach(d => {
    if (d.licenseExpiry) {
      const expiry = new Date(d.licenseExpiry);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        alertsList.push({
          type: 'danger',
          message: `CRITICAL: Operator ${d.name} (${d.id}) DL has expired!`,
          subtext: `Expired on ${d.licenseExpiry}`
        });
      } else if (diffDays <= 30) {
        alertsList.push({
          type: 'warning',
          message: `Operator ${d.name} (${d.id}) DL expires in ${diffDays} days.`,
          subtext: `Expires on ${d.licenseExpiry}`
        });
      }
    }
  });

  appData.trucks.forEach(t => {
    if (t.lastService) {
      const last = new Date(t.lastService);
      const diffTime = today.getTime() - last.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 90 && t.status !== 'Maintenance') {
        alertsList.push({
          type: 'info',
          message: `Vehicle ${t.plate} (${t.id}) service log is overdue (${diffDays} days since last workshop entry).`,
          subtext: 'Schedule inspection recommended'
        });
      }
    }
  });

  const container = document.getElementById("dashboard-alerts-list");
  const countBadge = document.getElementById("alerts-badge");
  const countBellBadge = document.getElementById("notifications-count");

  if (container) {
    container.innerHTML = "";
    countBadge.innerText = `${alertsList.length} Alerts`;
    countBellBadge.innerText = alertsList.length;

    if (alertsList.length === 0) {
      container.innerHTML = `<div class="footer-credit" style="padding: 40px; text-align: center;">All systems nominal. No alerts.</div>`;
      return;
    }

    alertsList.forEach(alert => {
      let icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
      if (alert.type === 'danger') {
        icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
      } else if (alert.type === 'info') {
        icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="9" x2="12.01" y2="9"></line></svg>`;
      }

      const div = document.createElement("div");
      div.className = `alert-log-item ${alert.type}`;
      div.innerHTML = `
        <div class="alert-icon-wrap">${icon}</div>
        <div class="alert-details">
          <span class="alert-msg">${alert.message}</span>
          <span class="alert-subtext">${alert.subtext}</span>
        </div>
      `;
      container.appendChild(div);
    });
  }
}

function renderFleet() {
  const statusFilter = document.getElementById("truck-filter-status").value;
  const filteredTrucks = appData.trucks.filter(t => {
    if (statusFilter === "All") return true;
    return t.status === statusFilter;
  });
  renderFleetTable(filteredTrucks);
}

function renderFleetTable(trucksList) {
  const tbody = document.getElementById("trucks-table-body");
  tbody.innerHTML = "";

  if (trucksList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted);">No matching fleet trucks found.</td></tr>`;
    return;
  }

  trucksList.forEach(truck => {
    const driver = appData.drivers.find(d => d.id === truck.driverId);
    const driverName = driver ? driver.name : `<span style="color: var(--text-muted)">Unassigned</span>`;
    
    let statusBadgeClass = "badge-info";
    if (truck.status === "On Route") statusBadgeClass = "badge-success";
    if (truck.status === "Maintenance") statusBadgeClass = "badge-warning";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family: var(--font-header); font-weight: 700; color: var(--color-cyan);">${truck.id}</td>
      <td><strong>${truck.plate}</strong></td>
      <td>${truck.model}</td>
      <td><span class="badge" style="background-color: rgba(255,255,255,0.05); border: 1px solid var(--border-color);">${truck.fuelType}</span></td>
      <td>${truck.capacity} T</td>
      <td>${driverName}</td>
      <td><span style="display:flex; align-items:center; gap:6px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color:var(--color-cyan);"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${truck.location}</span></td>
      <td>${truck.lastService}</td>
      <td><span class="badge ${statusBadgeClass}">${truck.status}</span></td>
      <td>
        <div class="table-row-actions">
          <button class="btn-icon-only btn-edit" onclick="editTruck('${truck.id}')" title="Edit Vehicle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn-icon-only btn-delete" onclick="deleteTruck('${truck.id}')" title="Remove Truck">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editTruck(id) {
  const truck = appData.trucks.find(t => t.id === id);
  if (!truck) return;
  
  document.getElementById("edit-truck-id").value = truck.id;
  document.getElementById("edit-truck-plate").value = truck.plate;
  document.getElementById("edit-truck-model").value = truck.model;
  document.getElementById("edit-truck-capacity").value = truck.capacity;
  document.getElementById("edit-truck-fuel").value = truck.fuelType;
  document.getElementById("edit-truck-location").value = truck.location;
  document.getElementById("edit-truck-status").value = truck.status;
  
  const driverSelect = document.getElementById("edit-truck-driver");
  driverSelect.innerHTML = `<option value="">No Driver Assigned</option>`;
  
  appData.drivers.forEach(driver => {
    if (!driver.truckId || driver.truckId === "" || driver.truckId === truck.id) {
      const opt = document.createElement("option");
      opt.value = driver.id;
      opt.text = `${driver.name} (${driver.id})`;
      if (driver.id === truck.driverId) opt.selected = true;
      driverSelect.appendChild(opt);
    }
  });

  openModal('edit-truck-modal');
}

async function deleteTruck(id) {
  if (confirm(`Are you sure you want to remove truck ${id}?`)) {
    const res = await apiRequest(`/api/trucks/${id}`, 'DELETE');
    if (res) initApp();
  }
}

function renderDrivers() {
  renderDriversGrid(appData.drivers);
}

function renderDriversGrid(driversList) {
  const container = document.getElementById("drivers-grid-container");
  container.innerHTML = "";

  if (driversList.length === 0) {
    container.innerHTML = `<div style="grid-column: span 4; text-align: center; color: var(--text-muted); padding: 40px 0;">No drivers registered in the directory.</div>`;
    return;
  }

  driversList.forEach(driver => {
    let statusClass = "badge-info";
    if (driver.status === "On Duty") statusClass = "badge-success";
    if (driver.status === "Off Duty") statusClass = "badge-danger";

    const initials = driver.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

    const card = document.createElement("div");
    card.className = "driver-card";
    card.innerHTML = `
      <div class="driver-card-header">
        <div class="driver-avatar-circle">${initials}</div>
        <div class="driver-profile-meta">
          <span class="driver-name">${driver.name}</span>
          <span class="driver-id">${driver.id} <span style="color:var(--color-orange); font-weight:700; margin-left:4px;">★ ${driver.rating || 5.0}</span></span>
        </div>
        <span class="badge ${statusClass}">${driver.status}</span>
      </div>
      <div class="driver-details-list">
        <div class="driver-detail-row">
          <span>License:</span>
          <span>${driver.license}</span>
        </div>
        <div class="driver-detail-row">
          <span>Expiry:</span>
          <span style="${isExpired(driver.licenseExpiry) ? 'color:var(--color-red); font-weight:bold;' : ''}">${driver.licenseExpiry || 'N/A'}</span>
        </div>
        <div class="driver-detail-row">
          <span>Contact:</span>
          <span>${driver.phone}</span>
        </div>
        <div class="driver-detail-row">
          <span>Completed Trips:</span>
          <span>${driver.tripsCompleted || 0}</span>
        </div>
        <div class="driver-detail-row">
          <span>Assigned Truck:</span>
          <span style="color:var(--color-cyan); font-weight:700;">${driver.truckId || "None"}</span>
        </div>
      </div>
      <div class="driver-card-footer">
        <button class="btn btn-secondary btn-icon-only btn-edit" onclick="editDriver('${driver.id}')" title="Edit Operator">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
        <button class="btn btn-secondary btn-icon-only btn-delete" onclick="deleteDriver('${driver.id}')" title="Delete Operator">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

// BUG-10 FIX: compare date strings to avoid UTC vs local timezone mismatch
function isExpired(dateStr) {
  if (!dateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr < today;
}

function editDriver(id) {
  const driver = appData.drivers.find(d => d.id === id);
  if (!driver) return;

  document.getElementById("edit-driver-id").value = driver.id;
  document.getElementById("edit-driver-name").value = driver.name;
  document.getElementById("edit-driver-phone").value = driver.phone;
  document.getElementById("edit-driver-license").value = driver.license;
  document.getElementById("edit-driver-license-expiry").value = driver.licenseExpiry;
  document.getElementById("edit-driver-status").value = driver.status;

  const truckSelect = document.getElementById("edit-driver-truck");
  truckSelect.innerHTML = `<option value="">No Vehicle Assigned</option>`;
  
  appData.trucks.forEach(truck => {
    if (!truck.driverId || truck.driverId === "" || truck.driverId === driver.id) {
      const opt = document.createElement("option");
      opt.value = truck.id;
      opt.text = `${truck.plate} (${truck.id})`;
      if (truck.id === driver.truckId) opt.selected = true;
      truckSelect.appendChild(opt);
    }
  });

  openModal('edit-driver-modal');
}

async function deleteDriver(id) {
  if (confirm(`Are you sure you want to remove operator ${id}?`)) {
    const res = await apiRequest(`/api/drivers/${id}`, 'DELETE');
    if (res) initApp();
  }
}

function renderTrips() {
  renderTripsList(appData.trips);
}

function renderTripsList(tripsList) {
  const container = document.getElementById("trips-container");
  container.innerHTML = "";

  if (tripsList.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px 0;">No shipments currently dispatched.</div>`;
    return;
  }

  tripsList.forEach(trip => {
    let statusBadgeClass = "badge-info";
    if (trip.status === "In Transit") statusBadgeClass = "badge-success";
    if (trip.status === "Delivered") statusBadgeClass = "badge-info";
    if (trip.status === "Cancelled") statusBadgeClass = "badge-danger";

    let fillStyle = `width: ${trip.progress}%`;

    let actionButtons = "";
    if (trip.status === "Pending") {
      actionButtons = `
        <button class="btn btn-primary" onclick="updateTripStatus('${trip.id}', 'In Transit')">Dispatch</button>
      `;
    } else if (trip.status === "In Transit") {
      actionButtons = `
        <button class="btn btn-primary" style="background-color:var(--color-emerald); color:var(--text-inverse); box-shadow:var(--glow-emerald);" onclick="updateTripStatus('${trip.id}', 'Delivered')">Mark Delivered</button>
        <button class="btn btn-danger" onclick="updateTripStatus('${trip.id}', 'Cancelled')">Cancel</button>
      `;
    }

    const truck = appData.trucks.find(t => t.id === trip.truckId);
    const driver = appData.drivers.find(d => d.id === trip.driverId);

    const totalDist = (trip.distance || 0) + (trip.returnDistance || 0);
    const totalTolls = (trip.tollCost || 0) + (trip.returnTollCost || 0);

    const card = document.createElement("div");
    card.className = "trip-bar-card";
    card.innerHTML = `
      <div class="trip-identity">
        <span class="trip-id">${trip.id}</span>
        <span class="trip-cargo-desc">Round Trip: <strong>${trip.source} &harr; ${trip.destination}</strong></span>
        <span class="trip-cargo-desc" style="font-size:0.75rem;">Total Mileage: ${totalDist} KM | Total Tolls: ₹${totalTolls.toLocaleString('en-IN')}</span>
        <span class="trip-cargo-desc" style="font-size:0.75rem; color:var(--color-cyan); font-weight:bold;">Net Est. Profit: ₹${((trip.revenue || 0) - (trip.expense || 0)).toLocaleString('en-IN')}</span>
      </div>

      <div class="trip-route-visual" style="flex-direction: column; gap: 8px; align-items: stretch; border-left: 2px dashed var(--border-color); padding-left: 12px; margin-top: 10px; margin-bottom:10px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
          <span>Outward Route: <strong>${trip.source} &rarr; ${trip.destination}</strong> (${trip.distance} KM, Toll: ₹${trip.tollCost})</span>
          <span>Start: ${trip.startDate}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
          <span>Return Route: <strong>${trip.returnSource || 'N/A'} &rarr; ${trip.returnDestination || 'N/A'}</strong> (${trip.returnDistance || 0} KM, Toll: ₹${trip.returnTollCost || 0})</span>
          <span>ETA: ${trip.endDate}</span>
        </div>
        <div class="route-progress-bar-wrapper" style="margin-top: 6px;">
          <div class="route-line-bg">
            <div class="route-line-fill" style="${fillStyle}"></div>
          </div>
          <span class="route-progress-percent">${trip.progress}% Completed</span>
        </div>
      </div>

      <div class="trip-assignments">
        <div class="trip-assignment-row">
          <span>Assigned Truck:</span>
          <span>${truck ? truck.plate : 'None'} (${trip.truckId || 'N/A'})</span>
        </div>
        <div class="trip-assignment-row">
          <span>Operator:</span>
          <span>${driver ? driver.name : 'None'}</span>
        </div>
      </div>

      <div class="trip-action-panel" style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <span class="badge ${statusBadgeClass}">${trip.status}</span>
        <div class="trip-action-buttons" style="display:flex; align-items:center; gap:8px;">
          ${actionButtons}
          <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 6px 12px; font-weight:bold; color:var(--color-cyan); border-color:var(--color-cyan);" onclick="viewTripDetails('${trip.id}')">
            View Details &amp; Expenses
          </button>
          <button class="btn btn-secondary btn-icon-only btn-edit" onclick="editTrip('${trip.id}')" title="Edit Trip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn btn-icon-only btn-delete" onclick="deleteTrip('${trip.id}')" title="Delete Trip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function editTrip(id) {
  const trip = appData.trips.find(t => t.id === id);
  if (!trip) return;

  document.getElementById("edit-trip-id").value = trip.id;
  document.getElementById("edit-trip-source").value = trip.source;
  document.getElementById("edit-trip-destination").value = trip.destination;
  document.getElementById("edit-trip-distance").value = trip.distance || 0;
  document.getElementById("edit-trip-toll").value = trip.tollCost || 0;
  
  document.getElementById("edit-trip-return-source").value = trip.returnSource || '';
  document.getElementById("edit-trip-return-destination").value = trip.returnDestination || '';
  document.getElementById("edit-trip-return-distance").value = trip.returnDistance || 0;
  document.getElementById("edit-trip-return-toll").value = trip.returnTollCost || 0;

  document.getElementById("edit-trip-start").value = trip.startDate;
  document.getElementById("edit-trip-end").value = trip.endDate;
  document.getElementById("edit-trip-status").value = trip.status;
  document.getElementById("edit-trip-progress").value = trip.progress;

  const truckSelect = document.getElementById("edit-trip-truck");
  truckSelect.innerHTML = "";
  appData.trucks.forEach(truck => {
    if (truck.status === "Idle" || truck.id === trip.truckId) {
      const opt = document.createElement("option");
      opt.value = truck.id;
      opt.text = `${truck.plate} (${truck.model})`;
      if (truck.id === trip.truckId) opt.selected = true;
      truckSelect.appendChild(opt);
    }
  });

  const driverSelect = document.getElementById("edit-trip-driver");
  driverSelect.innerHTML = "";
  appData.drivers.forEach(driver => {
    if (driver.status === "Available" || driver.id === trip.driverId) {
      const opt = document.createElement("option");
      opt.value = driver.id;
      opt.text = `${driver.name} (Safety Score: ${driver.rating || 5.0}★)`;
      if (driver.id === trip.driverId) opt.selected = true;
      driverSelect.appendChild(opt);
    }
  });

  openModal('edit-trip-modal');
}

async function updateTripStatus(id, status) {
  const payload = { status };
  if (status === 'Delivered') payload.progress = 100;
  
  const res = await apiRequest(`/api/trips/${id}`, 'PUT', payload);
  if (res) initApp();
}

async function deleteTrip(id) {
  if (confirm(`Are you sure you want to delete trip ${id}?`)) {
    const res = await apiRequest(`/api/trips/${id}`, 'DELETE');
    if (res) initApp();
  }
}

// -----------------------------------------------------------------------------
// TRIP DETAILS & EXPENSE MANAGEMENT (MODAL VIEW)
// -----------------------------------------------------------------------------
function viewTripDetails(id) {
  const trip = appData.trips.find(t => t.id === id);
  if (!trip) return;

  const truck = appData.trucks.find(t => t.id === trip.truckId);
  const driver = appData.drivers.find(d => d.id === trip.driverId);

  // Set hidden details fields
  document.getElementById("details-trip-id").value = trip.id;
  document.getElementById("details-trip-title").innerText = `Details & Expense Ledger for ${trip.id}`;

  // Populate basic summary elements
  document.getElementById("details-trip-truck").innerText = truck ? `${truck.plate} (${truck.id})` : 'N/A';
  document.getElementById("details-trip-driver").innerText = driver ? driver.name : 'N/A';
  document.getElementById("details-trip-start").innerText = trip.startDate || 'N/A';
  document.getElementById("details-trip-end").innerText = trip.endDate || 'N/A';
  
  document.getElementById("details-trip-hubs").innerHTML = `
    <strong>${trip.source} &rarr; ${trip.destination}</strong> <span style="font-size:0.8rem; color:var(--text-muted); font-weight:normal;">(Outward)</span><br/>
    <strong>${trip.returnSource || 'N/A'} &rarr; ${trip.returnDestination || 'N/A'}</strong> <span style="font-size:0.8rem; color:var(--text-muted); font-weight:normal;">(Return)</span>
  `;
  
  const totalDistance = (trip.distance || 0) + (trip.returnDistance || 0);
  const totalTolls = (trip.tollCost || 0) + (trip.returnTollCost || 0);

  document.getElementById("details-trip-distance").innerText = `${totalDistance} KM`;
  document.getElementById("details-trip-tolls").innerText = `₹${totalTolls.toLocaleString('en-IN')}`;
  document.getElementById("details-trip-revenue").innerText = `₹${(trip.revenue || 0).toLocaleString('en-IN')}`;
  document.getElementById("details-trip-expense").innerText = `₹${(trip.expense || 0).toLocaleString('en-IN')}`;
  
  const netProfit = (trip.revenue || 0) - (trip.expense || 0);
  const profitEl = document.getElementById("details-trip-profit");
  profitEl.innerText = `₹${netProfit.toLocaleString('en-IN')}`;
  if (netProfit < 0) {
    profitEl.style.color = "var(--color-red)";
  } else {
    profitEl.style.color = "var(--color-emerald)";
  }

  // Populate dropdowns inside modal
  const expMethodSelect = document.getElementById("trip-exp-method");
  expMethodSelect.innerHTML = "";
  const fuelMethodSelect = document.getElementById("trip-fuel-method");
  fuelMethodSelect.innerHTML = "";
  
  appData.financialAccounts.forEach(acc => {
    const opt1 = document.createElement("option");
    opt1.value = acc.name;
    opt1.text = `${acc.name} (Balance: ₹${acc.balance.toLocaleString('en-IN')})`;
    expMethodSelect.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = acc.name;
    opt2.text = `${acc.name} (Balance: ₹${acc.balance.toLocaleString('en-IN')})`;
    fuelMethodSelect.appendChild(opt2);
  });

  // Load recorded trip expenses
  const tripExpenses = appData.transactions.filter(t => t.referenceId === trip.id && t.type === 'Expense');
  const expTbody = document.getElementById("trip-expenses-table-body");
  expTbody.innerHTML = "";

  if (tripExpenses.length === 0) {
    expTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:12px;">No trip expenses recorded yet.</td></tr>`;
  } else {
    tripExpenses.forEach(txn => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${txn.date}</td>
        <td><span class="badge badge-danger">${txn.category}</span></td>
        <td>${txn.paymentMethod}</td>
        <td>${txn.description}</td>
        <td style="font-weight:700; color:var(--color-red);">₹${txn.amount.toLocaleString('en-IN')}</td>
        <td>
          <button class="btn btn-secondary btn-icon-only btn-delete" onclick="deleteTripExpense('${txn.id}', '${trip.id}')" title="Delete Expense">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      `;
      expTbody.appendChild(tr);
    });
  }

  // Load linked fuel logs
  const tripFuelLogs = appData.fuelLogs.filter(f => f.tripId === trip.id);
  const fuelTbody = document.getElementById("trip-fuel-table-body");
  fuelTbody.innerHTML = "";

  if (tripFuelLogs.length === 0) {
    fuelTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:12px;">No fuel logs linked to this trip.</td></tr>`;
  } else {
    tripFuelLogs.forEach(log => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${log.date}</td>
        <td>${log.quantity} L</td>
        <td>₹${log.pricePerLiter}/L</td>
        <td style="font-weight:700; color:var(--color-orange);">₹${log.totalCost.toLocaleString('en-IN')}</td>
        <td>${log.odometer.toLocaleString()} KM</td>
        <td>${log.paymentMethod}</td>
        <td>
          <button class="btn btn-secondary btn-icon-only btn-delete" onclick="deleteTripFuelLog('${log.id}', '${trip.id}')" title="Unlink & Delete Fuel Log">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </td>
      `;
      fuelTbody.appendChild(tr);
    });
  }

  // BUG-11 FIX: Load linked DEF logs for this trip
  const tripDefLogs = appData.defLogs.filter(d => d.tripId === trip.id);
  const defTbody = document.getElementById("trip-def-table-body");
  if (defTbody) {
    defTbody.innerHTML = "";
    if (tripDefLogs.length === 0) {
      defTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:12px;">No DEF/AdBlue logs linked to this trip.</td></tr>`;
    } else {
      tripDefLogs.forEach(log => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${log.date}</td>
          <td>${log.quantity} L</td>
          <td>₹${log.pricePerLiter}/L</td>
          <td style="font-weight:700; color:var(--color-orange);">₹${log.totalCost.toLocaleString('en-IN')}</td>
          <td>${log.odometer.toLocaleString()} KM</td>
          <td>${log.paymentMethod}</td>
          <td>
            <button class="btn btn-secondary btn-icon-only btn-delete" onclick="deleteTripDefLog('${log.id}', '${trip.id}')" title="Unlink & Delete DEF Log">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        `;
        defTbody.appendChild(tr);
      });
    }
  }

  // Reset defaults for forms inside details modal
  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById("trip-exp-date").value = todayStr;
  document.getElementById("trip-fuel-date").value = todayStr;

  switchTripDetailsSubTab('expenses');
  openModal('trip-details-modal');
}
window.viewTripDetails = viewTripDetails;

async function deleteTripExpense(txnId, tripId) {
  if (confirm("Are you sure you want to delete this trip expense transaction?")) {
    const res = await apiRequest(`/api/transactions/${txnId}`, 'DELETE');
    if (res) {
      await initApp();
      viewTripDetails(tripId);
    }
  }
}
window.deleteTripExpense = deleteTripExpense;

async function deleteTripFuelLog(fuelId, tripId) {
  if (confirm("Are you sure you want to delete this fuel purchase record?")) {
    const res = await apiRequest(`/api/fuel-logs/${fuelId}`, 'DELETE');
    if (res) {
      await initApp();
      viewTripDetails(tripId);
    }
  }
}
window.deleteTripFuelLog = deleteTripFuelLog;

async function deleteTripDefLog(defId, tripId) {
  if (confirm("Are you sure you want to delete this DEF/AdBlue record?")) {
    const res = await apiRequest(`/api/def-logs/${defId}`, 'DELETE');
    if (res) {
      await initApp();
      viewTripDetails(tripId);
    }
  }
}
window.deleteTripDefLog = deleteTripDefLog;

// -----------------------------------------------------------------------------
// MAINTENANCE VIEW
// -----------------------------------------------------------------------------
function renderMaintenance() {
  renderMaintenanceTable(appData.maintenance);
}

function renderMaintenanceTable(maintList) {
  const tbody = document.getElementById("maintenance-table-body");
  tbody.innerHTML = "";

  if (maintList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No maintenance logs found.</td></tr>`;
    return;
  }

  maintList.forEach(maint => {
    const truck = appData.trucks.find(t => t.id === maint.truckId);
    const plate = truck ? truck.plate : "N/A";
    
    let statusClass = "badge-warning";
    let actionBtn = "";
    
    if (maint.status === "Completed") {
      statusClass = "badge-success";
    } else {
      actionBtn = `
        <button class="btn btn-primary" onclick="completeMaintenance('${maint.id}', '${maint.truckId}')">
          Release Vehicle
        </button>
      `;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family: var(--font-header); font-weight:700; color: var(--color-cyan);">${maint.id}</td>
      <td><strong>${maint.truckId}</strong></td>
      <td>${plate}</td>
      <td>${maint.date}</td>
      <td>${maint.type}</td>
      <td style="font-weight:600; color:var(--color-orange);">₹${maint.cost.toLocaleString('en-IN')}</td>
      <td><span class="badge ${statusClass}">${maint.status}</span></td>
      <td>
        <div class="table-row-actions">
          ${actionBtn}
          <button class="btn-icon-only btn-edit" onclick="editMaintenance('${maint.id}')" title="Edit Log">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn-icon-only btn-delete" onclick="deleteMaintenance('${maint.id}')" title="Delete Log">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editMaintenance(id) {
  const maint = appData.maintenance.find(m => m.id === id);
  if (!maint) return;

  document.getElementById("edit-maintenance-id").value = maint.id;
  document.getElementById("edit-maint-date").value = maint.date;
  document.getElementById("edit-maint-type").value = maint.type;
  document.getElementById("edit-maint-cost").value = maint.cost;
  document.getElementById("edit-maint-status").value = maint.status;

  const truckSelect = document.getElementById("edit-maint-truck");
  truckSelect.innerHTML = "";
  appData.trucks.forEach(truck => {
    const opt = document.createElement("option");
    opt.value = truck.id;
    opt.text = `${truck.plate} (${truck.model})`;
    if (truck.id === maint.truckId) opt.selected = true;
    truckSelect.appendChild(opt);
  });

  openModal('edit-maintenance-modal');
}

// BUG-02 FIX: pass truckId so server can set truck status back to Idle
async function completeMaintenance(id, truckId) {
  const todayStr = new Date().toISOString().split('T')[0];
  const payload = { status: "Completed", date: todayStr, truckId: truckId };
  
  const res = await apiRequest(`/api/maintenance/${id}`, 'PUT', payload);
  if (res) initApp();
}

async function deleteMaintenance(id) {
  if (confirm(`Are you sure you want to delete maintenance record ${id}?`)) {
    const res = await apiRequest(`/api/maintenance/${id}`, 'DELETE');
    if (res) initApp();
  }
}

// -----------------------------------------------------------------------------
// FUEL LOGS RENDERERS (GLOBAL VIEW)
// -----------------------------------------------------------------------------
// BUG-08 FIX: update fuel KPI cards, not just table
function renderFuelLogs() {
  renderFuelLogsTable(appData.fuelLogs);

  const totalLiters = appData.fuelLogs.reduce((s, f) => s + f.quantity, 0);
  const totalCost = appData.fuelLogs.reduce((s, f) => s + f.totalCost, 0);
  const avgPrice = appData.fuelLogs.length > 0 ? (totalCost / totalLiters) : 0;

  const el1 = document.getElementById("fuel-total-liters");
  const el2 = document.getElementById("fuel-total-cost");
  const el3 = document.getElementById("fuel-avg-price");
  if (el1) el1.innerText = `${totalLiters.toFixed(1)} L`;
  if (el2) el2.innerText = `₹${totalCost.toLocaleString('en-IN')}`;
  if (el3) el3.innerText = `₹${avgPrice.toFixed(2)}`;
}

function renderFuelLogsTable(fuelList) {
  const tbody = document.getElementById("fuel-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (fuelList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-muted);">No fuel logs registered.</td></tr>`;
    return;
  }

  fuelList.forEach(log => {
    const truck = appData.trucks.find(t => t.id === log.truckId);
    const plate = truck ? truck.plate : "N/A";
    
    const driver = appData.drivers.find(d => d.id === log.driverId);
    const driverName = driver ? driver.name : "N/A";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family: var(--font-header); font-weight:700; color: var(--color-cyan);">${log.id}</td>
      <td><strong>${log.truckId}</strong></td>
      <td>${plate}</td>
      <td>${driverName}</td>
      <td>${log.date}</td>
      <td><span style="font-family: var(--font-header); font-weight:bold; color: var(--color-cyan);">${log.tripId || '-'}</span></td>
      <td>${log.quantity} Liters</td>
      <td>₹${log.pricePerLiter}/L</td>
      <td style="font-weight:700; color:var(--color-orange);">₹${log.totalCost.toLocaleString('en-IN')}</td>
      <td>${log.odometer.toLocaleString()} KM</td>
      <td><span class="badge" style="background-color:rgba(255,255,255,0.06); border:1px solid var(--border-color);">${log.paymentMethod}</span></td>
      <td>
        <div class="table-row-actions">
          <button class="btn-icon-only btn-edit" onclick="editFuelLog('${log.id}')" title="Edit Log">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn-icon-only btn-delete" onclick="deleteFuelLog('${log.id}')" title="Delete Log">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editFuelLog(id) {
  const log = appData.fuelLogs.find(f => f.id === id);
  if (!log) return;

  document.getElementById("edit-fuel-id").value = log.id;
  document.getElementById("edit-fuel-date").value = log.date;
  document.getElementById("edit-fuel-qty").value = log.quantity;
  document.getElementById("edit-fuel-price").value = log.pricePerLiter;
  document.getElementById("edit-fuel-odometer").value = log.odometer;
  document.getElementById("edit-fuel-payment-method").value = log.paymentMethod;
  document.getElementById("edit-fuel-trip").value = log.tripId || '';

  const truckSelect = document.getElementById("edit-fuel-truck");
  truckSelect.innerHTML = "";
  appData.trucks.forEach(truck => {
    const opt = document.createElement("option");
    opt.value = truck.id;
    opt.text = `${truck.plate} (${truck.model})`;
    if (truck.id === log.truckId) opt.selected = true;
    truckSelect.appendChild(opt);
  });

  const driverSelect = document.getElementById("edit-fuel-driver");
  driverSelect.innerHTML = "";
  appData.drivers.forEach(driver => {
    const opt = document.createElement("option");
    opt.value = driver.id;
    opt.text = `${driver.name} (${driver.id})`;
    if (driver.id === log.driverId) opt.selected = true;
    driverSelect.appendChild(opt);
  });

  openModal('edit-fuel-modal');
}

async function deleteFuelLog(id) {
  if (confirm(`Are you sure you want to remove fuel log ${id}?`)) {
    const res = await apiRequest(`/api/fuel-logs/${id}`, 'DELETE');
    if (res) initApp();
  }
}

// -----------------------------------------------------------------------------
// DEF LOGS RENDERERS
// -----------------------------------------------------------------------------
function renderDefLogs() {
  renderDefLogsTable(appData.defLogs);

  // KPI cards
  const totalLiters = appData.defLogs.reduce((s, d) => s + d.quantity, 0);
  const totalCost = appData.defLogs.reduce((s, d) => s + d.totalCost, 0);
  const avgPrice = appData.defLogs.length > 0 ? (totalCost / totalLiters) : 0;

  const el1 = document.getElementById("def-total-liters");
  const el2 = document.getElementById("def-total-cost");
  const el3 = document.getElementById("def-avg-price");
  if (el1) el1.innerText = `${totalLiters.toFixed(1)} L`;
  if (el2) el2.innerText = `₹${totalCost.toLocaleString('en-IN')}`;
  if (el3) el3.innerText = `₹${avgPrice.toFixed(2)}`;
}
window.renderDefLogs = renderDefLogs;

function renderDefLogsTable(defList) {
  const tbody = document.getElementById("def-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!defList || defList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: var(--text-muted);">No DEF/AdBlue logs registered.</td></tr>`;
    return;
  }

  defList.forEach(log => {
    const truck = appData.trucks.find(t => t.id === log.truckId);
    const plate = truck ? truck.plate : "N/A";
    const driver = appData.drivers.find(d => d.id === log.driverId);
    const driverName = driver ? driver.name : "N/A";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family: var(--font-header); font-weight:700; color: var(--color-cyan);">${log.id}</td>
      <td><strong>${log.truckId}</strong></td>
      <td>${plate}</td>
      <td>${driverName}</td>
      <td>${log.date}</td>
      <td><span style="font-family: var(--font-header); font-weight:bold; color: var(--color-cyan);">${log.tripId || '-'}</span></td>
      <td>${log.quantity} Liters</td>
      <td>₹${log.pricePerLiter}/L</td>
      <td style="font-weight:700; color:var(--color-orange);">₹${log.totalCost.toLocaleString('en-IN')}</td>
      <td>${log.odometer.toLocaleString()} KM</td>
      <td><span class="badge" style="background-color:rgba(255,255,255,0.06); border:1px solid var(--border-color);">${log.paymentMethod}</span></td>
      <td>
        <div class="table-row-actions">
          <button class="btn-icon-only btn-edit" onclick="editDefLog('${log.id}')" title="Edit DEF Log">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn-icon-only btn-delete" onclick="deleteDefLog('${log.id}')" title="Delete DEF Log">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
window.renderDefLogsTable = renderDefLogsTable;

function editDefLog(id) {
  const log = appData.defLogs.find(d => d.id === id);
  if (!log) return;

  document.getElementById("edit-def-id").value = log.id;
  document.getElementById("edit-def-date").value = log.date;
  document.getElementById("edit-def-qty").value = log.quantity;
  document.getElementById("edit-def-price").value = log.pricePerLiter;
  document.getElementById("edit-def-odometer").value = log.odometer;
  document.getElementById("edit-def-payment-method").value = log.paymentMethod;
  document.getElementById("edit-def-trip").value = log.tripId || '';

  const truckSel = document.getElementById("edit-def-truck");
  truckSel.innerHTML = "";
  appData.trucks.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id; opt.text = `${t.plate} (${t.model})`;
    if (t.id === log.truckId) opt.selected = true;
    truckSel.appendChild(opt);
  });

  const driverSel = document.getElementById("edit-def-driver");
  driverSel.innerHTML = "";
  appData.drivers.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.id; opt.text = `${d.name} (${d.id})`;
    if (d.id === log.driverId) opt.selected = true;
    driverSel.appendChild(opt);
  });

  openModal('edit-def-modal');
}
window.editDefLog = editDefLog;

async function deleteDefLog(id) {
  if (confirm(`Are you sure you want to remove DEF log ${id}?`)) {
    const res = await apiRequest(`/api/def-logs/${id}`, 'DELETE');
    if (res) initApp();
  }
}
window.deleteDefLog = deleteDefLog;


// -----------------------------------------------------------------------------
function renderAccounts() {
  const typeFilter = document.getElementById("txn-filter-type").value;
  const catFilter = document.getElementById("txn-filter-category").value;
  const accountFilter = document.getElementById("txn-filter-account").value;

  const incomeList = appData.transactions.filter(t => t.type === 'Income');
  const expenseList = appData.transactions.filter(t => t.type === 'Expense');

  const totalIncome = incomeList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalExpense = expenseList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  document.getElementById("accounts-total-income").innerText = `₹${totalIncome.toLocaleString('en-IN')}`;
  document.getElementById("accounts-total-expenses").innerText = `₹${totalExpense.toLocaleString('en-IN')}`;
  
  const netEl = document.getElementById("accounts-net-balance");
  netEl.innerText = `₹${netBalance.toLocaleString('en-IN')}`;
  
  if (netBalance < 0) {
    netEl.style.color = "var(--color-red)";
  } else {
    netEl.style.color = "var(--color-cyan)";
  }

  const filtered = appData.transactions.filter(t => {
    const matchType = (typeFilter === 'All') || (t.type === typeFilter);
    const matchCat = (catFilter === 'All') || (t.category === catFilter);
    const matchAccount = (accountFilter === 'All') || (t.paymentMethod === accountFilter);
    return matchType && matchCat && matchAccount;
  });

  renderAccountsTable(filtered);
}

function renderAccountsTable(txnList) {
  const tbody = document.getElementById("accounts-table-body");
  tbody.innerHTML = "";

  if (txnList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">No transaction records match these filter sets.</td></tr>`;
    return;
  }

  txnList.forEach(txn => {
    let typeBadge = "badge-info";
    if (txn.type === "Income") typeBadge = "badge-success";
    if (txn.type === "Expense") typeBadge = "badge-danger";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family: var(--font-header); font-weight:700; color: var(--color-cyan);">${txn.id}</td>
      <td>${txn.date}</td>
      <td><span class="badge ${typeBadge}">${txn.type}</span></td>
      <td><strong>${txn.category}</strong></td>
      <td><span class="badge" style="background-color:rgba(255,255,255,0.06); border:1px solid var(--border-color);">${txn.paymentMethod || 'Cash'}</span></td>
      <td><span style="color:var(--text-muted); font-size:0.8rem;">${txn.referenceId || '-'}</span></td>
      <td style="font-size:0.82rem; max-width:200px; word-break:break-all;">${txn.description}</td>
      <td style="font-weight:700; font-size:0.95rem; color:${txn.type === 'Income' ? 'var(--color-emerald)' : 'var(--color-red)'}">
        ${txn.type === 'Income' ? '+' : '-'} ₹${txn.amount.toLocaleString('en-IN')}
      </td>
      <td>
        <div class="table-row-actions">
          <button class="btn-icon-only btn-edit" onclick="editTransaction('${txn.id}')" title="Edit Entry">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn-icon-only btn-delete" onclick="deleteTransaction('${txn.id}')" title="Remove Entry">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editTransaction(id) {
  const txn = appData.transactions.find(t => t.id === id);
  if (!txn) return;

  document.getElementById("edit-transaction-id").value = txn.id;
  document.getElementById("edit-txn-date").value = txn.date;
  document.getElementById("edit-txn-type").value = txn.type;
  document.getElementById("edit-txn-category").value = txn.category;
  document.getElementById("edit-transaction-modal").querySelector('#edit-txn-payment-method').value = txn.paymentMethod || 'Cash';
  document.getElementById("edit-txn-amount").value = txn.amount;
  document.getElementById("edit-txn-desc").value = txn.description;
  document.getElementById("edit-txn-ref").value = txn.referenceId || '';

  openModal('edit-transaction-modal');
}

async function deleteTransaction(id) {
  if (confirm(`Are you sure you want to remove ledger record ${id}?`)) {
    const res = await apiRequest(`/api/transactions/${id}`, 'DELETE');
    if (res) initApp();
  }
}

// Render user login managers
function renderUsers() {
  renderUsersTable(appData.users);
}

function renderUsersTable(usersList) {
  const tbody = document.getElementById("users-table-body");
  tbody.innerHTML = "";
  
  if (!usersList || usersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No managers registered yet.</td></tr>`;
    return;
  }
  
  usersList.forEach(user => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family: var(--font-header); font-weight:700; color: var(--color-cyan);">${user.id}</td>
      <td><strong>${user.name}</strong></td>
      <td>${user.username}</td>
      <td><span class="badge badge-info">${user.role}</span></td>
      <td>
        <div class="table-row-actions">
          <button class="btn-icon-only btn-delete" onclick="deleteUser(${user.id})" title="Delete Login Profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
window.renderUsersTable = renderUsersTable;
window.deleteUser = deleteUser;

async function deleteUser(id) {
  if (confirm(`Are you sure you want to delete this user login account?`)) {
    const res = await apiRequest(`/api/users/${id}`, 'DELETE');
    if (res) initApp();
  }
}

// Render Custom Bank Accounts / Cash Wallet list
function renderFinancialAccounts() {
  renderFinancialAccountsTable(appData.financialAccounts);
}

function renderFinancialAccountsTable(acctList) {
  const tbody = document.getElementById("financial-accounts-table-body");
  tbody.innerHTML = "";
  
  if (!acctList || acctList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No registered bank accounts found.</td></tr>`;
    return;
  }
  
  acctList.forEach(acc => {
    let detailsHtml = `<strong>${acc.name}</strong>`;
    if (acc.type === 'Bank' || acc.type === 'Credit Card') {
      detailsHtml += `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
        ${acc.bankName || 'N/A'} | A/C: ${acc.accountNumber || 'N/A'} | IFSC: ${acc.ifscCode || 'N/A'}
      </div>`;
    } else if (acc.type === 'Mobile Wallet') {
      detailsHtml += `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
        UPI ID/Number: ${acc.accountNumber || 'N/A'}
      </div>`;
    } else {
      detailsHtml += `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
        ${acc.bankName || 'Cash Drawer'}
      </div>`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family: var(--font-header); font-weight:700; color: var(--color-cyan);">${acc.id}</td>
      <td>${detailsHtml}</td>
      <td><span class="badge" style="background-color:rgba(255,255,255,0.06); border:1px solid var(--border-color);">${acc.type}</span></td>
      <td style="font-weight:700; color:var(--color-emerald);">₹${acc.balance.toLocaleString('en-IN')}</td>
      <td>
        <div class="table-row-actions" style="gap:8px;">
          <button class="btn btn-secondary" style="font-size:0.75rem; padding: 4px 8px;" onclick="viewLedgerForAccount('${acc.name}')" title="View Ledger Transactions">
            View Ledger
          </button>
          <button class="btn-icon-only btn-delete" onclick="deleteFinancialAccount('${acc.id}')" title="Remove Account">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function viewLedgerForAccount(accountName) {
  // Switch sidebar active class to accounts
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach(btn => btn.classList.remove("active"));
  const accountsTabBtn = Array.from(menuItems).find(btn => btn.getAttribute("data-tab") === "accounts");
  if (accountsTabBtn) accountsTabBtn.classList.add("active");

  const tabPanels = document.querySelectorAll(".tab-panel");
  tabPanels.forEach(panel => panel.classList.remove("active"));
  const accountsPanel = document.getElementById("accounts-tab");
  if (accountsPanel) accountsPanel.classList.add("active");

  // Switch subtab navigation to ledger
  switchAccountsSubTab('ledger');

  // Set filter value
  const filterSelect = document.getElementById("txn-filter-account");
  if (filterSelect) {
    filterSelect.value = accountName;
    renderAccounts();
  }
}
window.viewLedgerForAccount = viewLedgerForAccount;

async function deleteFinancialAccount(id) {
  if (confirm(`Are you sure you want to delete this financial account?`)) {
    const res = await apiRequest(`/api/financial-accounts/${id}`, 'DELETE');
    if (res) initApp();
  }
}
window.deleteFinancialAccount = deleteFinancialAccount;

// Populate dropdowns dynamically
function populateDropdowns() {
  const truckDriverSelect = document.getElementById("truck-driver");
  truckDriverSelect.innerHTML = `<option value="">No Driver Assigned</option>`;
  appData.drivers.forEach(driver => {
    if (!driver.truckId || driver.truckId === "") {
      const opt = document.createElement("option");
      opt.value = driver.id;
      opt.text = `${driver.name} (${driver.id})`;
      truckDriverSelect.appendChild(opt);
    }
  });

  const driverTruckSelect = document.getElementById("driver-truck");
  driverTruckSelect.innerHTML = `<option value="">No Truck Assigned</option>`;
  appData.trucks.forEach(truck => {
    if (!truck.driverId || truck.driverId === "") {
      const opt = document.createElement("option");
      opt.value = truck.id;
      opt.text = `${truck.plate} (${truck.id})`;
      driverTruckSelect.appendChild(opt);
    }
  });

  const tripTruckSelect = document.getElementById("trip-truck");
  tripTruckSelect.innerHTML = `<option value="">Choose Available Truck...</option>`;
  appData.trucks.forEach(truck => {
    if (truck.status === "Idle") {
      const opt = document.createElement("option");
      opt.value = truck.id;
      opt.text = `${truck.plate} (${truck.model})`;
      tripTruckSelect.appendChild(opt);
    }
  });

  const tripDriverSelect = document.getElementById("trip-driver");
  tripDriverSelect.innerHTML = `<option value="">Choose Available Driver...</option>`;
  appData.drivers.forEach(driver => {
    if (driver.status === "Available") {
      const opt = document.createElement("option");
      opt.value = driver.id;
      opt.text = `${driver.name} (Safety Score: ${driver.rating || 5.0}★)`;
      tripDriverSelect.appendChild(opt);
    }
  });

  const maintTruckSelect = document.getElementById("maint-truck");
  maintTruckSelect.innerHTML = `<option value="">Choose Vehicle...</option>`;
  appData.trucks.forEach(truck => {
    const opt = document.createElement("option");
    opt.value = truck.id;
    opt.text = `${truck.plate} (${truck.model})`;
    maintTruckSelect.appendChild(opt);
  });

  // Dynamically populate Financial Accounts/Banks in transaction modals
  const txnMethodSelect = document.getElementById("txn-payment-method");
  txnMethodSelect.innerHTML = "";
  const editTxnMethodSelect = document.getElementById("edit-txn-payment-method");
  editTxnMethodSelect.innerHTML = "";
  
  appData.financialAccounts.forEach(acc => {
    const opt1 = document.createElement("option");
    opt1.value = acc.name;
    opt1.text = `${acc.name} (Balance: ₹${acc.balance.toLocaleString('en-IN')})`;
    txnMethodSelect.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = acc.name;
    opt2.text = `${acc.name} (Balance: ₹${acc.balance.toLocaleString('en-IN')})`;
    editTxnMethodSelect.appendChild(opt2);
  });

  // Populate Filter by Account dropdown
  const filterAccountSelect = document.getElementById("txn-filter-account");
  if (filterAccountSelect) {
    const currentFilterVal = filterAccountSelect.value;
    filterAccountSelect.innerHTML = `<option value="All">All Accounts</option>`;
    appData.financialAccounts.forEach(acc => {
      const opt = document.createElement("option");
      opt.value = acc.name;
      opt.text = acc.name;
      if (acc.name === currentFilterVal) opt.selected = true;
      filterAccountSelect.appendChild(opt);
    });
  }

  // Dynamically populate categories in transaction modals and filters
  const txnCatSelect = document.getElementById("txn-category");
  const editTxnCatSelect = document.getElementById("edit-txn-category");
  const tripExpCatSelect = document.getElementById("trip-exp-category");
  const filterCatSelect = document.getElementById("txn-filter-category");

  if (txnCatSelect) {
    const currentTxnCat = txnCatSelect.value;
    txnCatSelect.innerHTML = "";
    appData.categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.name;
      opt.text = `${cat.name} (${cat.type})`;
      if (cat.name === currentTxnCat) opt.selected = true;
      txnCatSelect.appendChild(opt);
    });
  }

  if (editTxnCatSelect) {
    const currentEditTxnCat = editTxnCatSelect.value;
    editTxnCatSelect.innerHTML = "";
    appData.categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.name;
      opt.text = `${cat.name} (${cat.type})`;
      if (cat.name === currentEditTxnCat) opt.selected = true;
      editTxnCatSelect.appendChild(opt);
    });
  }

  if (tripExpCatSelect) {
    const currentTripExpCat = tripExpCatSelect.value;
    tripExpCatSelect.innerHTML = "";
    appData.categories.filter(cat => cat.type === 'Expense').forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.name;
      opt.text = cat.name;
      if (cat.name === currentTripExpCat) opt.selected = true;
      tripExpCatSelect.appendChild(opt);
    });
  }

  if (filterCatSelect) {
    const currentFilterCat = filterCatSelect.value;
    filterCatSelect.innerHTML = `<option value="All">All Categories</option>`;
    appData.categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.name;
      opt.text = cat.name;
      if (cat.name === currentFilterCat) opt.selected = true;
      filterCatSelect.appendChild(opt);
    });
  }

  // Populate Add Fuel Log Modal dropdowns
  const fuelTruckSelect = document.getElementById("fuel-truck");
  fuelTruckSelect.innerHTML = `<option value="">Choose Vehicle...</option>`;
  appData.trucks.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.text = `${t.plate} (${t.model})`;
    fuelTruckSelect.appendChild(opt);
  });

  const fuelDriverSelect = document.getElementById("fuel-driver");
  fuelDriverSelect.innerHTML = `<option value="">Choose Operator...</option>`;
  appData.drivers.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.text = `${d.name} (${d.id})`;
    fuelDriverSelect.appendChild(opt);
  });

  const fuelPaymentSelect = document.getElementById("fuel-payment-method");
  fuelPaymentSelect.innerHTML = "";
  appData.financialAccounts.forEach(acc => {
    const opt = document.createElement("option");
    opt.value = acc.name;
    opt.text = `${acc.name} (Balance: ₹${acc.balance.toLocaleString('en-IN')})`;
    fuelPaymentSelect.appendChild(opt);
  });

  // Populate Trip selectors for Fuel Refills
  const fuelTripSelect = document.getElementById("fuel-trip");
  fuelTripSelect.innerHTML = `<option value="">Select Trip (Optional)</option>`;
  const editFuelTripSelect = document.getElementById("edit-fuel-trip");
  editFuelTripSelect.innerHTML = `<option value="">Select Trip (Optional)</option>`;
  
  appData.trips.forEach(trip => {
    const opt1 = document.createElement("option");
    opt1.value = trip.id;
    opt1.text = `${trip.id} : ${trip.source} to ${trip.destination}`;
    fuelTripSelect.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = trip.id;
    opt2.text = `${trip.id} : ${trip.source} to ${trip.destination}`;
    editFuelTripSelect.appendChild(opt2);
  });

  // Populate DEF Log Modal dropdowns
  ['def-truck','edit-def-truck'].forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = `<option value="">Choose Vehicle...</option>`;
    appData.trucks.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id; opt.text = `${t.plate} (${t.model})`;
      sel.appendChild(opt);
    });
  });
  ['def-driver','edit-def-driver'].forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = `<option value="">Choose Operator...</option>`;
    appData.drivers.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id; opt.text = `${d.name} (${d.id})`;
      sel.appendChild(opt);
    });
  });
  ['def-payment-method','edit-def-payment-method'].forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = "";
    appData.financialAccounts.forEach(acc => {
      const opt = document.createElement("option");
      opt.value = acc.name; opt.text = `${acc.name} (Balance: ₹${acc.balance.toLocaleString('en-IN')})`;
      sel.appendChild(opt);
    });
  });
  ['def-trip','edit-def-trip'].forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = `<option value="">Select Trip (Optional)</option>`;
    appData.trips.forEach(trip => {
      const opt = document.createElement("option");
      opt.value = trip.id; opt.text = `${trip.id} : ${trip.source} to ${trip.destination}`;
      sel.appendChild(opt);
    });
  });
}

// -----------------------------------------------------------------------------
// LIVE MAP SIMULATOR
// -----------------------------------------------------------------------------
function startMapSimulation() {
  const truck1 = document.getElementById("sim-truck-1");
  const truck2 = document.getElementById("sim-truck-2");
  const cities = Object.keys(CITY_COORDS);
  
  setInterval(() => {
    const dashTab = document.getElementById("dashboard-tab");
    if (!dashTab.classList.contains("active")) return;
    
    const randomCity1 = cities[Math.floor(Math.random() * cities.length)];
    const coords1 = CITY_COORDS[randomCity1];
    
    if (truck1 && coords1) {
      truck1.style.top = coords1.top;
      truck1.style.left = coords1.left;
      truck1.querySelector(".truck-label").innerText = `TRK-001`;
    }
    
    setTimeout(() => {
      const randomCity2 = cities[Math.floor(Math.random() * cities.length)];
      const coords2 = CITY_COORDS[randomCity2];
      
      if (truck2 && coords2 && randomCity2 !== randomCity1) {
        truck2.style.top = coords2.top;
        truck2.style.left = coords2.left;
        truck2.querySelector(".truck-label").innerText = `TRK-004`;
      }
    }, 4000);
    
  }, 10000);
}

// -----------------------------------------------------------------------------
// PROFESSIONAL PDF EXPORT FOR ALL APP SECTIONS
// -----------------------------------------------------------------------------
async function exportSectionToPDF(sectionId) {
  const activeMenuItem = document.querySelector(".menu-item.active");
  const sectionTitle = activeMenuItem ? activeMenuItem.innerText.trim() : sectionId.toUpperCase();
  
  let orientation = 'landscape';
  if (sectionId === 'dashboard' || sectionId === 'drivers') {
    orientation = 'portrait';
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const doc = document.createElement("div");
  doc.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  doc.style.color = "#1f2937";
  doc.style.backgroundColor = "#ffffff";
  doc.style.padding = "25px";
  doc.style.margin = "0 auto";
  
  let headerHtml = `
    <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">TransRoute Logistics</h1>
        <p style="margin: 2px 0 0 0; color: #4b5563; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Fleet Operations & Logistics Hub</p>
      </div>
      <div style="text-align: right;">
        <h2 style="margin: 0; color: #0f172a; font-size: 16px; font-weight: 700;">${sectionTitle} Summary Report</h2>
        <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 11px;">Generated: ${dateStr} at ${timeStr}</p>
      </div>
    </div>
  `;
  
  const style = `
    <style>
      .print-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
        font-size: 10px;
      }
      .print-table th {
        background-color: #0f172a;
        color: #ffffff;
        text-align: left;
        padding: 8px 10px;
        font-weight: 600;
        border: 1px solid #0f172a;
      }
      .print-table td {
        padding: 8px 10px;
        border: 1px solid #e5e7eb;
        color: #374151;
      }
      .print-table tr:nth-child(even) td {
        background-color: #f9fafb;
      }
      .badge-print {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 8px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .badge-print-success { background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
      .badge-print-warning { background-color: #fef9c3; color: #a16207; border: 1px solid #fef08a; }
      .badge-print-danger { background-color: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
      .badge-print-info { background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
      
      .kpi-print-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin-bottom: 20px;
      }
      .kpi-print-card {
        border: 1px solid #e5e7eb;
        background-color: #f8fafc;
        padding: 12px;
        border-radius: 6px;
      }
      .kpi-print-title {
        font-size: 9px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: block;
        margin-bottom: 4px;
        font-weight: 600;
      }
      .kpi-print-value {
        font-size: 18px;
        font-weight: 800;
        color: #0f172a;
      }
      .section-subtitle {
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
        margin: 20px 0 10px 0;
        border-bottom: 1.5px solid #0f172a;
        padding-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    </style>
  `;

  let contentHtml = "";

  function getBadgeClass(status) {
    if (!status) return 'badge-print-info';
    const s = status.toLowerCase();
    if (s === 'idle' || s === 'completed' || s === 'delivered' || s === 'available' || s === 'income') return 'badge-print-success';
    if (s === 'on route' || s === 'in transit' || s === 'on duty' || s === 'in progress') return 'badge-print-info';
    if (s === 'maintenance' || s === 'pending') return 'badge-print-warning';
    if (s === 'cancelled' || s === 'expense') return 'badge-print-danger';
    return 'badge-print-info';
  }

  if (sectionId === 'dashboard') {
    const trucksCount = appData.trucks.length;
    const activeDrivers = appData.drivers.filter(d => d.status === 'On Duty').length;
    const activeTrips = appData.trips.filter(t => t.status === 'In Transit').length;
    const maintenanceCount = appData.trucks.filter(t => t.status === 'Maintenance').length;

    const grossRevenue = appData.trips.reduce((sum, t) => sum + (t.revenue || 0), 0);
    const operatingExpenses = appData.transactions.reduce((sum, t) => sum + (t.type === 'Expense' ? t.amount : 0), 0);
    const netProfit = grossRevenue - operatingExpenses;

    contentHtml = `
      <div class="kpi-print-grid">
        <div class="kpi-print-card">
          <span class="kpi-print-title">Total Registered Fleet</span>
          <div class="kpi-print-value">${trucksCount} Trucks</div>
        </div>
        <div class="kpi-print-card">
          <span class="kpi-print-title">On-Duty Drivers</span>
          <div class="kpi-print-value">${activeDrivers} Active</div>
        </div>
        <div class="kpi-print-card">
          <span class="kpi-print-title">Active Dispatched Shipments</span>
          <div class="kpi-print-value">${activeTrips} Trips</div>
        </div>
        <div class="kpi-print-card">
          <span class="kpi-print-title">Vehicles In Workshop</span>
          <div class="kpi-print-value">${maintenanceCount} Trucks</div>
        </div>
      </div>

      <div class="kpi-print-grid" style="grid-template-columns: repeat(3, 1fr);">
        <div class="kpi-print-card" style="border-left: 4px solid #16a34a;">
          <span class="kpi-print-title">Cargo Gross Revenue</span>
          <div class="kpi-print-value" style="color: #16a34a;">₹${grossRevenue.toLocaleString('en-IN')}</div>
        </div>
        <div class="kpi-print-card" style="border-left: 4px solid #dc2626;">
          <span class="kpi-print-title">Total Operating Expenses</span>
          <div class="kpi-print-value" style="color: #dc2626;">₹${operatingExpenses.toLocaleString('en-IN')}</div>
        </div>
        <div class="kpi-print-card" style="border-left: 4px solid #2563eb;">
          <span class="kpi-print-title">Total Net Profits</span>
          <div class="kpi-print-value" style="color: #2563eb;">₹${netProfit.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <h3 class="section-subtitle">Current Active & Dispatched Cargo Shipments</h3>
      <table class="print-table">
        <thead>
          <tr>
            <th>Trip ID</th>
            <th>Outward Route Corridor</th>
            <th>Total Distance</th>
            <th>Shipment Status</th>
            <th>Est. Revenue</th>
            <th>Start Date</th>
          </tr>
        </thead>
        <tbody>
          ${appData.trips.slice(0, 5).map(t => `
            <tr>
              <td><strong>${t.id}</strong></td>
              <td>${t.source} &rarr; ${t.destination}</td>
              <td>${(t.distance || 0) + (t.returnDistance || 0)} KM</td>
              <td><span class="badge-print ${getBadgeClass(t.status)}">${t.status}</span></td>
              <td style="font-weight: 700;">₹${(t.revenue || 0).toLocaleString('en-IN')}</td>
              <td>${t.startDate || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h3 class="section-subtitle">Critical System Warnings & Alerts</h3>
      <div style="font-size: 11px; line-height: 1.5;">
        ${appData.trucks.filter(t => t.status === 'Maintenance').map(t => `
          <div style="padding: 8px; border-left: 4px solid #eab308; background-color: #fef9c3; margin-bottom: 8px; border-radius: 4px;">
            <strong>Maintenance Alert:</strong> Truck ${t.id} (${t.plate}) is currently out-of-service in the workshop.
          </div>
        `).join('')}
        ${appData.drivers.filter(d => isExpired(d.licenseExpiry)).map(d => `
          <div style="padding: 8px; border-left: 4px solid #ef4444; background-color: #fee2e2; margin-bottom: 8px; border-radius: 4px;">
            <strong>Expired Document:</strong> Operator ${d.name} (${d.id}) has an expired heavy commercial driving license (${d.licenseExpiry}). Immediate action required.
          </div>
        `).join('')}
        ${appData.trucks.filter(t => t.status === 'Idle').map(t => `
          <div style="padding: 8px; border-left: 4px solid #3b82f6; background-color: #eff6ff; margin-bottom: 8px; border-radius: 4px;">
            <strong>Resource Status:</strong> Vehicle ${t.id} (${t.plate}) is currently Idle at ${t.location} and ready for shipment routing.
          </div>
        `).join('')}
      </div>
    `;

  } else if (sectionId === 'fleet') {
    contentHtml = `
      <table class="print-table">
        <thead>
          <tr>
            <th>Truck ID</th>
            <th>Plate Number</th>
            <th>Model Details</th>
            <th>Fuel Type</th>
            <th>Capacity</th>
            <th>Assigned Driver</th>
            <th>Last Service Date</th>
            <th>Current Location</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${appData.trucks.map(t => {
            const drv = appData.drivers.find(d => d.id === t.driverId);
            return `
              <tr>
                <td><strong>${t.id}</strong></td>
                <td><strong>${t.plate}</strong></td>
                <td>${t.model}</td>
                <td><span style="font-weight:600; text-transform:uppercase;">${t.fuelType}</span></td>
                <td>${t.capacity} T</td>
                <td>${drv ? drv.name : 'Unassigned'}</td>
                <td>${t.lastService || 'N/A'}</td>
                <td>${t.location || 'N/A'}</td>
                <td><span class="badge-print ${getBadgeClass(t.status)}">${t.status}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

  } else if (sectionId === 'drivers') {
    contentHtml = `
      <table class="print-table">
        <thead>
          <tr>
            <th>Driver ID</th>
            <th>Operator Name</th>
            <th>Contact Phone</th>
            <th>License Number</th>
            <th>Expiry Date</th>
            <th>Trips Done</th>
            <th>Rating</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${appData.drivers.map(d => `
            <tr>
              <td><strong>${d.id}</strong></td>
              <td><strong>${d.name}</strong></td>
              <td>${d.phone}</td>
              <td>${d.license}</td>
              <td style="${isExpired(d.licenseExpiry) ? 'color: #ef4444; font-weight: bold;' : ''}">${d.licenseExpiry}</td>
              <td>${d.tripsCompleted || 0} Trips</td>
              <td style="font-weight:700; color:#eab308;">${d.rating ? d.rating + ' ★' : 'N/A'}</td>
              <td><span class="badge-print ${getBadgeClass(d.status)}">${d.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

  } else if (sectionId === 'trips') {
    contentHtml = `
      <table class="print-table">
        <thead>
          <tr>
            <th>Trip ID</th>
            <th>Outward Route Corridor</th>
            <th>Return Route Corridor</th>
            <th>Total Distance</th>
            <th>Toll Costs</th>
            <th>Assigned Truck</th>
            <th>Driver Name</th>
            <th>Revenue</th>
            <th>Expenses</th>
            <th>Net Profit</th>
            <th>Start / End Dates</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${appData.trips.map(t => {
            const trk = appData.trucks.find(tr => tr.id === t.truckId);
            const drv = appData.drivers.find(d => d.id === t.driverId);
            const totalDist = (t.distance || 0) + (t.returnDistance || 0);
            const totalTolls = (t.tollCost || 0) + (t.returnTollCost || 0);
            const profit = (t.revenue || 0) - (t.expense || 0);
            return `
              <tr>
                <td><strong>${t.id}</strong></td>
                <td>${t.source} &rarr; ${t.destination}</td>
                <td>${t.returnSource ? t.returnSource + ' &rarr; ' + t.returnDestination : 'N/A'}</td>
                <td>${totalDist} KM</td>
                <td>₹${totalTolls.toLocaleString('en-IN')}</td>
                <td>${trk ? trk.plate : 'N/A'}</td>
                <td>${drv ? drv.name : 'N/A'}</td>
                <td style="color: #16a34a; font-weight: bold;">₹${(t.revenue || 0).toLocaleString('en-IN')}</td>
                <td style="color: #dc2626;">₹${(t.expense || 0).toLocaleString('en-IN')}</td>
                <td style="color: ${profit >= 0 ? '#2563eb' : '#dc2626'}; font-weight: bold;">₹${profit.toLocaleString('en-IN')}</td>
                <td>${t.startDate} / ${t.endDate}</td>
                <td><span class="badge-print ${getBadgeClass(t.status)}">${t.status}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

  } else if (sectionId === 'maintenance') {
    contentHtml = `
      <table class="print-table">
        <thead>
          <tr>
            <th>Job ID</th>
            <th>Truck ID</th>
            <th>Plate Number</th>
            <th>Service Date</th>
            <th>Service Details / Repairs</th>
            <th>Workshop Expenditure</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${appData.maintenance.map(m => {
            const trk = appData.trucks.find(t => t.id === m.truckId);
            return `
              <tr>
                <td><strong>${m.id}</strong></td>
                <td><strong>${m.truckId}</strong></td>
                <td>${trk ? trk.plate : 'N/A'}</td>
                <td>${m.date}</td>
                <td>${m.type}</td>
                <td style="font-weight: 700; color: #b91c1c;">₹${(m.cost || 0).toLocaleString('en-IN')}</td>
                <td><span class="badge-print ${getBadgeClass(m.status)}">${m.status}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

  } else if (sectionId === 'fuel') {
    const totalLiters = appData.fuelLogs.reduce((sum, f) => sum + f.quantity, 0);
    const totalCost = appData.fuelLogs.reduce((sum, f) => sum + f.totalCost, 0);
    const avgPrice = totalLiters > 0 ? (totalCost / totalLiters) : 0;

    contentHtml = `
      <div class="kpi-print-grid" style="grid-template-columns: repeat(3, 1fr);">
        <div class="kpi-print-card">
          <span class="kpi-print-title">Total Fuel Used</span>
          <div class="kpi-print-value">${totalLiters.toFixed(1)} Liters</div>
        </div>
        <div class="kpi-print-card">
          <span class="kpi-print-title">Total Fuel Cost</span>
          <div class="kpi-print-value" style="color: #b91c1c;">₹${totalCost.toLocaleString('en-IN')}</div>
        </div>
        <div class="kpi-print-card">
          <span class="kpi-print-title">Avg Price / Liter</span>
          <div class="kpi-print-value">₹${avgPrice.toFixed(2)}</div>
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>Log ID</th>
            <th>Truck ID</th>
            <th>Plate Number</th>
            <th>Operator</th>
            <th>Refill Date</th>
            <th>Linked Trip</th>
            <th>Quantity (L)</th>
            <th>Price per Liter</th>
            <th>Total Cost</th>
            <th>Odometer (KM)</th>
            <th>Payment Method</th>
          </tr>
        </thead>
        <tbody>
          ${appData.fuelLogs.map(f => {
            const trk = appData.trucks.find(t => t.id === f.truckId);
            const drv = appData.drivers.find(d => d.id === f.driverId);
            return `
              <tr>
                <td><strong>${f.id}</strong></td>
                <td><strong>${f.truckId}</strong></td>
                <td>${trk ? trk.plate : 'N/A'}</td>
                <td>${drv ? drv.name : 'N/A'}</td>
                <td>${f.date}</td>
                <td>${f.tripId || 'N/A'}</td>
                <td>${f.quantity} L</td>
                <td>₹${f.pricePerLiter}/L</td>
                <td style="font-weight: 700; color: #b91c1c;">₹${(f.totalCost || 0).toLocaleString('en-IN')}</td>
                <td>${(f.odometer || 0).toLocaleString()} KM</td>
                <td>${f.paymentMethod}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

  } else if (sectionId === 'def') {
    const totalLiters = appData.defLogs.reduce((sum, f) => sum + f.quantity, 0);
    const totalCost = appData.defLogs.reduce((sum, f) => sum + f.totalCost, 0);
    const avgPrice = totalLiters > 0 ? (totalCost / totalLiters) : 0;

    contentHtml = `
      <div class="kpi-print-grid" style="grid-template-columns: repeat(3, 1fr);">
        <div class="kpi-print-card">
          <span class="kpi-print-title">Total DEF Used</span>
          <div class="kpi-print-value">${totalLiters.toFixed(1)} Liters</div>
        </div>
        <div class="kpi-print-card">
          <span class="kpi-print-title">Total DEF Cost</span>
          <div class="kpi-print-value" style="color: #b91c1c;">₹${totalCost.toLocaleString('en-IN')}</div>
        </div>
        <div class="kpi-print-card">
          <span class="kpi-print-title">Avg Price / Liter</span>
          <div class="kpi-print-value">₹${avgPrice.toFixed(2)}</div>
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>Log ID</th>
            <th>Truck ID</th>
            <th>Plate Number</th>
            <th>Operator</th>
            <th>Refill Date</th>
            <th>Linked Trip</th>
            <th>Quantity (L)</th>
            <th>Price per Liter</th>
            <th>Total Cost</th>
            <th>Odometer (KM)</th>
            <th>Payment Method</th>
          </tr>
        </thead>
        <tbody>
          ${appData.defLogs.map(d => {
            const trk = appData.trucks.find(t => t.id === d.truckId);
            const drv = appData.drivers.find(dr => dr.id === d.driverId);
            return `
              <tr>
                <td><strong>${d.id}</strong></td>
                <td><strong>${d.truckId}</strong></td>
                <td>${trk ? trk.plate : 'N/A'}</td>
                <td>${drv ? drv.name : 'N/A'}</td>
                <td>${d.date}</td>
                <td>${d.tripId || 'N/A'}</td>
                <td>${d.quantity} L</td>
                <td>₹${d.pricePerLiter}/L</td>
                <td style="font-weight: 700; color: #b91c1c;">₹${(d.totalCost || 0).toLocaleString('en-IN')}</td>
                <td>${(d.odometer || 0).toLocaleString()} KM</td>
                <td>${d.paymentMethod}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

  } else if (sectionId === 'accounts') {
    contentHtml = `
      <h3 class="section-subtitle">Financial Bank Accounts & Assets</h3>
      <table class="print-table" style="margin-bottom: 25px;">
        <thead>
          <tr>
            <th>Account Name</th>
            <th>Type</th>
            <th>Account details</th>
            <th>IFSC / Wallet ID</th>
            <th>Available Balance</th>
          </tr>
        </thead>
        <tbody>
          ${appData.financialAccounts.map(a => `
            <tr>
              <td><strong>${a.name}</strong></td>
              <td>${a.type}</td>
              <td>${a.accountNumber || 'N/A'}</td>
              <td>${a.ifscCode || 'N/A'}</td>
              <td style="font-weight: 700; color: ${a.balance >= 0 ? '#16a34a' : '#b91c1c'};">₹${a.balance.toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h3 class="section-subtitle">Recorded Transaction Ledger</h3>
      <table class="print-table">
        <thead>
          <tr>
            <th>Txn ID</th>
            <th>Date</th>
            <th>Type</th>
            <th>Category</th>
            <th>Payment Method</th>
            <th>Description</th>
            <th>Ref Link</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${appData.transactions.map(t => `
            <tr>
              <td><strong>${t.id}</strong></td>
              <td>${t.date}</td>
              <td><span class="badge-print ${getBadgeClass(t.type)}">${t.type}</span></td>
              <td><strong>${t.category}</strong></td>
              <td>${t.paymentMethod}</td>
              <td>${t.description}</td>
              <td>${t.referenceId || 'N/A'}</td>
              <td style="font-weight: 700; color: ${t.type === 'Income' ? '#16a34a' : '#b91c1c'};">₹${t.amount.toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  doc.innerHTML = style + headerHtml + contentHtml + `
    <div style="margin-top: 30px; border-top: 1px dashed #e5e7eb; padding-top: 10px; font-size: 9px; color: #9ca3af; text-align: center;">
      TransRoute Logistics Management Platform • Generated via Secure User Session. Page 1 of 1.
    </div>
  `;

  const opt = {
    margin:       10,
    filename:     `transroute_${sectionId}_report_${now.toISOString().split('T')[0]}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: orientation }
  };

  html2pdf().from(doc).set(opt).save();
}

window.exportSectionToPDF = exportSectionToPDF;

// -----------------------------------------------------------------------------
// CATEGORIES VIEW & CRUD OPERATIONS
// -----------------------------------------------------------------------------
function renderCategories() {
  renderCategoriesTable(appData.categories || []);
}
window.renderCategories = renderCategories;

function renderCategoriesTable(catList) {
  const tbody = document.getElementById("categories-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  if (!catList || catList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No categories found. Create a custom category above.</td></tr>`;
    return;
  }
  
  catList.forEach(cat => {
    let typeBadge = cat.type === 'Income' ? 'badge-success' : 'badge-danger';
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family: var(--font-header); font-weight:700; color: var(--color-cyan);">${cat.id}</td>
      <td><strong>${cat.name}</strong></td>
      <td><span class="badge ${typeBadge}">${cat.type}</span></td>
      <td>
        <div class="table-row-actions">
          <button class="btn btn-secondary btn-icon-only btn-edit" onclick="editCategory('${cat.id}')" title="Edit Category">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="btn btn-secondary btn-icon-only btn-delete" onclick="deleteCategory('${cat.id}')" title="Delete Category">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
window.renderCategoriesTable = renderCategoriesTable;

function editCategory(id) {
  const cat = appData.categories.find(c => c.id === id);
  if (!cat) return;
  
  document.getElementById("edit-category-id").value = cat.id;
  document.getElementById("edit-category-name").value = cat.name;
  document.getElementById("edit-category-type").value = cat.type;
  
  openModal('edit-category-modal');
}
window.editCategory = editCategory;

async function deleteCategory(id) {
  if (confirm(`Are you sure you want to delete category ${id}?`)) {
    const res = await apiRequest(`/api/categories/${id}`, 'DELETE');
    if (res) initApp();
  }
}
window.deleteCategory = deleteCategory;

