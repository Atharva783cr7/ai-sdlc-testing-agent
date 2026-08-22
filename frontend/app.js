// Configuration Presets for Testing Agent
const PRESETS = {
    "smart-building": {
        project_id: "smart-building-001",
        srs: {
            title: "Smart Building Ingestion SRS",
            version: "1.0.0",
            features: [
                "Real-time temperature telemetry collection",
                "HVAC automated threshold alerts",
                "State telemetry collector must be isolated as an independent microservice"
            ]
        },
        sdd: {
            architecture: "Event-driven architecture",
            components: [
                "Telemetry Collector",
                "Alert Notification Engine"
            ],
            interfaces: [
                "Ingestion REST API",
                "Alert Event Queue"
            ]
        },
        source_code: {
            repository: "github.com/org/smart-building",
            language: "Python",
            files: [
                "app/main.py",
                "app/services/telemetry.py",
                "app/services/alerts.py"
            ],
            changes: {
                changed_files: [
                    "app/services/telemetry.py"
                ],
                changed_functions: [
                    "parse_sensor_reading"
                ]
            }
        },
        api_docs: {
            base_url: "https://api.smartbuilding.com",
            endpoints: [
                "POST /telemetry",
                "GET /alerts"
            ]
        },
        database_schema: {
            dialect: "PostgreSQL",
            tables: [
                "telemetry",
                "alerts"
            ]
        },
        test_data: {
            fixtures: [
                "dummy_reading",
                "threshold_configs"
            ]
        },
        environment: {
            name: "staging"
        }
    },
    "auth-service": {
        project_id: "auth-service-002",
        srs: {
            title: "Identity Provider SRS",
            version: "2.1.0",
            features: [
                "OAuth2 Password grant authentication",
                "Multi-factor authentication (MFA) via TOTP",
                "Automatic token revocation on logout"
            ]
        },
        sdd: {
            architecture: "Monolithic layered architecture",
            components: [
                "Auth Controller",
                "Token Manager",
                "User Repository"
            ],
            interfaces: [
                "OAuth2 Token endpoint",
                "MFA Validator Service"
            ]
        },
        source_code: {
            repository: "github.com/org/auth-service",
            language: "Go",
            files: [
                "main.go",
                "token.go",
                "user.go",
                "mfa.go"
            ],
            changes: {
                changed_files: [
                    "token.go"
                ],
                changed_functions: [
                    "GenerateToken",
                    "RevokeToken"
                ]
            }
        },
        api_docs: {
            base_url: "https://auth.building.com",
            endpoints: [
                "POST /oauth/token",
                "POST /mfa/verify",
                "POST /logout"
            ]
        },
        database_schema: {
            dialect: "PostgreSQL",
            tables: [
                "users",
                "tokens",
                "mfa_devices"
            ]
        },
        test_data: {
            fixtures: [
                "mock_user_credentials",
                "expired_token"
            ]
        },
        environment: {
            name: "sandbox"
        }
    },
    "empty": {
        project_id: "",
        srs: {
            title: "",
            version: "",
            features: []
        },
        sdd: {
            architecture: "",
            components: [],
            interfaces: []
        },
        source_code: {
            repository: "",
            language: "",
            files: [],
            changes: {
                changed_files: [],
                changed_functions: []
            }
        },
        api_docs: {
            base_url: "",
            endpoints: []
        },
        database_schema: {
            dialect: "",
            tables: []
        },
        test_data: {
            fixtures: []
        },
        environment: {
            name: ""
        }
    }
};

// DOM Node Selectors
const presetSelect = document.getElementById('preset-select');
const tabVisual = document.getElementById('tab-visual');
const tabJson = document.getElementById('tab-json');
const visualForm = document.getElementById('visual-form');
const jsonEditorContainer = document.getElementById('json-editor-container');
const jsonTextarea = document.getElementById('json-textarea');
const jsonSyntaxError = document.getElementById('json-syntax-error');
const jsonErrorText = document.getElementById('json-error-text');
const btnStartTesting = document.getElementById('btn-start-testing');
const serverStatusBadge = document.getElementById('server-status');

// Optional sections checkboxes & containers
const toggleApi = document.getElementById('toggle-api');
const toggleDb = document.getElementById('toggle-db');
const toggleEnv = document.getElementById('toggle-env');
const apiCard = document.getElementById('api-card');
const dbCard = document.getElementById('db-card');
const envCard = document.getElementById('env-card');

// Dynamic Row Containers
const srsFeaturesContainer = document.getElementById('srs-features-container');
const sddComponentsContainer = document.getElementById('sdd-components-container');
const codeFilesContainer = document.getElementById('code-files-container');
const changedFilesContainer = document.getElementById('changed-files-container');
const changedFunctionsContainer = document.getElementById('changed-functions-container');
const apiEndpointsContainer = document.getElementById('api-endpoints-container');
const dbTablesContainer = document.getElementById('db-tables-container');

// Results & Empty States
const resultsEmptyState = document.getElementById('results-empty-state');
const resultsLoadingState = document.getElementById('results-loading-state');
const loadingNodeStatus = document.getElementById('loading-node-status');
const resultsContent = document.getElementById('results-content');
const runStatusBadge = document.getElementById('run-status-badge');
const validationErrorsAlert = document.getElementById('validation-errors-alert');
const validationErrorsList = document.getElementById('validation-errors-list');

// Phase 3 Status Card (Release Readiness is future Phase 7)
const gateReadinessVal = document.getElementById('gate-readiness-val');
const gateReadinessLabel = document.getElementById('gate-readiness-label');
const gateTestCases = document.getElementById('gate-test-cases');
const gateTestScenarios = document.getElementById('gate-test-scenarios');
const gateTestData = document.getElementById('gate-test-data');
const gateStatusIndicator = document.getElementById('gate-status-indicator');

// Navigation Tabs in Intelligence Panel
const resultsNavBtns = document.querySelectorAll('.results-nav-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Dynamic Row input tracking state
let activeEditorTab = 'visual';

// Main Application Inits
document.addEventListener('DOMContentLoaded', () => {
    // Render Lucide icons
    lucide.createIcons();

    // Check backend server status immediately and poll every 4s
    pollBackendStatus();
    setInterval(pollBackendStatus, 4000);

    // Wire Presets selection
    presetSelect.addEventListener('change', (e) => {
        loadPresetTemplate(e.target.value);
    });

    // Wire editor view switcher
    tabVisual.addEventListener('click', () => setEditorViewMode('visual'));
    tabJson.addEventListener('click', () => setEditorViewMode('json'));

    // Wire optional checkboxes
    toggleApi.addEventListener('change', () => apiCard.classList.toggle('hidden', !toggleApi.checked));
    toggleDb.addEventListener('change', () => dbCard.classList.toggle('hidden', !toggleDb.checked));
    toggleEnv.addEventListener('change', () => envCard.classList.toggle('hidden', !toggleEnv.checked));

    // Dynamic row buttons
    document.getElementById('btn-add-srs-feature').addEventListener('click', () => createDynamicRowInput(srsFeaturesContainer, ''));
    document.getElementById('btn-add-sdd-component').addEventListener('click', () => createDynamicRowInput(sddComponentsContainer, ''));
    document.getElementById('btn-add-code-file').addEventListener('click', () => createDynamicRowInput(codeFilesContainer, ''));
    document.getElementById('btn-add-changed-file').addEventListener('click', () => createDynamicRowInput(changedFilesContainer, ''));
    document.getElementById('btn-add-changed-function').addEventListener('click', () => createDynamicRowInput(changedFunctionsContainer, ''));
    document.getElementById('btn-add-api-endpoint').addEventListener('click', () => createDynamicRowInput(apiEndpointsContainer, ''));
    document.getElementById('btn-add-db-table').addEventListener('click', () => createDynamicRowInput(dbTablesContainer, ''));

    // Wire tab page panels
    resultsNavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            activateResultsTab(btn.getAttribute('data-target'));
        });
    });

    // Phase 3: Sidebar "Test Execution" link jumps to the Test Cases panel
    const navTestExecution = document.getElementById('nav-test-execution');
    if (navTestExecution) {
        navTestExecution.addEventListener('click', (e) => {
            e.preventDefault();
            if (resultsContent.classList.contains('hidden')) return;
            activateResultsTab('panel-test-cases');
        });
    }

    // Phase 3: Test case filter dropdowns
    document.getElementById('filter-test-type').addEventListener('change', applyTestCaseFilters);
    document.getElementById('filter-priority').addEventListener('change', applyTestCaseFilters);
    document.getElementById('filter-category').addEventListener('change', applyTestCaseFilters);

    // START TESTING Action
    btnStartTesting.addEventListener('click', triggerStartTestingWorkflow);

    // Load Default Preset configuration
    loadPresetTemplate('smart-building');
});

// Dynamic Inputs row adder helper
function createDynamicRowInput(container, value) {
    const row = document.createElement('div');
    row.className = 'dynamic-item';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.placeholder = getRowPlaceholderText(container.id);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.innerHTML = '<i data-lucide="x"></i>';
    deleteBtn.style.padding = '8px';

    row.appendChild(input);
    row.appendChild(deleteBtn);
    container.appendChild(row);

    deleteBtn.addEventListener('click', () => {
        row.remove();
    });

    lucide.createIcons({attrs: {"data-lucide": true}});
}

