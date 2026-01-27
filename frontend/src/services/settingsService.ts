/**
 * Settings Service
 *  
 * Adds cache clearing method to support feature flag updates
 */
import api from './api'

interface AppSettings {
    success: boolean
    features: {
        user_delete?: boolean
        analytics?: boolean
        ai_mentor?: boolean
        code_editor?: boolean
        competitions?: boolean
        projects?: boolean
        community?: boolean
        learning_paths?: boolean
    }
}

class SettingsService {
    private cache: AppSettings | null = null

    /**
     * Fetch app settings from API
     */
    async fetchSettings(): Promise<AppSettings> {
        // Check session storage first
        const cachedSettings = sessionStorage.getItem('appSettings')
        if (cachedSettings) {
            this.cache = JSON.parse(cachedSettings)
            return this.cache
        }

        // Fetch from API
        const response = await api.get('/settings/')
        const settings: AppSettings = response.data

        // Cache in session storage
        sessionStorage.setItem('appSettings', JSON.stringify(settings))
        this.cache = settings

        return settings
    }

    /**
     * Check if a feature is enabled
     */
    async isFeatureEnabled(feature: string, defaultValue: boolean = false): Promise<boolean> {
        try {
            const settings = await this.fetchSettings()
            return settings.features && settings.features.hasOwnProperty(feature)
                ? settings.features[feature as keyof typeof settings.features] || false
                : defaultValue
        } catch (error) {
            console.error('Failed to fetch app settings:', error)
            return defaultValue
        }
    }

    /**
     * Clear settings cache
     * Call this after updating settings to force a refresh
     */
    clearCache(): void {
        sessionStorage.removeItem('appSettings')
        this.cache = null
    }

    /**
     * Get all features
     */
    async getAllFeatures() {
        const settings = await this.fetchSettings()
        return settings.features || {}
    }
}

export default new SettingsService()
