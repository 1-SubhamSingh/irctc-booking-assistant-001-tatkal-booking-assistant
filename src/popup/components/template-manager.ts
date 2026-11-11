// Booking template save/load/delete logic with encrypted storage

import { sendMessageToBackground } from '../../shared/messaging';
import { getJourneyData, setJourneyData } from './journey-form';
import { getPassengers, setPassengers, validateAllPassengers } from './passenger-form';
import type { BookingTemplate } from '../../shared/types';

let templates: BookingTemplate[] = [];
let selectedTemplateId: string | null = null;
let editingTemplateId: string | null = null;

export async function initTemplateManager(masterPassword: string): Promise<void> {
  await loadTemplates();
  renderTemplateList();

  document.getElementById('new-template-btn')?.addEventListener('click', showTemplateForm);
  document.getElementById('save-template-btn')?.addEventListener('click', handleSaveTemplate);
  document.getElementById('cancel-template-btn')?.addEventListener('click', hideTemplateForm);
}

async function loadTemplates(): Promise<void> {
  const stored = await new Promise<BookingTemplate[]>((resolve) => {
    chrome.storage.local.get(['templates', 'settings'], (result) => {
      if (result.settings?.activeTemplateId) {
        selectedTemplateId = result.settings.activeTemplateId;
      }
      resolve(result.templates ?? []);
    });
  });
  templates = stored;
  if (!selectedTemplateId && templates.length > 0) {
    selectedTemplateId = templates[0].id;
  }
}

function renderTemplateList(): void {
  const container = document.getElementById('template-list')!;
  const armSection = document.getElementById('arm-section')!;

  if (templates.length === 0) {
    container.innerHTML = '<p class="empty-state">No templates saved yet. Click <strong>+ New Template</strong> below to create your booking template.</p>';
    armSection.classList.add('hidden');
    return;
  }

  // Ensure a template is selected by default if available
  if (!selectedTemplateId || !templates.some((t) => t.id === selectedTemplateId)) {
    selectedTemplateId = templates[0].id;
  }

  container.innerHTML = templates.map((t) => {
    const isSelected = selectedTemplateId === t.id;
    return `
    <div class="template-card ${isSelected ? 'selected' : ''}" data-id="${t.id}">
      <div class="template-info">
        <strong>${escapeHtml(t.name)} ${isSelected ? '<span class="selected-badge">✓ ACTIVE</span>' : ''}</strong>
        <span class="template-detail">${t.journey.sourceStation} → ${t.journey.destinationStation}</span>
        <span class="template-detail">Train: ${t.journey.trainNumber} | Class: ${t.journey.classType} | Quota: ${t.journey.quotaType} | ${t.passengers.length} pax</span>
      </div>
      <div class="template-actions">
        <button class="btn-sm btn-edit" data-id="${t.id}">Edit</button>
        <button class="btn-sm btn-delete" data-id="${t.id}">Delete</button>
        <button class="btn-sm btn-select ${isSelected ? 'btn-selected' : ''}" data-id="${t.id}">
          ${isSelected ? 'Selected' : 'Select'}
        </button>
      </div>
    </div>
  `;
  }).join('');

  // Attach event listeners
  container.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      editTemplate((btn as HTMLElement).dataset.id!);
    });
  });
  container.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTemplate((btn as HTMLElement).dataset.id!);
    });
  });
  container.querySelectorAll('.btn-select').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectTemplate((btn as HTMLElement).dataset.id!);
    });
  });
  container.querySelectorAll('.template-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.template-actions')) return;
      selectTemplate((card as HTMLElement).dataset.id!);
    });
  });

  // Always show armSection when templates exist
  armSection.classList.remove('hidden');
}

function showTemplateForm(): void {
  document.getElementById('template-form')!.classList.remove('hidden');
  document.getElementById('new-template-btn')!.classList.add('hidden');
}

function hideTemplateForm(): void {
  editingTemplateId = null;
  document.getElementById('template-form')!.classList.add('hidden');
  document.getElementById('new-template-btn')!.classList.remove('hidden');
}

async function handleSaveTemplate(): Promise<void> {
  const name = (document.getElementById('template-name') as HTMLInputElement).value.trim();
  if (!name) {
    alert('Please enter a template name');
    return;
  }

  const validation = validateAllPassengers();
  if (!validation.valid) {
    alert('Passenger errors:\n' + validation.errors.join('\n'));
    return;
  }

  const journey = getJourneyData();
  const passengers = getPassengers();

  if (!journey.sourceStation || !journey.destinationStation || !journey.journeyDate || !journey.trainNumber) {
    alert('Please fill all journey details');
    return;
  }

  const templateId = editingTemplateId || crypto.randomUUID();
  const template: BookingTemplate = {
    id: templateId,
    name,
    journey,
    passengers,
    createdAt: new Date().toISOString(),
  };

  const response = await sendMessageToBackground({
    type: 'SAVE_TEMPLATE',
    payload: { template },
  });

  if (response.success) {
    const existingIdx = templates.findIndex((t) => t.id === template.id);
    if (existingIdx >= 0) {
      templates[existingIdx] = template;
    } else {
      templates.push(template);
    }
    selectedTemplateId = template.id;
    hideTemplateForm();
    renderTemplateList();
  } else {
    alert(`Error saving template: ${response.error}`);
  }
}

function editTemplate(id: string): void {
  const template = templates.find((t) => t.id === id);
  if (!template) return;

  editingTemplateId = id;
  showTemplateForm();
  (document.getElementById('template-name') as HTMLInputElement).value = template.name;
  setJourneyData(template.journey);
  setPassengers(template.passengers);
}

async function deleteTemplate(id: string): Promise<void> {
  if (!confirm('Delete this template?')) return;

  await new Promise<void>((resolve) => {
    chrome.storage.local.get('templates', (result) => {
      const updated = (result.templates ?? []).filter((t: BookingTemplate) => t.id !== id);
      chrome.storage.local.set({ templates: updated }, resolve);
    });
  });

  templates = templates.filter((t) => t.id !== id);
  if (selectedTemplateId === id) selectedTemplateId = null;
  renderTemplateList();
}

function selectTemplate(id: string): void {
  selectedTemplateId = id;
  renderTemplateList();
}

export function getSelectedTemplateId(): string | null {
  return selectedTemplateId;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