function getRowPlaceholderText(containerId) {
    switch (containerId) {
        case 'srs-features-container': return 'Testable feature definition...';
        case 'sdd-components-container': return 'System component name...';
        case 'code-files-container': return 'File path in repo...';
        case 'changed-files-container': return 'Modified file path...';
        case 'changed-functions-container': return 'Modified function name...';
        case 'api-endpoints-container': return 'METHOD /path';
        case 'db-tables-container': return 'Table name';
        default: return 'Input item description...';
    }
}

// Check Backend connection status
async function pollBackendStatus() {
    try {
        const res = await fetch('http://127.0.0.1:8085/');
        if (res.ok) {
            const data = await res.json();
            if (data.status === 'healthy') {
                updateConnectionIndicator(true, 'Backend Connected');
                return;
            }
        }
        updateConnectionIndicator(false, 'Backend Offline');
    } catch (e) {
        updateConnectionIndicator(false, 'Connection Failed');
    }
}

function updateConnectionIndicator(online, text) {
    serverStatusBadge.className = `status-indicator ${online ? 'online' : 'offline'}`;
    serverStatusBadge.querySelector('.status-label').textContent = text;
}

// Load presets
function loadPresetTemplate(key) {
    const template = PRESETS[key];
    if (!template) return;

    visualForm.reset();
    
    // Core parameters mapping
    document.getElementById('project-id').value = template.project_id || '';
    document.getElementById('srs-title').value = template.srs.title || '';
    document.getElementById('srs-version').value = template.srs.version || '';
    document.getElementById('sdd-architecture').value = template.sdd.architecture || '';
    document.getElementById('code-repository').value = template.source_code.repository || '';
    document.getElementById('code-language').value = template.source_code.language || '';

    // Clear dynamic row items
    srsFeaturesContainer.innerHTML = '';
    sddComponentsContainer.innerHTML = '';
    codeFilesContainer.innerHTML = '';
    changedFilesContainer.innerHTML = '';
    changedFunctionsContainer.innerHTML = '';
    apiEndpointsContainer.innerHTML = '';
    dbTablesContainer.innerHTML = '';

    // Re-fill lists
    template.srs.features.forEach(feat => createDynamicRowInput(srsFeaturesContainer, feat));
    template.sdd.components.forEach(comp => createDynamicRowInput(sddComponentsContainer, comp));
    template.source_code.files.forEach(file => createDynamicRowInput(codeFilesContainer, file));

    if (template.source_code.changes) {
        template.source_code.changes.changed_files.forEach(file => createDynamicRowInput(changedFilesContainer, file));
        template.source_code.changes.changed_functions.forEach(func => createDynamicRowInput(changedFunctionsContainer, func));
    }

    // Optional config details
    if (template.api_docs && template.api_docs.base_url) {
        toggleApi.checked = true;
        apiCard.classList.remove('hidden');
        document.getElementById('api-base-url').value = template.api_docs.base_url;
        template.api_docs.endpoints.forEach(ep => createDynamicRowInput(apiEndpointsContainer, ep));
    } else {
        toggleApi.checked = false;
        apiCard.classList.add('hidden');
        document.getElementById('api-base-url').value = '';
    }

    if (template.database_schema && template.database_schema.dialect) {
        toggleDb.checked = true;
        dbCard.classList.remove('hidden');
        document.getElementById('db-dialect').value = template.database_schema.dialect;
        template.database_schema.tables.forEach(t => createDynamicRowInput(dbTablesContainer, t));
    } else {
        toggleDb.checked = false;
        dbCard.classList.add('hidden');
        document.getElementById('db-dialect').value = '';
    }

    if (template.environment && template.environment.name) {
        toggleEnv.checked = true;
        envCard.classList.remove('hidden');
        document.getElementById('env-name').value = template.environment.name;
    } else {
        toggleEnv.checked = false;
        envCard.classList.add('hidden');
        document.getElementById('env-name').value = '';
    }

    // Write formatted string in code editor tab
    jsonTextarea.value = JSON.stringify(template, null, 2);
    resetReadinessDashboard();
}

function resetReadinessDashboard() {
    gateReadinessVal.textContent = '--';
    gateReadinessLabel.textContent = 'PENDING RUN';
    gateTestCases.textContent = '--';
    gateTestScenarios.textContent = '--';
    gateTestData.textContent = '--';
    gateStatusIndicator.className = 'gate-status';
    gateStatusIndicator.querySelector('.status-text').textContent = 'WAITING ANALYSIS';
}

// Compile payload from visual inputs
function compilePayloadFromVisuals() {
    const srsFeatures = Array.from(srsFeaturesContainer.querySelectorAll('input')).map(i => i.value).filter(v => v.trim() !== '');
    const sddComponents = Array.from(sddComponentsContainer.querySelectorAll('input')).map(i => i.value).filter(v => v.trim() !== '');
    const codeFiles = Array.from(codeFilesContainer.querySelectorAll('input')).map(i => i.value).filter(v => v.trim() !== '');
    const changedFiles = Array.from(changedFilesContainer.querySelectorAll('input')).map(i => i.value).filter(v => v.trim() !== '');
    const changedFunctions = Array.from(changedFunctionsContainer.querySelectorAll('input')).map(i => i.value).filter(v => v.trim() !== '');

    const data = {
        project_id: document.getElementById('project-id').value,
        srs: {
            title: document.getElementById('srs-title').value,
            version: document.getElementById('srs-version').value,
            features: srsFeatures
        },
        sdd: {
            architecture: document.getElementById('sdd-architecture').value,
            components: sddComponents
        },
        source_code: {
            repository: document.getElementById('code-repository').value,
            language: document.getElementById('code-language').value,
            files: codeFiles,
            changes: {
                changed_files: changedFiles,
                changed_functions: changedFunctions
            }
        }
    };

    if (toggleApi.checked) {
        const endpoints = Array.from(apiEndpointsContainer.querySelectorAll('input')).map(i => i.value).filter(v => v.trim() !== '');
        data.api_docs = {
            base_url: document.getElementById('api-base-url').value,
            endpoints: endpoints
        };
    } else {
        data.api_docs = null;
    }

    if (toggleDb.checked) {
        const tables = Array.from(dbTablesContainer.querySelectorAll('input')).map(i => i.value).filter(v => v.trim() !== '');
        data.database_schema = {
            dialect: document.getElementById('db-dialect').value,
            tables: tables
        };
    } else {
        data.database_schema = null;
    }

    if (toggleEnv.checked) {
        data.environment = {
            name: document.getElementById('env-name').value
        };
    } else {
        data.environment = null;
    }

    return data;
}

// Map payload object to visual form
function applyPayloadToVisualInputs(data) {
    if (!data) return;

    document.getElementById('project-id').value = data.project_id || '';
    
    if (data.srs) {
        document.getElementById('srs-title').value = data.srs.title || '';
        document.getElementById('srs-version').value = data.srs.version || '';
        srsFeaturesContainer.innerHTML = '';
        if (Array.isArray(data.srs.features)) {
            data.srs.features.forEach(feat => createDynamicRowInput(srsFeaturesContainer, feat));
        }
    }

    if (data.sdd) {
        document.getElementById('sdd-architecture').value = data.sdd.architecture || '';
        sddComponentsContainer.innerHTML = '';
        if (Array.isArray(data.sdd.components)) {
            data.sdd.components.forEach(comp => createDynamicRowInput(sddComponentsContainer, comp));
        }
    }

    if (data.source_code) {
        document.getElementById('code-repository').value = data.source_code.repository || '';
        document.getElementById('code-language').value = data.source_code.language || '';
        
        codeFilesContainer.innerHTML = '';
        if (Array.isArray(data.source_code.files)) {
            data.source_code.files.forEach(f => createDynamicRowInput(codeFilesContainer, f));
        }

        changedFilesContainer.innerHTML = '';
        changedFunctionsContainer.innerHTML = '';
        if (data.source_code.changes) {
            if (Array.isArray(data.source_code.changes.changed_files)) {
                data.source_code.changes.changed_files.forEach(f => createDynamicRowInput(changedFilesContainer, f));
            }
            if (Array.isArray(data.source_code.changes.changed_functions)) {
                data.source_code.changes.changed_functions.forEach(fn => createDynamicRowInput(changedFunctionsContainer, fn));
            }
        }
    }

    if (data.api_docs) {
        toggleApi.checked = true;
        apiCard.classList.remove('hidden');
        document.getElementById('api-base-url').value = data.api_docs.base_url || '';
        apiEndpointsContainer.innerHTML = '';
        if (Array.isArray(data.api_docs.endpoints)) {
            data.api_docs.endpoints.forEach(ep => createDynamicRowInput(apiEndpointsContainer, ep));
        }
    } else {
        toggleApi.checked = false;
        apiCard.classList.add('hidden');
        document.getElementById('api-base-url').value = '';
    }

    if (data.database_schema) {
        toggleDb.checked = true;
        dbCard.classList.remove('hidden');
        document.getElementById('db-dialect').value = data.database_schema.dialect || '';
        dbTablesContainer.innerHTML = '';
        if (Array.isArray(data.database_schema.tables)) {
            data.database_schema.tables.forEach(t => createDynamicRowInput(dbTablesContainer, t));
        }
    } else {
        toggleDb.checked = false;
        dbCard.classList.add('hidden');
        document.getElementById('db-dialect').value = '';
    }

    if (data.environment) {
        toggleEnv.checked = true;
        envCard.classList.remove('hidden');
        document.getElementById('env-name').value = data.environment.name || '';
    } else {
        toggleEnv.checked = false;
        envCard.classList.add('hidden');
        document.getElementById('env-name').value = '';
    }
}

