// Pipeline State Management
class PipelineManager {
    constructor() {
        this.storageKey = 'pipelineStepsV1';
        this.projectNameKey = 'projectNameV1';
        this.steps = [];
        this.beforeSteps = [];
        this.afterSteps = [];
        this.parkingLot = [];
        this.projectName = '';

        if (!this.loadFromStorage()) {
            this.init();
        }
    }

    init() {
        // Initialize with start and end steps
        this.steps = [
            {
                id: this.generateId(),
                name: "A developer commits code",
                type: "Delivery step",
                description: '',
                manual: false,
                fixed: true,
                position: 0,
                time: ''
            },
            {
                id: this.generateId(),
                name: "Deploy to production",
                type: "Deploy step",
                description: '',
                manual: false,
                fixed: true,
                position: 1,
                time: ''
            }
        ];
        this.beforeSteps = [];
        this.afterSteps = [];
        this.reorderZonePositions(this.beforeSteps);
        this.reorderZonePositions(this.afterSteps);
        this.saveToStorage();
    }

    normalizeStep(step, options = {}) {
        const { fixed = false } = options;
        const name = typeof step.name === 'string' ? step.name.trim() : '';

        return {
            id: step.id || this.generateId(),
            name,
            type: typeof step.type === 'string' ? step.type : '',
            description: typeof step.description === 'string' ? step.description : '',
            manual: Boolean(step.manual),
            fixed: Boolean(fixed || step.fixed),
            position: Number.isInteger(step.position) ? step.position : 0,
            time: typeof step.time === 'string' ? step.time : ''
        };
    }

    normalizeZoneSteps(zoneSteps = []) {
        if (!Array.isArray(zoneSteps)) {
            return [];
        }

        const normalized = zoneSteps
            .map(step => this.normalizeStep(step, { fixed: false }))
            .filter(step => step.name.length > 0)
            .map(step => ({ ...step, fixed: false }));

        this.reorderZonePositions(normalized);
        return normalized;
    }

    setStepsFromImport(importedSteps, options = {}) {
        const {
            persist = true,
            beforeSteps = null,
            afterSteps = null,
            parkingLot = null
        } = options;
        if (!Array.isArray(importedSteps)) {
            return false;
        }

        const normalized = importedSteps
            .map(step => this.normalizeStep(step))
            .filter(step => step.name.length > 0);

        const startName = "A developer commits code";
        const endName = "Deploy to production";

        let startStep = normalized.find(step => step.name === startName);
        let endStep = normalized.find(step => step.name === endName);

        if (!startStep) {
            startStep = {
                id: this.generateId(),
                name: startName,
                type: "Delivery step",
                description: '',
                manual: false,
                fixed: true,
                position: 0,
                time: ''
            };
        }

        if (!endStep) {
            endStep = {
                id: this.generateId(),
                name: endName,
                type: "Deploy step",
                description: '',
                manual: false,
                fixed: true,
                position: 0,
                time: ''
            };
        }

        startStep.type = startStep.type || "Delivery step";
        startStep.manual = false;
        startStep.fixed = true;
        startStep.description = typeof startStep.description === 'string' ? startStep.description : '';

        endStep.type = endStep.type || "Deploy step";
        endStep.manual = false;
        endStep.fixed = true;
        endStep.description = typeof endStep.description === 'string' ? endStep.description : '';

        const customSteps = normalized
            .filter(step => step.name !== startName && step.name !== endName)
            .map(step => ({
                ...step,
                fixed: false
            }));

        this.steps = [startStep, ...customSteps, endStep];
        this.reorderPositions();

        if (beforeSteps !== null) {
            this.beforeSteps = this.normalizeZoneSteps(beforeSteps);
        }

        if (afterSteps !== null) {
            this.afterSteps = this.normalizeZoneSteps(afterSteps);
        }

        if (parkingLot !== null) {
            this.parkingLot = this.normalizeZoneSteps(parkingLot);
        }

        if (persist) {
            this.saveToStorage();
        }
        return true;
    }

    loadFromStorage() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return false;

            const data = JSON.parse(raw);
            const steps = Array.isArray(data) ? data : data.steps;
            const beforeSteps = Array.isArray(data.beforeSteps) ? data.beforeSteps : null;
            const afterSteps = Array.isArray(data.afterSteps) ? data.afterSteps : null;
            const parkingLot = Array.isArray(data.parkingLot) ? data.parkingLot : null;
            
