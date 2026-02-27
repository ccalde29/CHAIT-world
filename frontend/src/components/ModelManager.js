// ============================================================================
// CHAIT World — ModelManager
// Create, edit, and delete custom model presets stored in local SQLite.
// Used inside SettingsModal under the "Model Manager" tab.
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Sliders, ChevronDown, ChevronUp,
  Loader, AlertCircle, CheckCircle, X, Save, Cpu
} from 'lucide-react';
import { btn, card, input, text, badge } from '../styles/ui';

const PROVIDERS = [
  { value: 'openai',    label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google',    label: 'Google AI' },
  { value: 'openrouter',label: 'OpenRouter' },
  { value: 'ollama',    label: 'Ollama (local)' },
  { value: 'lmstudio',  label: 'LM Studio (local)' },
];

const EMPTY_FORM = {
  name: '',
  display_name: '',
  description: '',
  provider: 'openai',
  model_id: '',
  custom_system_prompt: '',
  temperature: 0.8,
  max_tokens: 500,
  top_p: null,
  frequency_penalty: null,
  presence_penalty: null,
  repetition_penalty: null,
  stop_sequences: null,
  tags: [],
};

// ── helpers ──────────────────────────────────────────────────────────────────

const slugify = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ============================================================================

const ModelManager = ({ apiRequest }) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // editing state
  const [editingId, setEditingId] = useState(null); // null = list, 'new' = create form, number = edit form
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // id to confirm deletion

  // model dropdown state
  const [modelOptions, setModelOptions] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [userSettings, setUserSettings] = useState(null);

  // ── data fetching ───────────────────────────────────────────────────────────

  const loadModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/api/custom-models');
      setModels(data.models || []);
    } catch (err) {
      setError('Failed to load custom models.');
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => { loadModels(); }, [loadModels]);

  // fetch model options whenever the provider changes (only when form is open)
  const fetchModels = useCallback(async (provider, settings) => {
    if (!provider) {
      setModelOptions([]);
      return;
    }
    setLoadingModels(true);
    setModelOptions([]);
    try {
      const keys = settings?.apiKeys || {};
      const apiKey =
        provider === 'openai'      ? keys.openai :
        provider === 'anthropic'   ? keys.anthropic :
        provider === 'openrouter'  ? keys.openrouter :
        provider === 'google'      ? keys.google :
        null;

      const data = await apiRequest('/api/providers/models', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          apiKey,
          ollamaSettings:   settings?.ollamaSettings,
          lmStudioSettings: settings?.lmStudioSettings,
        }),
      });
      setModelOptions(data.models || []);
    } catch {
      setModelOptions([]);
    } finally {
      setLoadingModels(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    if (editingId === null) return;
    // Load settings once when form opens (needed for API keys)
    apiRequest('/api/user/settings').then(data => {
      setUserSettings(data);
      fetchModels(form.provider, data);
    }).catch(() => {
      fetchModels(form.provider, null);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  useEffect(() => {
    if (editingId === null) return;
    fetchModels(form.provider, userSettings);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.provider]);

  // ── form helpers ────────────────────────────────────────────────────────────

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const openNew = () => {
    setForm({ ...EMPTY_FORM });
    setShowAdvanced(false);
    setEditingId('new');
    setError(null);
  };

  const openEdit = (model) => {
    setForm({
      name:                model.name            || '',
      display_name:        model.display_name    || '',
      description:         model.description     || '',
      provider:            model.provider        || 'openai',
      model_id:            model.model_id        || '',
      custom_system_prompt:model.custom_system_prompt || '',
      temperature:         model.temperature     ?? 0.8,
      max_tokens:          model.max_tokens      ?? 500,
      top_p:               model.top_p           ?? null,
      frequency_penalty:   model.frequency_penalty ?? null,
      presence_penalty:    model.presence_penalty  ?? null,
      repetition_penalty:  model.repetition_penalty ?? null,
      stop_sequences:      model.stop_sequences  ?? null,
      tags:                model.tags            ?? [],
    });
    setShowAdvanced(false);
    setEditingId(model.id);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleProviderChange = (provider) => {
    setForm(prev => ({ ...prev, provider, model_id: '' }));
  };

  // auto-slug the name field into `name` identifier
  const handleDisplayNameBlur = () => {
    if (!form.name && form.display_name) {
      setField('name', slugify(form.display_name));
    }
  };

  // ── save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.display_name.trim()) { setError('Display name is required.'); return; }
    if (!form.model_id.trim())     { setError('Model ID is required.'); return; }
    if (!form.provider)            { setError('Provider is required.'); return; }

    const payload = {
      ...form,
      name: form.name || slugify(form.display_name),
      tags: Array.isArray(form.tags) ? form.tags : [],
    };

    setSaving(true);
    setError(null);
    try {
      if (editingId === 'new') {
        await apiRequest('/api/custom-models', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showSuccess('Custom model created.');
      } else {
        await apiRequest(`/api/custom-models/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showSuccess('Custom model updated.');
      }
      cancelEdit();
      await loadModels();
    } catch (err) {
      setError(err.message || 'Failed to save model.');
    } finally {
      setSaving(false);
    }
  };

  // ── delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    try {
      await apiRequest(`/api/custom-models/${id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      showSuccess('Custom model deleted.');
      await loadModels();
    } catch (err) {
      setError('Failed to delete model.');
    }
  };

  // ── render list ─────────────────────────────────────────────────────────────

  const renderList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Save reusable model configurations — provider, model ID, temperature, and advanced parameters.
          Apply them to any character.
        </p>
        <button
          onClick={openNew}
          className={`flex items-center gap-2 text-sm shrink-0 ml-4 ${btn.primary}`}
        >
          <Plus size={16} />
          New Preset
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 py-6 justify-center">
          <Loader size={18} className="animate-spin" />
          <span className="text-sm">Loading presets…</span>
        </div>
      )}

      {!loading && models.length === 0 && (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
          <Cpu size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">No model presets yet</p>
          <p className="text-gray-600 text-xs mt-1">Create your first preset to get started.</p>
        </div>
      )}

      {!loading && models.length > 0 && (
        <div className="space-y-3">
          {models.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-4 ${card.hover}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white text-sm">{m.display_name || m.name}</span>
                  <span className={badge.accent}>
                    {PROVIDERS.find(p => p.value === m.provider)?.label ?? m.provider}
                  </span>
                  {m.tags?.length > 0 && m.tags.map(t => (
                    <span key={t} className={badge.base}>{t}</span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1 truncate">{m.model_id}</p>
                {m.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{m.description}</p>
                )}
                <p className="text-xs text-gray-600 mt-1">
                  temp {m.temperature ?? '—'}
                  {m.top_p        != null ? ` · top_p ${m.top_p}` : ''}
                  {m.max_tokens   != null ? ` · max ${m.max_tokens} tokens` : ''}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => openEdit(m)}
                  className={btn.icon}
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>
                {deleteConfirm === m.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="px-3 py-2 text-xs rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(m.id)}
                    className={btn.iconDanger}
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── render form ─────────────────────────────────────────────────────────────

  const renderForm = () => (
    <div className="space-y-5">
      {/* Back button + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={cancelEdit}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          title="Back to list"
        >
          <X size={16} />
        </button>
        <h4 className="text-base font-semibold text-white">
          {editingId === 'new' ? 'New Model Preset' : 'Edit Model Preset'}
        </h4>
      </div>

      {/* Display Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Display Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.display_name}
          onChange={e => setField('display_name', e.target.value)}
          onBlur={handleDisplayNameBlur}
          placeholder="e.g. GPT-4o Creative"
          className={input.base}
        />
      </div>

      {/* Identifier (slug) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Identifier (slug)
        </label>
        <input
          type="text"
          value={form.name}
          onChange={e => setField('name', slugify(e.target.value))}
          placeholder="auto-generated from display name"
          className={`${input.base} font-mono text-sm`}
        />
        <p className="text-xs text-gray-600 mt-1">Lowercase slug, auto-filled from display name.</p>
      </div>

      {/* Provider */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Provider <span className="text-red-400">*</span>
        </label>
        <select
          value={form.provider}
          onChange={e => handleProviderChange(e.target.value)}
          className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400"
        >
          {PROVIDERS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Model ID */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Model <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <select
            value={form.model_id}
            onChange={e => setField('model_id', e.target.value)}
            disabled={loadingModels}
            className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400 disabled:opacity-50"
          >
            <option value="">
              {loadingModels ? 'Loading models…' : 'Select a model…'}
            </option>
            {modelOptions.map(m => (
              <option key={m.id} value={m.id}>{m.name || m.id}</option>
            ))}
          </select>
          {loadingModels && (
            <Loader size={14} className="animate-spin text-gray-400 absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}
        </div>
        {!loadingModels && modelOptions.length === 0 && (
          <p className="text-xs text-yellow-500 mt-1">
            Could not load models — check your {PROVIDERS.find(p => p.value === form.provider)?.label} API key in the API Keys tab.
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
        <input
          type="text"
          value={form.description}
          onChange={e => setField('description', e.target.value)}
          placeholder="Short note about when to use this preset"
          className={input.base}
        />
      </div>

      {/* Custom System Prompt — moved here, right after Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          System Prompt <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <textarea
          value={form.custom_system_prompt}
          onChange={e => setField('custom_system_prompt', e.target.value)}
          placeholder="Override the default system prompt for characters using this preset…"
          rows={3}
          className={`${input.area} text-sm`}
        />
      </div>

      {/* Temperature */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Temperature: {form.temperature.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.05"
          value={form.temperature}
          onChange={e => setField('temperature', parseFloat(e.target.value))}
          className="w-full accent-red-500"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>Deterministic (0)</span><span>Creative (2)</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Max Tokens: {form.max_tokens}
        </label>
        <input
          type="range"
          min="50"
          max="4000"
          step="50"
          value={form.max_tokens}
          onChange={e => setField('max_tokens', parseInt(e.target.value))}
          className="w-full accent-red-500"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>Short (50)</span><span>Long (4000)</span>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Tags</label>
        <input
          type="text"
          value={Array.isArray(form.tags) ? form.tags.join(', ') : ''}
          onChange={e => setField('tags', e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : [])}
          placeholder="creative, fast, coding"
          className={input.base}
        />
        <p className="text-xs text-gray-600 mt-1">Comma-separated labels for your own organisation.</p>
      </div>

      {/* ── Advanced Model Parameters ─────────────────────────────────────── */}
      <div className="pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center justify-between w-full text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Sliders size={15} className="text-orange-400" />
            Advanced Model Parameters
            <span className="text-xs text-gray-500 font-normal">(optional)</span>
          </span>
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-5">
            <p className="text-xs text-gray-500">
              Leave a field at its reset state to use the provider's default. These values override global defaults for characters that use this preset.
            </p>

            {/* Top P */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Top P{form.top_p != null ? `: ${form.top_p.toFixed(2)}` : ' — provider default'}
              </label>
              <p className="text-xs text-gray-500 mb-2">Nucleus sampling threshold. Supported by all providers.</p>
              <div className="flex items-center gap-3">
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={form.top_p ?? 1.0}
                  onChange={e => setField('top_p', parseFloat(e.target.value))}
                  className="flex-1 accent-red-500"
                />
                <button type="button" onClick={() => setField('top_p', null)}
                  className="text-xs text-gray-500 hover:text-orange-400 transition-colors whitespace-nowrap">
                  Reset
                </button>
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Narrow (0.0)</span><span>Full (1.0)</span>
              </div>
            </div>

            {/* Frequency Penalty */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Frequency Penalty{form.frequency_penalty != null ? `: ${form.frequency_penalty.toFixed(2)}` : ' — provider default'}
              </label>
              <p className="text-xs text-gray-500 mb-2">Reduces token repetition by frequency. OpenAI, OpenRouter, LM Studio.</p>
              <div className="flex items-center gap-3">
                <input
                  type="range" min="-2" max="2" step="0.05"
                  value={form.frequency_penalty ?? 0}
                  onChange={e => setField('frequency_penalty', parseFloat(e.target.value))}
                  className="flex-1 accent-red-500"
                />
                <button type="button" onClick={() => setField('frequency_penalty', null)}
                  className="text-xs text-gray-500 hover:text-orange-400 transition-colors whitespace-nowrap">
                  Reset
                </button>
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>More repetition (-2)</span><span>Less repetition (+2)</span>
              </div>
            </div>

            {/* Presence Penalty */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Presence Penalty{form.presence_penalty != null ? `: ${form.presence_penalty.toFixed(2)}` : ' — provider default'}
              </label>
              <p className="text-xs text-gray-500 mb-2">Encourages new topics by penalising any prior token. OpenAI, OpenRouter, LM Studio.</p>
              <div className="flex items-center gap-3">
                <input
                  type="range" min="-2" max="2" step="0.05"
                  value={form.presence_penalty ?? 0}
                  onChange={e => setField('presence_penalty', parseFloat(e.target.value))}
                  className="flex-1 accent-red-500"
                />
                <button type="button" onClick={() => setField('presence_penalty', null)}
                  className="text-xs text-gray-500 hover:text-orange-400 transition-colors whitespace-nowrap">
                  Reset
                </button>
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Stay on topic (-2)</span><span>Explore more (+2)</span>
              </div>
            </div>

            {/* Repetition Penalty */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Repetition Penalty{form.repetition_penalty != null ? `: ${form.repetition_penalty.toFixed(2)}` : ' — provider default'}
              </label>
              <p className="text-xs text-gray-500 mb-2">Penalises recently-used tokens. Values &gt; 1 reduce repetition. Ollama, OpenRouter.</p>
              <div className="flex items-center gap-3">
                <input
                  type="range" min="0.5" max="2" step="0.05"
                  value={form.repetition_penalty ?? 1.0}
                  onChange={e => setField('repetition_penalty', parseFloat(e.target.value))}
                  className="flex-1 accent-red-500"
                />
                <button type="button" onClick={() => setField('repetition_penalty', null)}
                  className="text-xs text-gray-500 hover:text-orange-400 transition-colors whitespace-nowrap">
                  Reset
                </button>
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Allow repeats (0.5)</span><span>Strongly avoid (2.0)</span>
              </div>
            </div>

            {/* Stop Sequences */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Stop Sequences</label>
              <p className="text-xs text-gray-500 mb-2">
                Comma-separated strings that stop generation when encountered. Supported by all providers.
              </p>
              <input
                type="text"
                placeholder="e.g.  [END], ###, User:"
                value={Array.isArray(form.stop_sequences) ? form.stop_sequences.join(', ') : (form.stop_sequences || '')}
                onChange={e => {
                  const raw = e.target.value;
                  const parsed = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : null;
                  setField('stop_sequences', parsed?.length ? parsed : null);
                }}
                className={input.base}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Save / Cancel ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
        <button
          onClick={cancelEdit}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 text-sm ${btn.primary}`}
        >
          {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save Preset'}
        </button>
      </div>
    </div>
  );

  // ── main render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Inline feedback banners */}
      {success && (
        <div className={`mb-4 ${card.success} flex items-center gap-2 text-sm`}>
          <CheckCircle size={15} className={text.success} />
          <span className={text.success}>{success}</span>
        </div>
      )}
      {error && (
        <div className={`mb-4 ${card.error} flex items-center gap-2 text-sm`}>
          <AlertCircle size={15} className={text.warn} />
          <span className={text.warn}>{error}</span>
        </div>
      )}

      {editingId !== null ? renderForm() : renderList()}
    </div>
  );
};

export default ModelManager;