// Switch between visual and json editors
function setEditorViewMode(mode) {
    if (mode === activeEditorTab) return;

    if (mode === 'json') {
        const payload = compilePayloadFromVisuals();
        jsonTextarea.value = JSON.stringify(payload, null, 2);
        
        tabVisual.classList.remove('active');
        tabJson.classList.add('active');
        visualForm.classList.add('hidden');
        jsonEditorContainer.classList.remove('hidden');
        jsonSyntaxError.classList.add('hidden');
        activeEditorTab = 'json';
    } else {
        const text = jsonTextarea.value;
        try {
            const data = JSON.parse(text);
            applyPayloadToVisualInputs(data);
            
            tabJson.classList.remove('active');
            tabVisual.classList.add('active');
            jsonEditorContainer.classList.add('hidden');
            visualForm.classList.remove('hidden');
            jsonSyntaxError.classList.add('hidden');
            activeEditorTab = 'visual';
        } catch (e) {
            jsonSyntaxError.classList.remove('hidden');
            jsonErrorText.textContent = `JSON Error: ${e.message}. Fix issues before exiting tab.`;
        }
    }
}

// Clear workflow nodes and arrows layout classes
function resetPipelineVisualizer() {
    const nodes = ['input', 'context', 'requirements', 'risk', 'impact', 'coverage', 'strategy', 'tests'];
    nodes.forEach(node => {
        const el = document.getElementById(`node-${node}`);
        if (el) el.className = 'pipeline-node';
    });

    for(let i=1; i<=9; i++) {
        const arrow = document.getElementById(`arrow-${i}`);
        if (arrow) arrow.className = 'pipeline-arrow';
    }

    // Quality Gate remains a future node
    const qualityGate = document.getElementById('node-quality_gate');
    if (qualityGate) qualityGate.className = 'pipeline-node future-node';

    // Reports node remains future
    const reportsNode = document.getElementById('node-reports');
    if (reportsNode) reportsNode.className = 'pipeline-node future-node';
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// Shared cached Phase 3 test cases for filter re-rendering
let cachedPhase3TestCases = [];

// Activate a results tab by target id (canonical implementation)
function activateResultsTab(targetId) {
    document.querySelectorAll('.results-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === targetId);
    });

    document.querySelectorAll('.tab-content').forEach(panel => {
        panel.classList.toggle('active', panel.id === targetId);
    });

    if (window.lucide) {
        lucide.createIcons();
    }
}

// Pipeline visual transition logic
async function runVisualPipelineProgression(validationPassed) {
    resetPipelineVisualizer();

    const nodes = [
        { id: 'input', label: 'INPUT', arrow: null },
        { id: 'context', label: 'CONTEXT', arrow: 1 },
        { id: 'requirements', label: 'REQUIREMENTS', arrow: 2 },
        { id: 'risk', label: 'RISK', arrow: 3 },
        { id: 'impact', label: 'IMPACT', arrow: 4 },
        { id: 'coverage', label: 'COVERAGE', arrow: 5 },
        { id: 'strategy', label: 'STRATEGY', arrow: 6 },
        { id: 'tests', label: 'TESTS', arrow: 7 }
    ];

    // Node 1: INPUT
    const n1 = document.getElementById(`node-${nodes[0].id}`);
    n1.className = 'pipeline-node running';
    loadingNodeStatus.textContent = `Executing node: ${nodes[0].label}...`;
    await delay(400);

    if (!validationPassed) {
        n1.className = 'pipeline-node failed';
        loadingNodeStatus.textContent = 'Execution halted: Input parameters validation failed.';
        return false;
    }

    n1.className = 'pipeline-node completed';

    // Loop rest of nodes
    for (let i = 1; i < nodes.length; i++) {
        const node = nodes[i];
        
        const arrow = document.getElementById(`arrow-${node.arrow}`);
        if (arrow) arrow.className = 'pipeline-arrow active';

        const el = document.getElementById(`node-${node.id}`);
        if (el) el.className = 'pipeline-node running';
        loadingNodeStatus.textContent = `Executing node: ${node.label}...`;
        await delay(350);

        if (arrow) arrow.className = 'pipeline-arrow completed';
        if (el) el.className = 'pipeline-node completed';
    }

    loadingNodeStatus.textContent = 'Workflow pipeline successfully analyzed. Updating report metrics...';
    await delay(200);
    return true;
}

// Trigger start analysis
async function triggerStartTestingWorkflow() {
    let payload;

    if (activeEditorTab === 'visual') {
        payload = compilePayloadFromVisuals();
    } else {
        try {
            payload = JSON.parse(jsonTextarea.value);
            jsonSyntaxError.classList.add('hidden');
        } catch (e) {
            jsonSyntaxError.classList.remove('hidden');
            jsonErrorText.textContent = `JSON Error: ${e.message}. Resolve issues before starting.`;
            return;
        }
    }

    // Toggle dashboards visibility elements
    resultsEmptyState.classList.add('hidden');
    resultsContent.classList.add('hidden');
    validationErrorsAlert.classList.add('hidden');
    resultsLoadingState.classList.remove('hidden');
    
    btnStartTesting.disabled = true;
    btnStartTesting.innerHTML = '<i class="command-spinner" style="width:14px;height:14px;margin:0;"></i> PROCESSING...';
    
    resetPipelineVisualizer();
    resetReadinessDashboard();
    
    runStatusBadge.className = 'badge';
    runStatusBadge.textContent = 'PROCESSING';

    try {
        const res = await fetch('http://127.0.0.1:8085/testing/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Server error status: ${res.status}`);
        }

        const data = await res.json();
        
        // Run simulated pipeline progression
        const passed = (data.validation_status === 'passed');
        const animated = await runVisualPipelineProgression(passed);

        if (passed && animated) {
            // Draw intelligence reports details
            fillQualityIntelligenceReports(data);
            
            resultsLoadingState.classList.add('hidden');
            resultsContent.classList.remove('hidden');
            runStatusBadge.className = 'badge badge-success';
            runStatusBadge.textContent = 'COMPLETED';
            
            // Fetch and render Phase 4 execution results
            try {
                await fetchAndRenderExecutionResults(payload);
            } catch (e) {
                console.error('Phase 4 fetch/render error', e);
            }
        } else {
            // Show validation failure reports
            resultsLoadingState.classList.add('hidden');
            validationErrorsAlert.classList.remove('hidden');
            validationErrorsList.innerHTML = '';
            
            data.validation_errors.forEach(err => {
                const li = document.createElement('li');
                li.textContent = err;
                validationErrorsList.appendChild(li);
            });

            runStatusBadge.className = 'badge badge-danger';
            runStatusBadge.textContent = 'FAILED';

            // Show Phase 3 status as blocked (validation failed)
            gateReadinessVal.textContent = 'PHASE 3';
            gateReadinessLabel.textContent = 'VALIDATION FAILED';
            gateTestCases.textContent = '--';
            gateTestScenarios.textContent = '--';
            gateTestData.textContent = '--';
            gateStatusIndicator.className = 'gate-status blocked-review';
            gateStatusIndicator.querySelector('.status-text').textContent = 'INPUT ERRORS';
        }

    } catch (e) {
        console.error(e);
        resultsLoadingState.classList.add('hidden');
        validationErrorsAlert.classList.remove('hidden');
        validationErrorsList.innerHTML = `<li>Execution Error: ${e.message}. Double-check that backend is active on port 8085.</li>`;
        
        // Mark running nodes as failed
        document.querySelectorAll('.pipeline-container .pipeline-node').forEach(node => {
            if (node.classList.contains('running')) {
                node.className = 'pipeline-node failed';
            }
        });

        runStatusBadge.className = 'badge badge-danger';
        runStatusBadge.textContent = 'ERROR';
        
        // Show gate blocked
        gateReadinessVal.textContent = 'N/A';
        gateReadinessLabel.textContent = 'SYSTEM ERROR';
        gateStatusIndicator.className = 'gate-status blocked-review';
        gateStatusIndicator.querySelector('.status-text').textContent = 'CRITICAL FAILURE';
    } finally {
        btnStartTesting.disabled = false;
        btnStartTesting.innerHTML = '<i data-lucide="play"></i> START TESTING';
        lucide.createIcons();
    }
}