            // Load project name from storage
            const projectName = localStorage.getItem(this.projectNameKey);
            if (projectName) {
                this.projectName = projectName;
            }
            
            return this.setStepsFromImport(steps, {
                persist: false,
                beforeSteps,
                afterSteps,
                parkingLot
            });
        } catch (err) {
            console.warn('Failed to load steps from storage:', err);
            return false;
        }
    }

    saveToStorage() {
        try {
            const payload = {
                version: 1,
                savedAt: new Date().toISOString(),
                steps: this.getSteps(),
                beforeSteps: this.getZoneSteps('before'),
                afterSteps: this.getZoneSteps('after'),
                parkingLot: this.parkingLot
            };
            localStorage.setItem(this.storageKey, JSON.stringify(payload));
        } catch (err) {
            console.warn('Failed to save steps to storage:', err);
        }
    }

    setProjectName(name) {
        this.projectName = name;
        localStorage.setItem(this.projectNameKey, name);
    }

    getProjectName() {
        return this.projectName;
    }

    generateId() {
        return 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    addStep(name, type = '', manual = false, description = '', time = '', position = null) {
        const step = {
            id: this.generateId(),
            name: name,
            type: type,
            description: description,
            manual: manual,
            fixed: false,
            time: time,
            position: position !== null ? position : this.steps.length - 1
        };

        if (position !== null) {
            this.steps.splice(position, 0, step);
            this.reorderPositions();
        } else {
            // Add before the last step (Deploy to production)
            this.steps.splice(this.steps.length - 1, 0, step);
            this.reorderPositions();
        }

        this.saveToStorage();

        return step;
    }

    removeStep(stepId) {
        const sourceData = this.findStepInPipelineZones(stepId);
        if (!sourceData) return false;

        const { zone, index, step } = sourceData;
        if (step.fixed) return false;

        this.getZoneCollection(zone).splice(index, 1);
        if (zone === 'main') {
            this.reorderPositions();
        } else {
            this.reorderZonePositions(this.getZoneCollection(zone));
        }
        this.saveToStorage();
        return true;
    }

    updateStep(stepId, updates) {
        const sourceData = this.findStepInPipelineZones(stepId);
        const step = sourceData ? sourceData.step : this.parkingLot.find(s => s.id === stepId);
        if (!step) return false;

        // Allow updating certain fields, but protect fixed and id
        if (updates.name !== undefined && (!step.fixed || updates.name === step.name)) {
            step.name = updates.name;
        }
        if (updates.type !== undefined) step.type = updates.type;
        if (updates.description !== undefined) step.description = updates.description;
        if (updates.manual !== undefined && !step.fixed) step.manual = updates.manual;
        if (updates.time !== undefined) step.time = updates.time;

        this.saveToStorage();
        return true;
    }

    moveStep(stepId, newPosition) {
        const stepIndex = this.steps.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return false;

        const step = this.steps[stepIndex];
        if (step.fixed) return false;

        this.steps.splice(stepIndex, 1);
        const insertionIndex = this.clampMainInsertPosition(newPosition);
        this.steps.splice(insertionIndex, 0, step);
        this.reorderPositions();
        this.saveToStorage();
        return true;
    }

    getMainInsertBounds() {
        const firstFixedIndex = this.steps.findIndex(step => step.fixed);
        const reverseFixedIndex = [...this.steps].reverse().findIndex(step => step.fixed);
        const lastFixedIndex = reverseFixedIndex === -1 ? -1 : this.steps.length - 1 - reverseFixedIndex;

        let min = 0;
        let max = this.steps.length;

        if (firstFixedIndex !== -1) {
            min = firstFixedIndex + 1;
        }

        if (lastFixedIndex !== -1) {
            max = lastFixedIndex;
        }

        if (max < min) {
            max = min;
        }

        return { min, max };
    }

    clampMainInsertPosition(position) {
        const { min, max } = this.getMainInsertBounds();
        const candidate = Number.isInteger(position) ? position : max;
        return Math.min(Math.max(candidate, min), max);
    }

    reorderPositions() {
        this.reorderZonePositions(this.steps);
    }

    reorderZonePositions(zoneSteps) {
        zoneSteps.forEach((step, index) => {
            step.position = index;
        });
    }

    getSteps() {
        return [...this.steps];
    }

    parseTimeToHours(timeString) {
        if (!timeString || typeof timeString !== 'string') return 0;
        
        const trimmed = timeString.trim();
        if (!trimmed) return 0;
        
        // Parse as plain number (hours)
        const value = parseFloat(trimmed);
        if (isNaN(value) || value < 0) return 0;
        
        return value;
    }

    calculateLeadTime() {
        const startStep = this.steps.find(s => s.name === "A developer commits code");
        const endStep = this.steps.find(s => s.name === "Deploy to production");
        
        if (!startStep || !endStep) return { steps: 0, hours: 0 };
        
        const stepCount = endStep.position - startStep.position;
        
        // Calculate total time in hours from steps between start and end
        let totalHours = 0;
        const startPos = startStep.position;
        const endPos = endStep.position;
        
        for (let i = startPos + 1; i < endPos; i++) {
            const step = this.steps.find(s => s.position === i);
            if (step && step.time) {
                totalHours += this.parseTimeToHours(step.time);
            }
        }
        
        return { steps: stepCount, hours: totalHours };
    }



    moveToParking(stepId) {
        const sourceData = this.findStepInPipelineZones(stepId);
        if (!sourceData) return false;

        const { zone, index, step } = sourceData;
        if (step.fixed) return false; // Don't allow fixed steps to be parked

        // Remove from current pipeline zone and add to parking lot
        this.getZoneCollection(zone).splice(index, 1);
        this.parkingLot.push(step);
        this.reorderPositions();
        this.reorderZonePositions(this.beforeSteps);
        this.reorderZonePositions(this.afterSteps);
        this.reorderZonePositions(this.parkingLot);
        this.saveToStorage();
        return true;
    }

    moveFromParking(stepId, targetZone = 'main', position = null) {
        const stepIndex = this.parkingLot.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return false;

        const targetCollection = this.getZoneCollection(targetZone);
        if (!targetCollection) return false;

        const step = this.parkingLot[stepIndex];
        
        // Remove from parking lot and add to target zone
        this.parkingLot.splice(stepIndex, 1);

        if (targetZone === 'main') {
            const insertionIndex = this.clampMainInsertPosition(position);
            this.steps.splice(insertionIndex, 0, step);
            this.reorderPositions();
        } else {
            const insertionIndex = Number.isInteger(position)
                ? Math.min(Math.max(position, 0), targetCollection.length)
                : targetCollection.length;
            targetCollection.splice(insertionIndex, 0, step);
            this.reorderZonePositions(targetCollection);
        }

        this.reorderZonePositions(this.parkingLot);
        this.saveToStorage();
        return true;
    }

    moveStepInZone(stepId, zone, newPosition) {
        const zoneCollection = this.getZoneCollection(zone);
        if (!zoneCollection) return false;

        const stepIndex = zoneCollection.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return false;

        const [step] = zoneCollection.splice(stepIndex, 1);

        if (zone === 'main') {
            const insertionIndex = this.clampMainInsertPosition(newPosition);
            this.steps.splice(insertionIndex, 0, step);
            this.reorderPositions();
        } else {
            const insertionIndex = Number.isInteger(newPosition)
                ? Math.min(Math.max(newPosition, 0), zoneCollection.length)
                : zoneCollection.length;
            zoneCollection.splice(insertionIndex, 0, step);
            this.reorderZonePositions(zoneCollection);
        }

        this.saveToStorage();
        return true;
    }

    moveStepToZone(stepId, fromZone, toZone, newPosition = null) {
        const sourceCollection = this.getZoneCollection(fromZone);
        const targetCollection = this.getZoneCollection(toZone);
        if (!sourceCollection || !targetCollection) return false;

        const stepIndex = sourceCollection.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return false;

        const [step] = sourceCollection.splice(stepIndex, 1);

        if (toZone === 'main') {
            const insertionIndex = this.clampMainInsertPosition(newPosition);
            this.steps.splice(insertionIndex, 0, step);
            this.reorderPositions();
        } else {
            const insertionIndex = Number.isInteger(newPosition)
                ? Math.min(Math.max(newPosition, 0), targetCollection.length)
                : targetCollection.length;
            targetCollection.splice(insertionIndex, 0, step);
            this.reorderZonePositions(targetCollection);
        }

        if (fromZone === 'main') {
            this.reorderPositions();
        } else {
            this.reorderZonePositions(sourceCollection);
        }

        this.saveToStorage();
        return true;
    }

    getZoneCollection(zone) {
        if (zone === 'main') return this.steps;
        if (zone === 'before') return this.beforeSteps;
        if (zone === 'after') return this.afterSteps;
        if (zone === 'parking') return this.parkingLot;
        return null;
    }

    getZoneSteps(zone) {
        const collection = this.getZoneCollection(zone);
        return collection ? [...collection] : [];
    }

    findStepInPipelineZones(stepId) {
        const zones = ['main', 'before', 'after'];
        for (const zone of zones) {
            const collection = this.getZoneCollection(zone);
            const index = collection.findIndex(step => step.id === stepId);
            if (index !== -1) {
                return {
                    zone,
                    index,
                    step: collection[index]
                };
            }
        }

        return null;
    }

    removeFromParking(stepId) {
        const stepIndex = this.parkingLot.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return false;

        this.parkingLot.splice(stepIndex, 1);
        this.reorderZonePositions(this.parkingLot);
        this.saveToStorage();
        return true;
    }

    getParkingLot() {
        return [...this.parkingLot];
    }
}

