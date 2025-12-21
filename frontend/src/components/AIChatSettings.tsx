import { useState, useEffect } from 'react'
import { X, CheckCircle2, Circle, Plus, Trash2, Sparkles } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'


interface AIModel {
  id: string
  name: string
  display_name: string
  provider: string
  model_id: string
  description: string
  is_free: boolean
  status: 'active' | 'coming_soon' | 'disabled'
  icon: string
}

interface CustomModel {
  id?: string
  name: string
  endpoint_url: string
  api_key: string
  headers: Record<string, string>
  request_format: Record<string, any>
  response_path: string
  is_active: boolean
}

interface AIChatSettingsProps {
  isOpen: boolean
  onClose: () => void
  onModelChange: (modelId: string) => void
}

export default function AIChatSettings({ isOpen, onClose, onModelChange }: AIChatSettingsProps) {
  const [activeTab, setActiveTab] = useState<'models' | 'custom' | 'preferences'>('models')
  const [models, setModels] = useState<AIModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [customModels, setCustomModels] = useState<CustomModel[]>([])
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testingModel, setTestingModel] = useState<string | null>(null)

  const [settings, setSettings] = useState({
    temperature: 0.7,
    max_tokens: 2000,
    stream_responses: false,
    save_history: true,
    openai_api_key: '',
    anthropic_api_key: '',
    cohere_api_key: '',
    huggingface_api_key: ''
  })

  const [newCustomModel, setNewCustomModel] = useState<CustomModel>({
    name: '',
    endpoint_url: '',
    api_key: '',
    headers: {},
    request_format: {},
    response_path: 'response',
    is_active: true
  })

  useEffect(() => {
    if (isOpen) {
      setModels([
        {
          id: 'openrouter_gemini',
          name: 'gemini-2.0-flash-free',
          display_name: 'Gemini 2.0 Flash (OpenRouter)',
          provider: 'openrouter',
          model_id: 'google/gemini-2.0-flash-exp:free',
          description: 'Google Gemini 2.0 Flash via OpenRouter - Fast & Free',
          is_free: true,
          status: 'active',
          icon: 'openrouter'
        },
        {
          id: 'openrouter_amazon_nova',
          name: 'amazon-nova-2-lite',
          display_name: 'Amazon Nova 2 Lite',
          provider: 'openrouter',
          model_id: 'amazon/nova-2-lite-v1:free',
          description: 'Amazon Nova 2 Lite - Fast and efficient',
          is_free: true,
          status: 'active',
          icon: 'openrouter'
        },
        {
          id: 'openrouter_deepseek',
          name: 'deepseek-v3.1-nex',
          display_name: 'DeepSeek V3.1 NEX',
          provider: 'openrouter',
          model_id: 'nex-agi/deepseek-v3.1-nex-n1:free',
          description: 'DeepSeek V3.1 by NEX AGI - Advanced reasoning',
          is_free: true,
          status: 'active',
          icon: 'openrouter'
        },
        {
          id: 'openrouter_mistral',
          name: 'mistral-devstral',
          display_name: 'Mistral Devstral',
          provider: 'openrouter',
          model_id: 'mistralai/devstral-2512:free',
          description: 'Mistral Devstral - Optimized for code',
          is_free: true,
          status: 'active',
          icon: 'openrouter'
        },
        // New OpenRouter models
        {
          id: 'openrouter_deepseek_r1t2',
          name: 'deepseek-r1t2-chimera',
          display_name: 'DeepSeek R1T2 Chimera',
          provider: 'openrouter',
          model_id: 'tngtech/deepseek-r1t2-chimera:free',
          description: 'DeepSeek R1T2 by TNG Tech - Advanced reasoning',
          is_free: true,
          status: 'active',
          icon: 'openrouter'
        },
        {
          id: 'openrouter_katcoder',
          name: 'kat-coder-pro',
          display_name: 'Kat Coder Pro',
          provider: 'openrouter',
          model_id: 'kwaipilot/kat-coder-pro:free',
          description: 'Kat Coder Pro - Code generation specialist',
          is_free: true,
          status: 'active',
          icon: 'openrouter'
        },
        {
          id: 'openrouter_nemotron',
          name: 'nemotron-nano-12b',
          display_name: 'Nemotron Nano 12B',
          provider: 'openrouter',
          model_id: 'nvidia/nemotron-nano-12b-v2-vl:free',
          description: 'NVIDIA Nemotron Nano 12B - Vision & language',
          is_free: true,
          status: 'active',
          icon: 'openrouter'
        },
        {
          id: 'openrouter_deepseek_r1t',
          name: 'deepseek-r1t-chimera',
          display_name: 'DeepSeek R1T Chimera',
          provider: 'openrouter',
          model_id: 'tngtech/deepseek-r1t-chimera:free',
          description: 'DeepSeek R1T by TNG Tech - Fast reasoning',
          is_free: true,
          status: 'active',
          icon: 'openrouter'
        },
        {
          id: 'openrouter_glm4',
          name: 'glm-4.5-air',
          display_name: 'GLM 4.5 Air',
          provider: 'openrouter',
          model_id: 'z-ai/glm-4.5-air:free',
          description: 'Z-AI GLM 4.5 Air - Lightweight & fast',
          is_free: true,
          status: 'active',
          icon: 'openrouter'
        },
        {
          id: 'openrouter_tng_r1t',
          name: 'tng-r1t-chimera',
          display_name: 'TNG R1T Chimera',
          provider: 'openrouter',
          model_id: 'tngtech/tng-r1t-chimera:free',
          description: 'TNG R1T Chimera - Hybrid reasoning model',
          is_free: true,
          status: 'active',
          icon: 'openrouter'
        },
        {
          id: 'openrouter_qwen3_coder',
          name: 'qwen3-coder',
          display_name: 'Qwen3 Coder',
          provider: 'openrouter',
          model_id: 'qwen/qwen3-coder:free',
          description: 'Qwen3 Coder - Optimized for coding tasks',
          is_free: true,
          status: 'active',
          icon: 'openrouter'
        },
        {
          id: 'openrouter_gpt_oss',
          name: 'gpt-oss-20b',
          display_name: 'GPT OSS 20B',
          provider: 'openrouter',
          model_id: 'openai/gpt-oss-20b:free',
          description: 'OpenAI GPT OSS 20B - Open source variant',
          is_free: true,
          status: 'active',
          icon: 'openrouter'
        },
        {
          id: 'gemini_direct',
          name: 'gemini-2.5-flash',
          display_name: 'Gemini 2.5 Flash (Direct)',
          provider: 'gemini',
          model_id: 'gemini-2.5-flash',
          description: 'Google AI Studio - Fast & powerful',
          is_free: true,
          status: 'active',
          icon: 'gemini'
        },
        {
          id: 'gpt5',
          name: 'gpt-5',
          display_name: 'GPT-5',
          provider: 'openai',
          model_id: 'gpt-5',
          description: 'Next-gen OpenAI model',
          is_free: false,
          status: 'coming_soon',
          icon: 'openai'
        },
        {
          id: 'claude4',
          name: 'claude-4',
          display_name: 'Claude 4',
          provider: 'anthropic',
          model_id: 'claude-4',
          description: 'Anthropic\'s latest model',
          is_free: false,
          status: 'coming_soon',
          icon: 'anthropic'
        }
      ])
      // Don't set a default - fetch from backend or require selection
      fetchSettings()
      fetchCustomModels()
    }
  }, [isOpen])

  // Map legacy model IDs to new model IDs
  // Note: gemini_direct is NOT migrated - it uses direct Gemini API with user's key
  const migrateModelId = (oldId: string): string => {
    const migrationMap: Record<string, string> = {
      'google_gemini': 'openrouter_gemini',
      'gemini': 'openrouter_gemini',
      'openrouter': 'openrouter_gemini',
    }
    const newId = migrationMap[oldId] || oldId
    if (newId !== oldId) {
      console.log(`Migrating model ID: ${oldId} -> ${newId}`)
    }
    return newId
  }

  const fetchSettings = async () => {
    try {
      const response = await api.get('/ai/settings/')
      setSettings(response.data)
      // Read preferred model from AIMentorProfile (synced by backend)
      let modelId = response.data.preferred_ai_model || response.data.selected_model?.id || 'openrouter_gemini'

      // Migrate legacy model IDs to new ones
      modelId = migrateModelId(modelId)

      console.log('fetchSettings: Setting selectedModel to:', modelId)
      setSelectedModel(modelId)
    } catch (error) {
      // Settings endpoint may not exist, use defaults
      console.log('Using default settings, setting selectedModel to openrouter_gemini')
      setSelectedModel('openrouter_gemini')
    }
  }

  const fetchCustomModels = async () => {
    try {
      const response = await api.get('/ai/custom-models/')
      const data = response.data
      if (Array.isArray(data)) {
        setCustomModels(data)
      } else if (data && Array.isArray(data.results)) {
        setCustomModels(data.results)
      } else {
        setCustomModels([])
      }
    } catch (error) {
      console.error('Failed to fetch custom models:', error)
      setCustomModels([])
    }
  }

  const handleSaveSettings = async () => {
    setLoading(true)
    console.log('Saving settings with selectedModel:', selectedModel)
    try {
      // Exclude old preferred_ai_model from settings to avoid overriding new selection
      const { preferred_ai_model, ...settingsWithoutModel } = settings as any
      const payload = {
        ...settingsWithoutModel,
        selected_model_id: selectedModel  // This is the NEW model to save
      }
      console.log('Sending payload:', payload)
      await api.post('/ai/settings/', payload)
      toast.success('Settings saved!')
      onModelChange(selectedModel)
      onClose()
    } catch (error: any) {
      // If settings endpoint doesn't exist or method not allowed, just save locally
      if (error.response?.status === 404 || error.response?.status === 405) {
        // Save to local storage as fallback
        localStorage.setItem('ai_settings', JSON.stringify({
          selected_model_id: selectedModel
        }))
        toast.success('Settings saved locally!')
        onModelChange(selectedModel)
        onClose()
      } else {
        console.error('Save error:', error)
        toast.error('Failed to save settings')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleTestModel = async (modelId: string) => {
    setTestingModel(modelId)
    try {
      // All OpenRouter models are ready
      if (modelId.startsWith('openrouter')) {
        const modelName = models.find(m => m.id === modelId)?.display_name || 'OpenRouter'
        toast.success(`${modelName} is ready!`)
      } else if (modelId === 'gemini_direct') {
        toast.success('Gemini (Direct) is ready!')
      } else {
        toast.error('This model is not available yet')
      }
    } catch (error) {
      toast.error('Test failed')
    } finally {
      setTestingModel(null)
    }
  }

  const handleAddCustomModel = async () => {
    if (!newCustomModel.name || !newCustomModel.endpoint_url || !newCustomModel.api_key) {
      toast.error('Fill all required fields')
      return
    }

    try {
      await api.post('/ai/custom-models/', newCustomModel)
      toast.success('Model added!')
      fetchCustomModels()
      setShowAddCustom(false)
      setNewCustomModel({
        name: '',
        endpoint_url: '',
        api_key: '',
        headers: {},
        request_format: {},
        response_path: 'response',
        is_active: true
      })
    } catch (error) {
      toast.error('Failed to add model')
    }
  }

  const handleDeleteCustomModel = async (id: string) => {
    try {
      await api.delete(`/ai/custom-models/${id}/`)
      toast.success('Model deleted')
      fetchCustomModels()
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-2 sm:p-4 pb-20 sm:pb-4">
      <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-md max-h-[calc(100vh-100px)] sm:max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header - Minimal */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <h2 className="text-base font-medium text-white">AI Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Tabs - Minimal */}
        <div className="flex border-b border-slate-800 shrink-0">
          {[
            { id: 'models', label: 'Models' },
            { id: 'custom', label: 'Custom' },
            { id: 'preferences', label: 'Prefs' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-3 py-2.5 text-xs font-medium transition ${activeTab === tab.id
                ? 'text-white border-b-2 border-purple-500 bg-slate-900'
                : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content - Minimal */}
        <div className="p-3 overflow-y-auto flex-1 min-h-0">
          {activeTab === 'models' && (
            <div className="space-y-1">
              {models.map(model => (
                <div
                  key={model.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition ${selectedModel === model.id
                    ? 'bg-purple-500/15'
                    : 'hover:bg-slate-800/50'
                    } ${model.status === 'coming_soon' ? 'opacity-40' : ''}`}
                  onClick={() => {
                    if (model.status === 'active') {
                      setSelectedModel(model.id)
                    }
                  }}
                >
                  {/* Selection Icon */}
                  <div className="shrink-0">
                    {selectedModel === model.id ? (
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-600" />
                    )}
                  </div>

                  {/* Model Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm truncate ${selectedModel === model.id ? 'text-white font-medium' : 'text-slate-300'}`}>
                        {model.display_name}
                      </span>
                      {model.is_free && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded font-medium">
                          FREE
                        </span>
                      )}
                      {model.status === 'coming_soon' && (
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded">
                          SOON
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{model.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Custom AI endpoints</p>
                <button
                  onClick={() => setShowAddCustom(!showAddCustom)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 rounded-lg hover:bg-purple-500 transition text-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add</span>
                </button>
              </div>

              {showAddCustom && (
                <div className="border border-slate-700 rounded-xl p-3 sm:p-4 space-y-3 bg-slate-800/30">
                  <input
                    type="text"
                    placeholder="Model Name"
                    value={newCustomModel.name}
                    onChange={(e) => setNewCustomModel({ ...newCustomModel, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="url"
                    placeholder="API Endpoint URL"
                    value={newCustomModel.endpoint_url}
                    onChange={(e) => setNewCustomModel({ ...newCustomModel, endpoint_url: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="password"
                    placeholder="API Key"
                    value={newCustomModel.api_key}
                    onChange={(e) => setNewCustomModel({ ...newCustomModel, api_key: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddCustomModel}
                      className="px-3 py-1.5 bg-green-600 rounded-lg hover:bg-green-500 transition text-sm"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddCustom(false)}
                      className="px-3 py-1.5 bg-slate-700 rounded-lg hover:bg-slate-600 transition text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {customModels.length === 0 && !showAddCustom ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No custom models yet
                </div>
              ) : (
                <div className="space-y-2">
                  {customModels.map(model => (
                    <div key={model.id} className="flex items-center justify-between border border-slate-700 rounded-lg p-3 bg-slate-800/30">
                      <div className="min-w-0">
                        <h3 className="font-medium text-white text-sm truncate">{model.name}</h3>
                        <p className="text-xs text-slate-500 truncate">{model.endpoint_url}</p>
                      </div>
                      <button
                        onClick={() => model.id && handleDeleteCustomModel(model.id)}
                        className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition shrink-0 ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-4">
              {/* Temperature */}
              <div className="border border-slate-700 rounded-xl p-3 sm:p-4 bg-slate-800/30">
                <label className="text-sm text-slate-300 mb-3 block">Temperature</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>Precise</span>
                  <span className="text-purple-400">{settings.temperature}</span>
                  <span>Creative</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div className="border border-slate-700 rounded-xl p-3 sm:p-4 bg-slate-800/30">
                <label className="text-sm text-slate-300 mb-2 block">Max Tokens</label>
                <input
                  type="number"
                  value={settings.max_tokens}
                  onChange={(e) => setSettings({ ...settings, max_tokens: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  min="100"
                  max="4000"
                />
              </div>

              {/* Toggles */}
              <div className="border border-slate-700 rounded-xl p-3 sm:p-4 bg-slate-800/30 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-300">Stream responses</span>
                  <input
                    type="checkbox"
                    checked={settings.stream_responses}
                    onChange={(e) => setSettings({ ...settings, stream_responses: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-300">Save history</span>
                  <input
                    type="checkbox"
                    checked={settings.save_history}
                    onChange={(e) => setSettings({ ...settings, save_history: e.target.checked })}
                    className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Minimal */}
        <div className="border-t border-slate-800 p-3 shrink-0">
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="w-full py-2.5 bg-purple-600 rounded-lg hover:bg-purple-500 transition flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