// Populate quality report metrics and tabs
function fillQualityIntelligenceReports(data) {
    const report = data.intelligence;
    if (!report) return;

    // A. Phase 3 Status Card — populated from real test_design data.
    // Release Readiness / Quality Gate is a future Phase 7 feature and is NOT fabricated here.
    const design = data.test_design;
    if (design) {
        const tcCount = (design.test_cases || []).length;
        const scnCount = (design.test_scenarios || []).length;
        const tdCount = (design.generated_test_data || []).length;

        gateReadinessVal.textContent = 'PHASE 3';
        gateReadinessLabel.textContent = 'TEST DESIGN COMPLETE';
        gateTestCases.textContent = tcCount;
        gateTestScenarios.textContent = scnCount;
        gateTestData.textContent = tdCount;

        gateStatusIndicator.className = 'gate-status ready-for-review';
        gateStatusIndicator.querySelector('.status-text').textContent = 'READY FOR EXECUTION';
    }

    // B. Populate Tab panels data

    // 1. Requirements Tab
    const reqsList = document.getElementById('requirements-list');
    reqsList.innerHTML = '';

    // Render Tab Header Summary Card
    const reqsCount = report.requirements ? report.requirements.length : 0;
    const reqsFuncCount = report.requirements ? report.requirements.filter(r => r.category.toLowerCase().includes('func')).length : 0;
    const reqsSddCount = report.requirements ? report.requirements.filter(r => r.source === 'sdd').length : 0;

    const reqSummaryCard = document.createElement('div');
    reqSummaryCard.className = 'report-card';
    reqSummaryCard.style.borderColor = 'var(--cyan)';
    reqSummaryCard.innerHTML = `
        <div class="report-card-header">
            <span class="report-card-id id-req">SUMMARY METRICS</span>
            <span class="inline-tag tag-cyan-border">TRACEABILITY</span>
        </div>
        <div style="padding: 10px 0; text-align: center;">
            <h2 style="font-size: 28px; font-weight: 800; color: var(--cyan); line-height: 1;">${reqsCount}</h2>
            <span class="card-desc" style="font-size:10px; text-transform:uppercase; color:var(--text-secondary);">Testable Requirements Extracted</span>
        </div>
        <div class="badge-group" style="justify-content:center; gap:12px;">
            <span class="inline-tag">${reqsFuncCount} Functional</span>
            <span class="inline-tag">${reqsSddCount} Design (SDD)</span>
        </div>
    `;
    reqsList.appendChild(reqSummaryCard);

    if (Array.isArray(report.requirements) && report.requirements.length > 0) {
        report.requirements.forEach(req => {
            const card = document.createElement('div');
            card.className = 'report-card';

            const header = document.createElement('div');
            header.className = 'report-card-header';

            const id = document.createElement('span');
            id.className = 'report-card-id id-req';
            id.textContent = req.id;

            const badgeGroup = document.createElement('div');
            badgeGroup.className = 'badge-group';

            const category = document.createElement('span');
            category.className = 'inline-tag tag-cyan-border';
            category.textContent = req.category;

            const source = document.createElement('span');
            source.className = 'inline-tag tag-mint-border';
            source.textContent = req.source;

            badgeGroup.appendChild(category);
            badgeGroup.appendChild(source);
            header.appendChild(id);
            header.appendChild(badgeGroup);

            const desc = document.createElement('p');
            desc.className = 'card-desc';
            desc.textContent = req.description;

            card.appendChild(header);
            card.appendChild(desc);
            reqsList.appendChild(card);
        });
    }

    // 2. Risks Tab
    const risksList = document.getElementById('risks-list');
    risksList.innerHTML = '';

    // Render Tab Header Summary Card
    const totalRisks = report.risks ? report.risks.length : 0;
    const highSevRisks = report.risks ? report.risks.filter(r => r.severity === 'High').length : 0;
    const lowSevRisks = report.risks ? report.risks.filter(r => r.severity === 'Low').length : 0;

    const riskSummaryCard = document.createElement('div');
    riskSummaryCard.className = 'report-card';
    riskSummaryCard.style.borderColor = 'var(--amber)';
    riskSummaryCard.innerHTML = `
        <div class="report-card-header">
            <span class="report-card-id id-risk" style="color:var(--amber); background-color:rgba(245,158,11,0.08)">AUDIT METRICS</span>
            <span class="inline-tag tag-amber-border">FAILURE PATHS</span>
        </div>
        <div style="padding: 10px 0; text-align: center;">
            <h2 style="font-size: 28px; font-weight: 800; color: var(--amber); line-height: 1;">${totalRisks}</h2>
            <span class="card-desc" style="font-size:10px; text-transform:uppercase; color:var(--text-secondary);">Identified Software Risks</span>
        </div>
        <div class="badge-group" style="justify-content:center; gap:12px;">
            <span class="inline-tag text-danger" style="border-color:rgba(251,113,133,0.3)">${highSevRisks} Critical/High</span>
            <span class="inline-tag">${totalRisks - highSevRisks} Med/Low</span>
        </div>
    `;
    risksList.appendChild(riskSummaryCard);

    if (Array.isArray(report.risks) && report.risks.length > 0) {
        report.risks.forEach(risk => {
            const card = document.createElement('div');
            card.className = 'report-card';
            card.style.borderColor = 'rgba(245, 158, 11, 0.2)'; // amber tint

            const header = document.createElement('div');
            header.className = 'report-card-header';

            const leftGroup = document.createElement('div');
            leftGroup.style.display = 'flex';
            leftGroup.style.alignItems = 'center';
            leftGroup.style.gap = '8px';

            const id = document.createElement('span');
            id.className = 'report-card-id id-risk';
            id.textContent = risk.risk_id;

            const mapLink = document.createElement('span');
            mapLink.style.fontSize = '10px';
            mapLink.style.fontFamily = 'var(--font-mono)';
            mapLink.style.color = 'var(--text-secondary)';
            mapLink.innerHTML = risk.requirement_id ? `Linked: <strong style="color:var(--cyan);">${risk.requirement_id}</strong>` : 'General Risk';

            leftGroup.appendChild(id);
            leftGroup.appendChild(mapLink);

            const badges = document.createElement('div');
            badges.className = 'badge-group';

            const sev = document.createElement('span');
            sev.className = `inline-tag ${risk.severity === 'High' ? 'text-danger' : 'tag-amber-border'}`;
            sev.textContent = `Sev: ${risk.severity}`;

            const likelihood = document.createElement('span');
            likelihood.className = 'inline-tag';
            likelihood.textContent = `Like: ${risk.likelihood}`;

            badges.appendChild(sev);
            badges.appendChild(likelihood);
            header.appendChild(leftGroup);
            header.appendChild(badges);

            const desc = document.createElement('p');
            desc.className = 'card-desc';
            desc.textContent = risk.description;

            const mit = document.createElement('div');
            mit.className = 'card-mitigation-box';
            mit.innerHTML = `<strong>Mitigation Blueprint:</strong> ${risk.mitigation}`;

            card.appendChild(header);
            card.appendChild(desc);
            card.appendChild(mit);
            risksList.appendChild(card);
        });
    }

    // 3. Change Impact Tab
    const impact = report.change_impact;
    const msgEl = document.getElementById('impact-message');
    const riskBadge = document.getElementById('regression-risk-level-badge');
    const filesList = document.getElementById('impact-changed-files');
    const functionsList = document.getElementById('impact-changed-functions');
    const reqTags = document.getElementById('impact-affected-reqs-tags');

    if (impact) {
        msgEl.textContent = impact.message;
        
        const riskLevel = impact.regression_risk || 'None';
        riskBadge.textContent = riskLevel;
        
        // Remove old classes
        riskBadge.className = '';
        if (riskLevel === 'High') {
            riskBadge.classList.add('risk-high');
        } else if (riskLevel === 'Medium') {
            riskBadge.classList.add('risk-medium');
        } else if (riskLevel === 'Low') {
            riskBadge.classList.add('risk-low');
        } else {
            riskBadge.classList.add('risk-none');
        }

        filesList.innerHTML = '';
        if (Array.isArray(impact.changed_files) && impact.changed_files.length > 0) {
            impact.changed_files.forEach(f => {
                const li = document.createElement('li');
                li.textContent = f;
                filesList.appendChild(li);
            });
        } else {
            filesList.innerHTML = '<li>No files modified</li>';
        }

        functionsList.innerHTML = '';
        if (Array.isArray(impact.changed_functions) && impact.changed_functions.length > 0) {
            impact.changed_functions.forEach(fn => {
                const li = document.createElement('li');
                li.textContent = fn;
                functionsList.appendChild(li);
            });
        } else {
            functionsList.innerHTML = '<li>No functions scoped</li>';
        }

        reqTags.innerHTML = '';
        if (Array.isArray(impact.impacted_requirements) && impact.impacted_requirements.length > 0) {
            impact.impacted_requirements.forEach(reqId => {
                const tag = document.createElement('span');
                tag.className = 'inline-tag tag-cyan-border text-mono';
                tag.textContent = reqId;
                reqTags.appendChild(tag);
            });
        } else {
            reqTags.innerHTML = '<span style="font-size:11px; color:var(--text-muted)">None affected</span>';
        }
    } else {
        msgEl.textContent = 'No active repository code delta changes details provided.';
        riskBadge.textContent = 'NONE';
        riskBadge.className = 'risk-none';
        filesList.innerHTML = '<li>N/A</li>';
        functionsList.innerHTML = '<li>N/A</li>';
        reqTags.innerHTML = '<span style="font-size:11px; color:var(--text-muted)">N/A</span>';
    }

    // 4. Strategy Tab
    const strategy = report.test_strategy;
    const unitList = document.getElementById('strategy-unit-tests');
    const intList = document.getElementById('strategy-integration-tests');
    const apiList = document.getElementById('strategy-api-tests');
    const toolsTags = document.getElementById('strategy-tools');
    const envTags = document.getElementById('strategy-envs');

    if (strategy) {
        unitList.innerHTML = '';
        if (Array.isArray(strategy.unit_tests)) {
            strategy.unit_tests.forEach(test => {
                const li = document.createElement('li');
                li.textContent = test;
                unitList.appendChild(li);
            });
        }

        intList.innerHTML = '';
        if (Array.isArray(strategy.integration_tests)) {
            strategy.integration_tests.forEach(test => {
                const li = document.createElement('li');
                li.textContent = test;
                intList.appendChild(li);
            });
        }

        apiList.innerHTML = '';
        if (Array.isArray(strategy.api_tests)) {
            strategy.api_tests.forEach(test => {
                const li = document.createElement('li');
                li.textContent = test;
                apiList.appendChild(li);
            });
        }

        toolsTags.innerHTML = '';
        if (Array.isArray(strategy.tools)) {
            strategy.tools.forEach(t => {
                const tag = document.createElement('span');
                tag.className = 'inline-tag tag-cyan-border';
                tag.textContent = t;
                toolsTags.appendChild(tag);
            });
        }

        envTags.innerHTML = '';
        if (Array.isArray(strategy.environments)) {
            strategy.environments.forEach(e => {
                const tag = document.createElement('span');
                tag.className = 'inline-tag tag-mint-border';
                tag.textContent = e;
                envTags.appendChild(tag);
            });
        }
    }

    // 5. Phase 3 Test Design Reports
    fillPhase3DesignReports(data);
}