// UI Controller
class PipelineUI {
    constructor(manager) {
        this.manager = manager;
        this.draggedElement = null;
        this.draggedStepId = null;
        this.dropZonesInitialized = false;
        this.initUI();
        this.attachEventListeners();
    }

    initUI() {
        // Restore project name from manager
        const projectName = this.manager.getProjectName();
        if (projectName) {
            document.getElementById('projectName').value = projectName;
        }
        this.renderPipeline();
        this.renderParkingLot();
        this.updateLeadTime();
    }

    attachEventListeners() {
        // Project name input
        document.getElementById('projectName').addEventListener('input', (e) => {
            this.manager.setProjectName(e.target.value);
        });

        document.getElementById('projectName').addEventListener('change', (e) => {
            this.manager.setProjectName(e.target.value);
        });

        document.getElementById('projectName').addEventListener('blur', (e) => {
            this.manager.setProjectName(e.target.value);
        });

        // Add step button
        document.getElementById('addStepBtn').addEventListener('click', () => {
            this.showAddStepModal();
        });

        // Clear button
        document.getElementById('clearBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the pipeline (except fixed steps)?')) {
                this.clearPipeline();
            }
        });

        // Import/Export buttons
        document.getElementById('importStepsBtn').addEventListener('click', () => {
            document.getElementById('importStepsInput').click();
        });

        document.getElementById('exportStepsBtn').addEventListener('click', () => {
            this.exportSteps();
        });

        document.getElementById('importStepsInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importSteps(file);
            }
            e.target.value = '';
        });



        // Modal close
        document.querySelector('.close').addEventListener('click', () => {
            this.hideAddStepModal();
        });

        // Add step form
        document.getElementById('addStepForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddStep();
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('addStepModal');
            if (e.target === modal) {
                this.hideAddStepModal();
            }
        });
    }

    renderPipeline() {
        const beforePipeline = document.querySelector('.step-list[data-zone="before"]');
        const mainPipeline = document.getElementById('mainPipeline');
        const afterPipeline = document.querySelector('.step-list[data-zone="after"]');

        beforePipeline.innerHTML = '';
        mainPipeline.innerHTML = '';
        afterPipeline.innerHTML = '';

        const beforeSteps = this.manager.getZoneSteps('before');
        beforeSteps.forEach(step => {
            const stepCard = this.createStepCard(step, 'before');
            beforePipeline.appendChild(stepCard);
        });

        const steps = this.manager.getSteps();
        steps.forEach(step => {
            const stepCard = this.createStepCard(step, 'main');
            mainPipeline.appendChild(stepCard);
        });

        const afterSteps = this.manager.getZoneSteps('after');
        afterSteps.forEach(step => {
            const stepCard = this.createStepCard(step, 'after');
            afterPipeline.appendChild(stepCard);
        });

        this.setupDropZones();
    }

    renderParkingLot() {
        const parkingLotZone = document.getElementById('parkingLotZone');
        parkingLotZone.innerHTML = '';

        const parkedSteps = this.manager.getParkingLot();
        parkedSteps.forEach(step => {
            const stepCard = this.createParkingLotCard(step);
            parkingLotZone.appendChild(stepCard);
        });
    }

    createParkingLotCard(step) {
        const card = document.createElement('div');
        card.className = 'parking-lot-card';
        card.draggable = true;
        card.dataset.stepId = step.id;
        card.dataset.source = 'parking';

        card.innerHTML = `
            <span class="parking-lot-step-name">${step.name}</span>
            <button class="parking-lot-remove" data-step-id="${step.id}" title="Remove permanently">×</button>
        `;

        // Attach drag handlers
        card.addEventListener('dragstart', (e) => this.handleParkingDragStart(e, step));
        card.addEventListener('dragend', (e) => this.handleDragEnd(e));

        // Remove button handler
        const removeBtn = card.querySelector('.parking-lot-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Remove "${step.name}" permanently?`)) {
                    this.manager.removeFromParking(step.id);
                    this.renderParkingLot();
                }
            });
        }

        return card;
    }

    handleParkingDragStart(e, step) {
        this.draggedElement = e.target;
        this.draggedStepId = step.id;
        this.draggedSource = 'parking';
        this.draggedSourceZone = null;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.innerHTML);
    }

    createStepCard(step, zone = 'main') {
        const card = document.createElement('div');
        card.className = 'step-card';
        card.draggable = !step.fixed;
        card.dataset.stepId = step.id;
        card.dataset.sourceZone = zone;

        if (step.fixed) {
            card.classList.add('fixed');
        }

        let html = `<div class="step-header">${step.name}</div>`;

        if (step.time) {
            html += `<div class="step-time">⏱️ ${step.time}</div>`;
        }

        if (step.description) {
            html += `<div class="step-description">${step.description}</div>`;
        }

        // Add tags
        const tags = [];
        if (step.type) tags.push(step.type);
        if (step.manual) tags.push('Manual step');

        if (tags.length > 0) {
            html += '<div class="step-tags">';
            tags.forEach(tag => {
                const tagClass = tag === 'Manual step' ? 'tag tag-manual' : 'tag';
                html += `<span class="${tagClass}">${tag}</span>`;
            });
            html += '</div>';
        }

        // Add actions for non-fixed steps
        if (!step.fixed) {
            html += `
                <div class="step-actions">
                    <button class="edit-btn" data-step-id="${step.id}">Edit</button>
                    <button class="remove-btn" data-step-id="${step.id}">Remove</button>
                </div>
            `;
        } else {
            // Fixed steps can still be edited (for time/description)
            html += `
                <div class="step-actions">
                    <button class="edit-btn" data-step-id="${step.id}">Edit</button>
                </div>
            `;
        }

        card.innerHTML = html;

        // Attach drag handlers
        if (!step.fixed) {
            card.addEventListener('dragstart', (e) => this.handleDragStart(e, step));
            card.addEventListener('dragend', (e) => this.handleDragEnd(e));

            // Remove button handler
            const removeBtn = card.querySelector('.remove-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => this.removeStep(step.id));
            }
        }

        // Edit button handler (available for all steps)
        const editBtn = card.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.showEditStepModal(step));
        }

        return card;
    }

    setupDropZones() {
        if (this.dropZonesInitialized) {
            return;
        }

        const zones = document.querySelectorAll('.step-list, .parking-lot-zone');
        
        zones.forEach(zone => {
            zone.addEventListener('dragover', (e) => this.handleDragOver(e));
            zone.addEventListener('drop', (e) => this.handleDrop(e));
            zone.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            zone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        });

        this.dropZonesInitialized = true;
    }

    handleDragStart(e, step) {
        this.draggedElement = e.target;
        this.draggedStepId = step.id;
        this.draggedSource = 'pipeline';
        this.draggedSourceZone = e.target.dataset.sourceZone || 'main';
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.innerHTML);
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.draggedElement = null;
        this.draggedStepId = null;
        this.draggedSource = null;
        this.draggedSourceZone = null;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    handleDragEnter(e) {
        if (e.target.classList.contains('step-list') || e.target.closest('.step-list')) {
            const zone = e.target.classList.contains('step-list') ? e.target : e.target.closest('.step-list');
            zone.parentElement.classList.add('drag-over');
        } else if (e.target.classList.contains('parking-lot-zone') || e.target.closest('.parking-lot-zone')) {
            const zone = e.target.classList.contains('parking-lot-zone') ? e.target : e.target.closest('.parking-lot-zone');
            zone.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        if (e.target.classList.contains('zone')) {
            e.target.classList.remove('drag-over');
        } else if (e.target.classList.contains('parking-lot-zone')) {
            e.target.classList.remove('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        // Remove drag-over class
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

        const zone = e.target.classList.contains('step-list') ? e.target : 
                     e.target.closest('.step-list') ? e.target.closest('.step-list') :
                     e.target.classList.contains('parking-lot-zone') ? e.target :
                     e.target.closest('.parking-lot-zone');
                     
        if (!zone) return;

        const zoneType = zone.dataset.zone;

        // Handle drop in parking lot
        if (zoneType === 'parking') {
            if (this.draggedStepId && this.draggedSource === 'pipeline') {
                this.manager.moveToParking(this.draggedStepId);
                this.renderPipeline();
                this.renderParkingLot();
                this.updateLeadTime();
            }
            return;
        }

        if (!['main', 'before', 'after'].includes(zoneType)) {
            return;
        }

        // Handle moving from parking lot to a pipeline zone
        if (this.draggedStepId && this.draggedSource === 'parking') {
            const newPosition = this.getDropPosition(e, zone);
            this.manager.moveFromParking(this.draggedStepId, zoneType, newPosition);
            this.renderPipeline();
            this.renderParkingLot();
            this.updateLeadTime();
            return;
        }

        // Moving existing step across pipeline zones
        if (this.draggedStepId && this.draggedSource === 'pipeline') {
            const newPosition = this.getDropPosition(e, zone);
            const sourceZone = this.draggedSourceZone || 'main';

            if (sourceZone === zoneType) {
                if (zoneType === 'main') {
                    this.manager.moveStep(this.draggedStepId, newPosition);
                } else {
                    this.manager.moveStepInZone(this.draggedStepId, zoneType, newPosition);
                }
            } else {
                this.manager.moveStepToZone(this.draggedStepId, sourceZone, zoneType, newPosition);
            }

            this.renderPipeline();
            this.updateLeadTime();
        }
    }

    getDropPosition(e, zone) {
        const cards = [...zone.querySelectorAll('.step-card:not(.dragging)')];
        const zoneType = zone.dataset.zone;
        const steps = this.manager.getZoneSteps(zoneType);

        // If no cards, drop at the beginning of this zone
        if (cards.length === 0) {
            return 0;
        }

        const mouseY = e.clientY;
        
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const rect = card.getBoundingClientRect();
            const cardMiddle = rect.top + rect.height / 2;

            if (mouseY < cardMiddle) {
                const stepId = card.dataset.stepId;
                const step = steps.find(s => s.id === stepId);
                return step ? step.position : i;
            }
        }

        // Drop at the end
        return steps.length;
    }

    removeStep(stepId) {
        if (this.manager.removeStep(stepId)) {
            this.renderPipeline();
            this.updateLeadTime();
        }
    }

    clearPipeline() {
        this.manager.init();
        this.renderPipeline();
        this.renderParkingLot();
        this.updateLeadTime();
        this.hideValidationMessages();
    }

    updateLeadTime() {
        const leadTime = this.manager.calculateLeadTime();
        const leadTimeElement = document.getElementById('leadTime');
        
        // Format step count
        const stepText = `${leadTime.steps} step${leadTime.steps !== 1 ? 's' : ''}`;
        
        // Format hours
        let hoursText = '';
        if (leadTime.hours > 0) {
            // Round to 2 decimal places
            const roundedHours = Math.round(leadTime.hours * 100) / 100;
            hoursText = ` (${roundedHours}h)`;
        }
        
        leadTimeElement.textContent = stepText + hoursText;
    }



    hideValidationMessages() {
        const validationDiv = document.getElementById('validationMessages');
        validationDiv.className = 'validation-messages';
        validationDiv.innerHTML = '';
    }

    showStatusMessage(message, type) {
        const validationDiv = document.getElementById('validationMessages');
        validationDiv.className = `validation-messages ${type}`.trim();
        validationDiv.innerHTML = message;
    }

    showAddStepModal() {
        const modal = document.getElementById('addStepModal');
        const form = document.getElementById('addStepForm');
        form.dataset.mode = 'add';
        delete form.dataset.editStepId;
        
        document.getElementById('modalTitle').textContent = 'Add Custom Step';
        document.getElementById('submitStepBtn').textContent = 'Add Step';
        document.getElementById('addStepForm').reset();
        
        modal.classList.add('show');
    }

    showEditStepModal(step) {
        const modal = document.getElementById('addStepModal');
        const form = document.getElementById('addStepForm');
        form.dataset.mode = 'edit';
        form.dataset.editStepId = step.id;
        
        document.getElementById('modalTitle').textContent = 'Edit Step';
        document.getElementById('submitStepBtn').textContent = 'Update Step';
        document.getElementById('stepName').value = step.name;
        document.getElementById('stepType').value = step.type || '';
        document.getElementById('stepTime').value = step.time || '';
        document.getElementById('stepDescription').value = step.description || '';
        document.getElementById('isManual').checked = step.manual;
        
        // Disable name editing for fixed steps
        if (step.fixed) {
            document.getElementById('stepName').disabled = true;
            document.getElementById('isManual').disabled = true;
        } else {
            document.getElementById('stepName').disabled = false;
            document.getElementById('isManual').disabled = false;
        }
        
        modal.classList.add('show');
    }

    hideAddStepModal() {
        const modal = document.getElementById('addStepModal');
        modal.classList.remove('show');
        const form = document.getElementById('addStepForm');
        form.reset();
        delete form.dataset.mode;
        delete form.dataset.editStepId;
        
        // Re-enable fields that might have been disabled
        document.getElementById('stepName').disabled = false;
        document.getElementById('isManual').disabled = false;
    }

    handleAddStep() {
        const form = document.getElementById('addStepForm');
        const mode = form.dataset.mode || 'add';
        const name = document.getElementById('stepName').value.trim();
        const type = document.getElementById('stepType').value;
        const manual = document.getElementById('isManual').checked;
        const description = document.getElementById('stepDescription').value.trim();
        const time = document.getElementById('stepTime').value.trim();

        if (!name) return;

        if (mode === 'edit') {
            const stepId = form.dataset.editStepId;
            if (stepId) {
                this.manager.updateStep(stepId, { name, type, manual, description, time });
                this.renderPipeline();
                this.updateLeadTime();
                this.hideAddStepModal();
            }
        } else {
            this.manager.addStep(name, type, manual, description, time);
            this.renderPipeline();
            this.updateLeadTime();
            this.hideAddStepModal();
        }
    }

    exportSteps() {
        // Ensure current project name input is saved before exporting
        const currentProjectName = document.getElementById('projectName').value;
        this.manager.setProjectName(currentProjectName);

        const payload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            projectName: this.manager.getProjectName(),
            steps: this.manager.getSteps(),
            beforeSteps: this.manager.getZoneSteps('before'),
            afterSteps: this.manager.getZoneSteps('after'),
            parkingLot: this.manager.getParkingLot()
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'pipeline-steps.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    importSteps(file) {
        const reader = new FileReader();

        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                const steps = Array.isArray(data) ? data : data.steps;
                const beforeSteps = Array.isArray(data.beforeSteps) ? data.beforeSteps : [];
                const afterSteps = Array.isArray(data.afterSteps) ? data.afterSteps : [];
                const parkingLot = Array.isArray(data.parkingLot) ? data.parkingLot : [];
                const projectName = data.projectName || '';

                if (!this.manager.setStepsFromImport(steps, { beforeSteps, afterSteps, parkingLot })) {
                    this.showStatusMessage('<strong>Import failed:</strong> Invalid steps file.', 'error');
                    return;
                }

                // Restore project name from imported file
                if (projectName) {
                    this.manager.setProjectName(projectName);
                    document.getElementById('projectName').value = projectName;
                }

                this.renderPipeline();
                this.renderParkingLot();
                this.updateLeadTime();
                this.showStatusMessage('<strong>✓ Import complete:</strong> Steps loaded successfully.', 'success');
            } catch (err) {
                console.error('Failed to import steps:', err);
                this.showStatusMessage('<strong>Import failed:</strong> Could not parse JSON file.', 'error');
            }
        };

        reader.onerror = () => {
            this.showStatusMessage('<strong>Import failed:</strong> Could not read the file.', 'error');
        };

        reader.readAsText(file);
    }
}

// Initialize the application
let pipelineManager, pipelineUI;

document.addEventListener('DOMContentLoaded', () => {
    pipelineManager = new PipelineManager();
    pipelineUI = new PipelineUI(pipelineManager);
});
