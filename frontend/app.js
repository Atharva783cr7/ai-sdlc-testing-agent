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

// Quality Gate Cards
const gateReadinessVal = document.getElementById('gate-readiness-val');
const gateReadinessLabel = document.getElementById('gate-readiness-label');
const gateReqCoverage = document.getElementById('gate-req-coverage');
const gateRiskCoverage = document.getElementById('gate-risk-coverage');
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
            resultsNavBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

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
        const res = await fetch('/api/');
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
    gateReadinessVal.textContent = '--%';
    gateReadinessLabel.textContent = 'PENDING RUN';
    gateReqCoverage.textContent = '--%';
    gateRiskCoverage.textContent = '--%';
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
    const nodes = ['input', 'context', 'requirements', 'risk', 'impact', 'coverage', 'strategy'];
    nodes.forEach(node => {
        const el = document.getElementById(`node-${node}`);
        if (el) el.className = 'pipeline-node';
    });

    for(let i=1; i<=7; i++) {
        const arrow = document.getElementById(`arrow-${i}`);
        if (arrow) arrow.className = 'pipeline-arrow';
    }

    // Reset Phase 3 placeholders nodes
    document.getElementById('node-tests').className = 'pipeline-node future-node';
    document.getElementById('arrow-8').className = 'pipeline-arrow future-arrow';
    document.getElementById('node-quality_gate').className = 'pipeline-node future-node';
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
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
        { id: 'strategy', label: 'STRATEGY', arrow: 6 }
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
        const res = await fetch('/api/testing/start', {
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

            // Show gate blocked status
            gateReadinessVal.textContent = '0%';
            gateReadinessLabel.textContent = 'ERRORS DETECTED';
            gateStatusIndicator.className = 'gate-status blocked-review';
            gateStatusIndicator.querySelector('.status-text').textContent = 'RELEASE BLOCKED';
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

    // A. Render Quality Gate Readiness Card Metrics
    const reqPct = report.coverage ? report.coverage.coverage_percentage : 0.0;
    gateReqCoverage.textContent = `${reqPct.toFixed(1)}%`;
    
    // Risk Mitigation Coverage: calculate percentage of risks with mitigation text
    let riskMitPct = 100.0;
    if (Array.isArray(report.risks) && report.risks.length > 0) {
        const total = report.risks.length;
        const mits = report.risks.filter(r => r.mitigation && r.mitigation.trim() !== '').length;
        riskMitPct = (mits / total) * 100.0;
    }
    gateRiskCoverage.textContent = `${riskMitPct.toFixed(1)}%`;

    // Composite readiness score: average of requirement coverage and risk mitigation
    const overallReadiness = (reqPct + riskMitPct) / 2.0;
    gateReadinessVal.textContent = `${Math.round(overallReadiness)}%`;

    // Update Gate Status badge classes
    if (overallReadiness >= 80.0) {
        gateReadinessLabel.textContent = 'READINESS OPTIMAL';
        gateStatusIndicator.className = 'gate-status ready-for-review';
        gateStatusIndicator.querySelector('.status-text').textContent = 'READY FOR REVIEW';
    } else if (overallReadiness >= 50.0) {
        gateReadinessLabel.textContent = 'READINESS MODERATE';
        gateStatusIndicator.className = 'gate-status pending-review';
        gateStatusIndicator.querySelector('.status-text').textContent = 'PENDING REVIEW';
    } else {
        gateReadinessLabel.textContent = 'READINESS INSUFFICIENT';
        gateStatusIndicator.className = 'gate-status blocked-review';
        gateStatusIndicator.querySelector('.status-text').textContent = 'ACTION REQUIRED';
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
}