/**
 * Phase 3: Populate Test Cases, Scenarios, Test Data, and Traceability panels
 * from the backend `test_design` response container.
 */
function fillPhase3DesignReports(data) {
    const design = data.test_design;
    if (!design) return;

    renderTestCasesPanel(design.test_cases || []);
    renderScenariosPanel(design.test_scenarios || []);
    renderTestDataPanel(design.generated_test_data || []);
    renderTraceabilityPanel(design.traceability, design.warnings || []);
}

/* ---- TEST CASES PANEL ---- */

function renderTestCasesPanel(testCases) {
    cachedPhase3TestCases = testCases || [];

    // Summary metrics
    const types = new Set(cachedPhase3TestCases.map(c => c.test_type).filter(Boolean));
    const priorities = new Set(cachedPhase3TestCases.map(c => c.priority).filter(Boolean));
    document.getElementById('tc-summary-total').textContent = cachedPhase3TestCases.length;
    document.getElementById('tc-summary-types').textContent = types.size;
    document.getElementById('tc-summary-priority').textContent = priorities.size;

    // Populate filter dropdowns
    populateFilterSelect('filter-test-type', types);
    populateFilterSelect('filter-priority', priorities);
    const categories = new Set(cachedPhase3TestCases.map(c => c.test_category).filter(Boolean));
    populateFilterSelect('filter-category', categories);

    applyTestCaseFilters();
}

function populateFilterSelect(selectId, values) {
    const select = document.getElementById(selectId);
    const current = select.value;
    const sorted = Array.from(values).sort();
    select.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = `All ${selectId === 'filter-priority' ? 'Priorities' : selectId === 'filter-category' ? 'Categories' : 'Types'}`;
    select.appendChild(allOption);
    sorted.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
    });
    select.value = sorted.includes(current) ? current : 'all';
}

function applyTestCaseFilters() {
    const typeFilter = document.getElementById('filter-test-type').value;
    const priorityFilter = document.getElementById('filter-priority').value;
    const categoryFilter = document.getElementById('filter-category').value;

    const filtered = cachedPhase3TestCases.filter(c => {
        if (typeFilter !== 'all' && c.test_type !== typeFilter) return false;
        if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
        if (categoryFilter !== 'all' && c.test_category !== categoryFilter) return false;
        return true;
    });

    const container = document.getElementById('test-cases-list');
    container.innerHTML = '';

    if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'report-card';
        empty.style.textAlign = 'center';
        empty.style.color = 'var(--text-muted)';
        empty.textContent = 'No test cases match the selected filters.';
        container.appendChild(empty);
        return;
    }

    filtered.forEach(c => renderTestCaseCard(c, container));
}

function renderTestCaseCard(c, container) {
    const card = document.createElement('div');
    card.className = 'report-card tc-card';

    // Header
    const header = document.createElement('div');
    header.className = 'report-card-header';

    const id = document.createElement('span');
    id.className = 'report-card-id id-tc';
    id.textContent = c.test_case_id;

    const badgeGroup = document.createElement('div');
    badgeGroup.className = 'badge-group';

    const typeBadge = document.createElement('span');
    typeBadge.className = `inline-tag ${c.test_type === 'regression' ? 'tag-amber-border' : 'tag-cyan-border'}`;
    typeBadge.textContent = c.test_type;

    const catBadge = document.createElement('span');
    catBadge.className = `inline-tag ${c.test_category === 'negative' || c.test_category === 'edge' ? 'tag-amber-border' : 'tag-mint-border'}`;
    catBadge.textContent = c.test_category;

    const prioBadge = document.createElement('span');
    prioBadge.className = `inline-tag ${c.priority === 'High' ? 'text-danger' : c.priority === 'Medium' ? 'tag-amber-border' : ''}`;
    prioBadge.textContent = `Priority: ${c.priority}`;

    badgeGroup.appendChild(typeBadge);
    badgeGroup.appendChild(catBadge);
    badgeGroup.appendChild(prioBadge);

    header.appendChild(id);
    header.appendChild(badgeGroup);

    // Title
    const title = document.createElement('h4');
    title.className = 'tc-title';
    title.textContent = c.title;

    // Links row
    const links = document.createElement('div');
    links.className = 'tc-links-row';
    links.innerHTML = `
        <span class="inline-tag tag-cyan-border">Req: <strong>${escapeHtml(c.requirement_id || 'N/A')}</strong></span>
        <span class="inline-tag ${c.risk_id ? 'tag-amber-border' : ''}">Risk: <strong>${escapeHtml(c.risk_id || 'None')}</strong></span>
        <span class="inline-tag">Design: <strong>${escapeHtml(c.design_component || 'N/A')}</strong></span>
        <span class="inline-tag tag-mint-border">Target: <strong>${escapeHtml(c.code_target || 'N/A')}</strong></span>
    `;

    // Description
    const desc = document.createElement('p');
    desc.className = 'card-desc';
    desc.textContent = c.description || '';

    card.appendChild(header);
    card.appendChild(title);
    card.appendChild(links);
    card.appendChild(desc);

    // Preconditions
    if (Array.isArray(c.preconditions) && c.preconditions.length > 0) {
        card.appendChild(renderListBlock('Preconditions', c.preconditions));
    }

    // Steps
    if (Array.isArray(c.steps) && c.steps.length > 0) {
        card.appendChild(renderNumberedListBlock('Test Steps', c.steps));
    }

    // Assertions
    if (Array.isArray(c.assertions) && c.assertions.length > 0) {
        card.appendChild(renderListBlock('Assertions', c.assertions));
    }

    // Expected result
    const expected = document.createElement('div');
    expected.className = 'tc-expected-box';
    expected.innerHTML = `<strong>Expected Result:</strong> ${escapeHtml(c.expected_result || '')}`;
    card.appendChild(expected);

    // Footer meta
    const footer = document.createElement('div');
    footer.className = 'tc-footer';

    const mocks = document.createElement('div');
    mocks.className = 'tc-meta-block';
    mocks.innerHTML = `<span class="tc-meta-label">MOCKS</span><div class="badge-group">${
        (Array.isArray(c.mocks_required) && c.mocks_required.length > 0)
            ? c.mocks_required.map(m => `<span class="inline-tag">${escapeHtml(m)}</span>`).join('')
            : '<span class="inline-tag">None</span>'
    }</div>`;

    const dataLinks = document.createElement('div');
    dataLinks.className = 'tc-meta-block';
    dataLinks.innerHTML = `<span class="tc-meta-label">TEST DATA</span><div class="badge-group">${
        (Array.isArray(c.test_data_ids) && c.test_data_ids.length > 0)
            ? c.test_data_ids.map(d => `<span class="inline-tag tag-mint-border text-mono">${escapeHtml(d)}</span>`).join('')
            : '<span class="inline-tag">None</span>'
    }</div>`;

    footer.appendChild(mocks);
    footer.appendChild(dataLinks);
    card.appendChild(footer);

    container.appendChild(card);
}

/* ---- SCENARIOS PANEL ---- */

function renderScenariosPanel(scenarios) {
    const container = document.getElementById('scenarios-list');
    container.innerHTML = '';

    if (scenarios.length === 0) {
        container.innerHTML = '<div class="report-card" style="text-align:center; color:var(--text-muted);">No test scenarios generated.</div>';
        return;
    }

    scenarios.forEach(s => {
        const card = document.createElement('div');
        card.className = 'report-card scenario-card';

        const header = document.createElement('div');
        header.className = 'report-card-header';
        const id = document.createElement('span');
        id.className = 'report-card-id id-scn';
        id.textContent = s.scenario_id;
        const links = document.createElement('div');
        links.className = 'badge-group';
        (s.requirement_ids || []).forEach(rid => {
            const tag = document.createElement('span');
            tag.className = 'inline-tag tag-cyan-border text-mono';
            tag.textContent = rid;
            links.appendChild(tag);
        });
        header.appendChild(id);
        header.appendChild(links);

        const title = document.createElement('h4');
        title.className = 'tc-title';
        title.textContent = s.title;

        const desc = document.createElement('p');
        desc.className = 'card-desc';
        desc.textContent = s.description || '';

        card.appendChild(header);
        card.appendChild(title);
        card.appendChild(desc);

        // Ordered flow steps
        if (Array.isArray(s.flow_steps) && s.flow_steps.length > 0) {
            card.appendChild(renderNumberedListBlock('Flow Steps', s.flow_steps));
        }

        // Related test cases
        const related = document.createElement('div');
        related.className = 'tc-meta-block';
        related.innerHTML = `<span class="tc-meta-label">RELATED TEST CASES</span><div class="badge-group">${
            (Array.isArray(s.related_test_case_ids) && s.related_test_case_ids.length > 0)
                ? s.related_test_case_ids.map(t => `<span class="inline-tag tag-mint-border text-mono">${escapeHtml(t)}</span>`).join('')
                : '<span class="inline-tag">None</span>'
        }</div>`;
        card.appendChild(related);

        container.appendChild(card);
    });
}

/* ---- TEST DATA PANEL ---- */

function renderTestDataPanel(testData) {
    const container = document.getElementById('test-data-list');
    container.innerHTML = '';

    if (testData.length === 0) {
        container.innerHTML = '<div class="report-card" style="text-align:center; color:var(--text-muted);">No test data generated.</div>';
        return;
    }

    testData.forEach(d => {
        const card = document.createElement('div');
        card.className = 'report-card td-card';

        const header = document.createElement('div');
        header.className = 'report-card-header';
        const id = document.createElement('span');
        id.className = 'report-card-id id-td';
        id.textContent = d.data_id;

        const badges = document.createElement('div');
        badges.className = 'badge-group';
        const cat = document.createElement('span');
        cat.className = `inline-tag ${
            d.category === 'invalid' ? 'text-danger' :
            d.category === 'boundary' ? 'tag-amber-border' :
            d.category === 'edge' ? 'tag-amber-border' : 'tag-mint-border'
        }`;
        cat.textContent = d.category;
        badges.appendChild(cat);
        header.appendChild(id);
        header.appendChild(badges);

        const desc = document.createElement('p');
        desc.className = 'card-desc';
        desc.textContent = d.description || '';

        card.appendChild(header);
        card.appendChild(desc);

        // Linked test cases
        const linked = document.createElement('div');
        linked.className = 'tc-meta-block';
        linked.innerHTML = `<span class="tc-meta-label">LINKED TEST CASES</span><div class="badge-group">${
            (Array.isArray(d.linked_test_case_ids) && d.linked_test_case_ids.length > 0)
                ? d.linked_test_case_ids.map(t => `<span class="inline-tag tag-cyan-border text-mono">${escapeHtml(t)}</span>`).join('')
                : '<span class="inline-tag">None</span>'
        }</div>`;
        card.appendChild(linked);

        // Fields
        if (Array.isArray(d.fields) && d.fields.length > 0) {
            const fieldTable = document.createElement('div');
            fieldTable.className = 'td-fields-table';
            fieldTable.innerHTML = '<div class="td-fields-header"><span>FIELD</span><span>VALUE</span><span>DESCRIPTION</span></div>';
            d.fields.forEach(f => {
                const row = document.createElement('div');
                row.className = 'td-fields-row';
                const name = document.createElement('span');
                name.className = 'text-mono';
                name.textContent = f.name || '';
                const value = document.createElement('span');
                value.className = 'td-field-value';
                value.textContent = typeof f.value === 'object' ? JSON.stringify(f.value) : String(f.value ?? '');
                const descCell = document.createElement('span');
                descCell.textContent = f.description || '';
                row.appendChild(name);
                row.appendChild(value);
                row.appendChild(descCell);
                fieldTable.appendChild(row);
            });
            card.appendChild(fieldTable);
        }

        container.appendChild(card);
    });
}

/* ---- TRACEABILITY PANEL ---- */

function renderTraceabilityPanel(traceability, warnings) {
    // Alerts: uncovered / orphaned
    const uncovered = document.getElementById('trace-uncovered-reqs');
    const orphanedCases = document.getElementById('trace-orphaned-cases');
    const orphanedData = document.getElementById('trace-orphaned-data');

    fillTraceBadgeGroup(uncovered, traceability ? traceability.uncovered_requirements : [], 'No uncovered requirements');
    fillTraceBadgeGroup(orphanedCases, traceability ? traceability.orphaned_test_cases : [], 'No orphaned test cases');
    fillTraceBadgeGroup(orphanedData, traceability ? traceability.orphaned_test_data : [], 'No orphaned test data');

    // Warnings
    let warningsBlock = null;
    const existingWarnings = document.getElementById('trace-warnings-block');
    if (existingWarnings) existingWarnings.remove();

    if (Array.isArray(warnings) && warnings.length > 0) {
        warningsBlock = document.createElement('div');
        warningsBlock.id = 'trace-warnings-block';
        warningsBlock.className = 'trace-warnings-box';
        const title = document.createElement('span');
        title.className = 'trace-alert-label';
        title.textContent = 'TEST DESIGN WARNINGS';
        warningsBlock.appendChild(title);
        const list = document.createElement('ul');
        list.className = 'bullet-list';
        warnings.forEach(w => {
            const li = document.createElement('li');
            li.textContent = w;
            list.appendChild(li);
        });
        warningsBlock.appendChild(list);
        const tracePanel = document.getElementById('panel-traceability');
        tracePanel.insertBefore(warningsBlock, document.getElementById('traceability-list'));
    }

    // Entries
    const container = document.getElementById('traceability-list');
    container.innerHTML = '';

    const entries = (traceability && Array.isArray(traceability.entries)) ? traceability.entries : [];
    if (entries.length === 0) {
        container.innerHTML = '<div class="report-card" style="text-align:center; color:var(--text-muted);">No traceability entries generated.</div>';
        return;
    }

    entries.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'report-card trace-card';

        const chain = [
            { label: 'REQ', value: entry.requirement_id, cls: 'id-req' },
            { label: 'RSK', value: entry.risk_id, cls: 'id-risk' },
            { label: 'DESIGN', value: entry.design_component, cls: 'trace-design' },
            { label: 'CODE', value: entry.code_target, cls: 'trace-code' },
            { label: 'SCN', value: entry.scenario_id, cls: 'id-scn' },
            { label: 'TC', value: entry.test_case_id, cls: 'id-tc' }
        ];

        const chainRow = document.createElement('div');
        chainRow.className = 'trace-chain-row';
        chain.forEach((item, idx) => {
            const node = document.createElement('div');
            node.className = 'trace-chain-node';
            const label = document.createElement('span');
            label.className = 'trace-chain-label';
            label.textContent = item.label;
            const val = document.createElement('span');
            val.className = `trace-chain-value ${item.cls}`;
            val.textContent = item.value || 'N/A';
            node.appendChild(label);
            node.appendChild(val);
            chainRow.appendChild(node);
            if (idx < chain.length - 1) {
                const arrow = document.createElement('span');
                arrow.className = 'trace-chain-arrow';
                arrow.textContent = '→';
                chainRow.appendChild(arrow);
            }
        });

        card.appendChild(chainRow);

        // Test data
        const dataIds = (Array.isArray(entry.test_data_ids) && entry.test_data_ids.length > 0)
            ? entry.test_data_ids.map(d => `<span class="inline-tag tag-mint-border text-mono">${escapeHtml(d)}</span>`).join('')
            : '<span class="inline-tag">None</span>';
        const dataBlock = document.createElement('div');
        dataBlock.className = 'tc-meta-block';
        dataBlock.innerHTML = `<span class="tc-meta-label">TEST DATA</span><div class="badge-group">${dataIds}</div>`;
        card.appendChild(dataBlock);

        container.appendChild(card);
    });
}

function fillTraceBadgeGroup(container, ids, emptyText) {
    container.innerHTML = '';
    if (Array.isArray(ids) && ids.length > 0) {
        ids.forEach(id => {
            const tag = document.createElement('span');
            tag.className = 'inline-tag text-mono';
            tag.textContent = id;
            container.appendChild(tag);
        });
    } else {
        const span = document.createElement('span');
        span.className = 'trace-empty-label';
        span.textContent = emptyText;
        container.appendChild(span);
    }
}

/* ---- PHASE 4: EXECUTION FETCH & RENDER HELPERS ---- */

async function fetchAndRenderExecutionResults(payload) {
    const panel = document.getElementById('panel-phase3-execution');
    const container = document.getElementById('execution-results-container');
    const modulesOverview = document.getElementById('execution-module-overview');

    if (panel) {
        const resultsContainer = document.getElementById('execution-results-container');
        const modulesOverview = document.getElementById('execution-module-overview');
        if (resultsContainer) resultsContainer.innerHTML = '<div style="padding:18px;">Loading execution results...</div>';
        if (modulesOverview) modulesOverview.innerHTML = '';
    }

    // Mark TESTS node as running
    const nodeTests = document.getElementById('node-tests');
    if (nodeTests) nodeTests.classList.add('running');

    try {
        const res = await fetch('http://127.0.0.1:8085/testing/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Execution server error ${res.status}`);
        }

        const data = await res.json();

        // Render into the panel
        renderExecutionResults(data);

        // Render Phase 8 report if available
        if (data.report) {
            renderReportPanel(data.report);
        }

        // Activate Exec Logs tab
        activateResultsTab('panel-phase3-execution');

        // Mark nodes as completed
        if (nodeTests) nodeTests.classList.remove('running');
        if (nodeTests) nodeTests.classList.add('completed');
        const qg = document.getElementById('node-quality_gate');
        if (qg) qg.classList.remove('future-node');
        if (qg) qg.classList.add('pipeline-node');

    } catch (e) {
        console.error('Execution fetch error', e);
        if (panel) panel.innerHTML = `<div class="content-header-bar"><span>PHASE 4 — TEST EXECUTION</span></div><div style="padding:18px;color:var(--text-danger);">Execution failed: ${e.message}</div>`;
    }
}

function renderExecutionResults(response) {
    if (!response) return;

    const summary = response.execution_summary || {};
    const results = Array.isArray(response.results) ? response.results : [];

    // Populate summary fields
    document.getElementById('execution-total').textContent = summary.total ?? results.length;
    document.getElementById('execution-passed').textContent = summary.passed ?? results.filter(r => r.status === 'passed').length;
    document.getElementById('execution-failed').textContent = summary.failed ?? results.filter(r => r.status === 'failed').length;
    document.getElementById('execution-duration').textContent = summary.duration ?? (results.reduce((s, r) => s + (r.duration || 0), 0) + 's');

    // Modules overview
    const modulesOverview = document.getElementById('execution-module-overview');
    modulesOverview.innerHTML = '';
    const modules = [...new Set(results.map(r => r.module).filter(Boolean))];
    if (modules.length === 0) {
        modulesOverview.innerHTML = '<div class="report-card" style="text-align:center;color:var(--text-muted);">No execution modules reported</div>';
    } else {
        modules.forEach(m => {
            const card = document.createElement('div');
            card.className = 'report-card module-card';
            card.innerHTML = `<div class="report-card-header"><span class="report-card-id">${escapeHtml(m)}</span></div><div style="padding:8px;color:var(--text-muted)">Module reported by execution engine</div>`;
            modulesOverview.appendChild(card);
        });
    }

    // Results container
    const container = document.getElementById('execution-results-container');
    container.innerHTML = '';

    if (results.length === 0) {
        container.innerHTML = '<div class="report-card" style="text-align:center;color:var(--text-muted);">No execution results returned.</div>';
        return;
    }

    results.forEach(r => {
        const card = document.createElement('div');
        card.className = 'report-card exec-card';

        const header = document.createElement('div');
        header.className = 'report-card-header';

        const id = document.createElement('span');
        id.className = 'report-card-id';
        id.textContent = r.test_case_id || r.id || 'unnamed';

        const statusBadge = document.createElement('div');
        statusBadge.className = 'badge-group';
        const st = document.createElement('span');
        st.className = `inline-tag ${r.status === 'passed' ? 'tag-mint-border' : r.status === 'failed' ? 'text-danger' : ''}`;
        st.textContent = r.status ? r.status.toUpperCase() : 'UNKNOWN';
        statusBadge.appendChild(st);

        header.appendChild(id);
        header.appendChild(statusBadge);

        const title = document.createElement('h4');
        title.className = 'tc-title';
        title.textContent = r.name || r.title || 'Test Case';

        const metaRow = document.createElement('div');
        metaRow.className = 'tc-links-row';
        metaRow.innerHTML = `<span class="inline-tag">Module: <strong>${escapeHtml(r.module || 'N/A')}</strong></span>
                             <span class="inline-tag">Duration: <strong>${r.duration ?? '--'}</strong></span>
                             <span class="inline-tag">Attempts: <strong>${(Array.isArray(r.attempts) ? r.attempts.length : (r.attempts ? 1 : 0))}</strong></span>`;

        card.appendChild(header);
        card.appendChild(title);
        card.appendChild(metaRow);

        // Details (hidden by default)
        const details = document.createElement('div');
        details.className = 'execution-details hidden';

        // Attempts
        const attemptsBlock = document.createElement('div');
        attemptsBlock.className = 'execution-attempts';
        attemptsBlock.innerHTML = `<strong>Attempts:</strong>`;
        if (Array.isArray(r.attempts) && r.attempts.length > 0) {
            r.attempts.forEach((a, idx) => {
                const ab = document.createElement('div');
                ab.className = 'attempt-item';
                ab.innerHTML = `<div style="font-size:13px;margin-top:6px;"><strong>Attempt ${idx+1}:</strong> Status: ${a.status || '--'} Duration: ${a.duration ?? '--'}</div>`;
                // Per-attempt logs
                const logBlock = document.createElement('div');
                logBlock.className = 'execution-logs';
                logBlock.innerHTML = `<div style="font-weight:600;margin-top:6px;">Logs:</div>`;
                if (Array.isArray(a.logs) && a.logs.length > 0) {
                    a.logs.forEach(line => {
                        const p = document.createElement('pre');
                        p.style.margin = '6px 0';
                        p.textContent = line;
                        logBlock.appendChild(p);
                    });
                } else {
                    logBlock.innerHTML += `<div style="color:var(--text-muted)">No logs for this attempt</div>`;
                }
                ab.appendChild(logBlock);
                attemptsBlock.appendChild(ab);
            });
        } else {
            attemptsBlock.innerHTML += `<div style="color:var(--text-muted)">No attempts recorded</div>`;
        }
        details.appendChild(attemptsBlock);

        // Artifacts
        const artBlock = document.createElement('div');
        artBlock.className = 'execution-artifacts';
        artBlock.innerHTML = `<strong>Artifacts:</strong>`;
        if (Array.isArray(r.artifacts) && r.artifacts.length > 0) {
            const list = document.createElement('div');
            list.className = 'badge-group';
            r.artifacts.forEach(a => {
                const tag = document.createElement('span');
                tag.className = 'inline-tag text-mono';
                tag.textContent = a;
                list.appendChild(tag);
            });
            artBlock.appendChild(list);
        } else {
            artBlock.innerHTML += `<div style="color:var(--text-muted)">No artifacts generated</div>`;
        }
        details.appendChild(artBlock);

        // Screenshot
        const ssBlock = document.createElement('div');
        ssBlock.className = 'execution-screenshot';
        ssBlock.innerHTML = `<strong>Screenshot:</strong>`;
        if (r.screenshot) {
            const img = document.createElement('img');
            img.src = r.screenshot;
            img.alt = 'screenshot';
            img.style.maxWidth = '100%';
            img.style.marginTop = '8px';
            ssBlock.appendChild(img);
        } else {
            ssBlock.innerHTML += `<div style="color:var(--text-muted)">No screenshot captured</div>`;
        }
        details.appendChild(ssBlock);

        // Details text
        const textBlock = document.createElement('div');
        textBlock.className = 'execution-meta';
        textBlock.style.marginTop = '8px';
        textBlock.innerHTML = `<div><strong>Status:</strong> ${r.status || '--'}</div><div style="margin-top:6px;"><strong>Duration:</strong> ${r.duration ?? '--'}</div><div style="margin-top:6px;"><strong>Details:</strong><div style="color:var(--text-muted);margin-top:6px">${escapeHtml(r.details || '')}</div></div>`;
        details.appendChild(textBlock);

        // Toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'btn btn-sm btn-secondary';
        toggleBtn.style.marginTop = '10px';
        toggleBtn.textContent = 'Show Execution Details';
        toggleBtn.addEventListener('click', () => {
            details.classList.toggle('hidden');
            toggleBtn.textContent = details.classList.contains('hidden') ? 'Show Execution Details' : 'Hide Execution Details';
        });

        card.appendChild(toggleBtn);
        card.appendChild(details);
        container.appendChild(card);
    });

    lucide.createIcons();
}

/* ---- PHASE 8: REPORTS PANEL ---- */

function renderReportPanel(report) {
    const emptyState = document.getElementById('report-empty-state');
    const executiveSummary = document.getElementById('report-executive-summary');
    const phasesSection = document.getElementById('report-phases');
    const recommendations = document.getElementById('report-recommendations');

    if (!report) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (executiveSummary) executiveSummary.classList.add('hidden');
        if (phasesSection) phasesSection.classList.add('hidden');
        if (recommendations) recommendations.classList.add('hidden');
        return;
    }

    // Hide empty state
    if (emptyState) emptyState.classList.add('hidden');

    // Executive Summary
    if (executiveSummary && report.executive_summary) {
        executiveSummary.classList.remove('hidden');
        document.getElementById('report-exec-summary-text').textContent = report.executive_summary;
    }

    // Phase Status
    if (phasesSection && Array.isArray(report.phases) && report.phases.length > 0) {
        phasesSection.classList.remove('hidden');
        const phasesList = document.getElementById('report-phases-list');
        phasesList.innerHTML = '';
        report.phases.forEach(p => {
            const card = document.createElement('div');
            card.className = 'report-card report-phase-card';
            const statusClass = p.status === 'passed' ? 'tag-mint-border' : p.status === 'failed' ? 'text-danger' : 'tag-amber-border';
            card.innerHTML = `
                <div class="report-card-header">
                    <span class="report-card-id id-req">Phase ${p.phase_number}</span>
                    <span class="inline-tag ${statusClass}">${p.status.toUpperCase()}</span>
                </div>
                <h4 class="tc-title">${escapeHtml(p.phase_name)}</h4>
                <p class="card-desc">${escapeHtml(p.summary)}</p>
            `;
            phasesList.appendChild(card);
        });
    }

    // Metrics
    if (report.quality_gate) {
        document.getElementById('report-quality-score').textContent = report.quality_gate.quality_score != null ? report.quality_gate.quality_score.toFixed(1) : '--';
        document.getElementById('report-release-readiness').textContent = report.quality_gate.release_readiness || '--';
    }
    if (report.execution) {
        document.getElementById('report-pass-rate').textContent = report.execution.pass_rate != null ? report.execution.pass_rate + '%' : '--';
    }
    if (report.analysis) {
        document.getElementById('report-defects').textContent = report.analysis.product_defects || 0;
    }

    // Recommendations
    if (recommendations && Array.isArray(report.recommendations) && report.recommendations.length > 0) {
        recommendations.classList.remove('hidden');
        const list = document.getElementById('report-recommendations-list');
        list.innerHTML = '';
        report.recommendations.forEach(r => {
            const li = document.createElement('li');
            li.textContent = r;
            list.appendChild(li);
        });
    }

    // Wire export buttons
    wireExportButtons(report);
}

function wireExportButtons(report) {
    const btnJson = document.getElementById('btn-export-json');
    const btnHtml = document.getElementById('btn-export-html');
    const btnCsv = document.getElementById('btn-export-csv');

    if (btnJson) {
        btnJson.onclick = () => downloadReport(report, 'json');
    }
    if (btnHtml) {
        btnHtml.onclick = () => downloadReport(report, 'html');
    }
    if (btnCsv) {
        btnCsv.onclick = () => downloadReport(report, 'csv');
    }
}

function downloadReport(report, fmt) {
    // Use the backend export endpoint for HTML and CSV (server-rendered)
    // For JSON, just download the report object directly
    if (fmt === 'json') {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-report-${report.project_id || 'unknown'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } else {
        // For HTML/CSV, use the backend export endpoint
        const payload = compilePayloadFromVisuals();
        fetch(`http://127.0.0.1:8085/testing/report/export?fmt=${fmt}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (!res.ok) throw new Error('Export failed');
            return res.blob();
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `test-report-${report.project_id || 'unknown'}.${fmt}`;
            a.click();
            URL.revokeObjectURL(url);
        })
        .catch(e => console.error('Export error', e));
    }
}

/* ---- HUMAN APPROVAL FUNCTIONALITY ---- */

// Approval state management
let currentReport = null;
let currentApprovalStatus = null;

async function checkApprovalStatus(projectId) {
    try {
        const res = await fetch(`http://127.0.0.1:8085/testing/report/approval-status/${projectId}`);
        if (res.ok) {
            const data = await res.json();
            currentApprovalStatus = data;
            renderApprovalStatus(data);
        }
    } catch (e) {
        console.error('Failed to fetch approval status', e);
    }
}

function renderApprovalStatus(approval) {
    const section = document.getElementById('approval-status-section');
    const card = document.getElementById('approval-status-card');
    const text = document.getElementById('approval-text');
    const reviewer = document.getElementById('approval-reviewer');
    const timestamp = document.getElementById('approval-timestamp');
    const actions = document.getElementById('approval-actions');
    const commentDisplay = document.getElementById('approval-comment-display');
    const commentText = document.getElementById('approval-comment-text');
    
    // Quality gate and release readiness display
    const qualityGateStatus = document.getElementById('quality-gate-status');
    const releaseReadinessStatus = document.getElementById('release-readiness-status');
    const humanApprovalStatus = document.getElementById('human-approval-status');
    const releaseAllowedStatus = document.getElementById('release-allowed-status');
    
    if (!section) return;
    
    section.classList.remove('hidden');
    
    // Reset classes
    card.classList.remove('approved', 'rejected');
    
    // Render release status display
    qualityGateStatus.textContent = approval.quality_gate_status || '--';
    releaseReadinessStatus.textContent = approval.release_readiness || '--';
    humanApprovalStatus.textContent = approval.approval_status.toUpperCase();
    releaseAllowedStatus.textContent = approval.release_allowed ? 'YES' : 'NO';
    
    // Style release allowed status
    releaseAllowedStatus.className = 'release-status-value';
    if (approval.release_allowed) {
        releaseAllowedStatus.classList.add('status-ready');
    } else {
        releaseAllowedStatus.classList.add('status-not-ready');
    }
    
    // Style release readiness
    releaseReadinessStatus.className = 'release-status-value';
    if (approval.release_readiness === 'READY') {
        releaseReadinessStatus.classList.add('status-ready');
    } else if (approval.release_readiness === 'NOT_READY') {
        releaseReadinessStatus.classList.add('status-not-ready');
    } else {
        releaseReadinessStatus.classList.add('status-pending');
    }
    
    if (approval.approval_status === 'approved') {
        card.classList.add('approved');
        text.textContent = 'APPROVED';
        reviewer.textContent = `Approved by: ${approval.approved_by}`;
        timestamp.textContent = approval.approval_timestamp;
        actions.classList.add('hidden');
        
        if (approval.comment) {
            commentDisplay.classList.remove('hidden');
            commentText.textContent = approval.comment;
        } else {
            commentDisplay.classList.add('hidden');
        }
    } else if (approval.approval_status === 'rejected') {
        card.classList.add('rejected');
        text.textContent = 'REJECTED';
        reviewer.textContent = `Rejected by: ${approval.approved_by}`;
        timestamp.textContent = approval.approval_timestamp;
        actions.classList.add('hidden');
        
        if (approval.comment) {
            commentDisplay.classList.remove('hidden');
            commentText.textContent = approval.comment;
        } else {
            commentDisplay.classList.add('hidden');
        }
    } else {
        text.textContent = 'PENDING APPROVAL';
        reviewer.textContent = '--';
        timestamp.textContent = '--';
        actions.classList.remove('hidden');
        commentDisplay.classList.add('hidden');
    }
}

// Wire approval buttons
document.getElementById('btn-approve').addEventListener('click', async () => {
    const reviewer = prompt('Enter your name or identifier:');
    if (!reviewer || !reviewer.trim()) {
        alert('Reviewer identifier is required');
        return;
    }
    
    try {
        const res = await fetch('http://127.0.0.1:8085/testing/report/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: currentReport.project_id,
                report_id: currentReport.report_id,
                approved_by: reviewer.trim(),
                comment: null
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            currentApprovalStatus = data;
            renderApprovalStatus(data);
        } else {
            const error = await res.json();
            alert(`Approval failed: ${error.detail || 'Unknown error'}`);
        }
    } catch (e) {
        console.error('Approval failed', e);
        alert('Approval failed: Network error');
    }
});

document.getElementById('btn-reject').addEventListener('click', () => {
    document.getElementById('rejection-comment-section').classList.remove('hidden');
});

document.getElementById('btn-cancel-reject').addEventListener('click', () => {
    document.getElementById('rejection-comment-section').classList.add('hidden');
    document.getElementById('rejection-comment').value = '';
});

document.getElementById('btn-confirm-reject').addEventListener('click', async () => {
    const comment = document.getElementById('rejection-comment').value.trim();
    if (!comment) {
        alert('Please provide a rejection reason');
        return;
    }
    
    const reviewer = prompt('Enter your name or identifier:');
    if (!reviewer || !reviewer.trim()) {
        alert('Reviewer identifier is required');
        return;
    }
    
    try {
        const res = await fetch('http://127.0.0.1:8085/testing/report/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: currentReport.project_id,
                report_id: currentReport.report_id,
                approved_by: reviewer.trim(),
                comment: comment
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            currentApprovalStatus = data;
            renderApprovalStatus(data);
            document.getElementById('rejection-comment-section').classList.add('hidden');
            document.getElementById('rejection-comment').value = '';
        } else {
            const error = await res.json();
            alert(`Rejection failed: ${error.detail || 'Unknown error'}`);
        }
    } catch (e) {
        console.error('Rejection failed', e);
        alert('Rejection failed: Network error');
    }
});

// Update renderReportPanel to include approval check
const originalRenderReportPanel = renderReportPanel;
renderReportPanel = function(report) {
    // Call original function
    originalRenderReportPanel(report);
    
    // Store current report
    currentReport = report;
    
    // Check approval status
    if (report && report.project_id) {
        checkApprovalStatus(report.project_id);
    }
};

/* ---- SHARED HELPERS ---- */

function renderListBlock(label, items) {
    const block = document.createElement('div');
    block.className = 'tc-list-block';
    const title = document.createElement('span');
    title.className = 'tc-list-label';
    title.textContent = label;
    block.appendChild(title);
    const list = document.createElement('ul');
    list.className = 'bullet-list';
    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
    });
    block.appendChild(list);
    return block;
}

function renderNumberedListBlock(label, items) {
    const block = document.createElement('div');
    block.className = 'tc-list-block';
    const title = document.createElement('span');
    title.className = 'tc-list-label';
    title.textContent = label;
    block.appendChild(title);
    const list = document.createElement('ol');
    list.className = 'numbered-list';
    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
    });
    block.appendChild(list);
    return block;
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    const AMP = String.fromCharCode(38);
    const LT = String.fromCharCode(60);
    const GT = String.fromCharCode(62);
    const QUOT = String.fromCharCode(34);
    const APOS = String.fromCharCode(39);
    return String(value)
        .replace(new RegExp(AMP, 'g'), AMP + 'amp;')
        .replace(new RegExp(LT, 'g'), AMP + 'lt;')
        .replace(new RegExp(GT, 'g'), AMP + 'gt;')
        .replace(new RegExp(QUOT, 'g'), AMP + 'quot;')
        .replace(new RegExp(APOS, 'g'), AMP + '#039;');
}
