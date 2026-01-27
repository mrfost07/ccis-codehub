// Frontend: Settings Service
// src/services/settingsService.ts

import api from './api';

interface AppFeatures {
    ai_mentor: boolean;
    code_editor: boolean;
    competitions: boolean;
    projects: boolean;
    community: boolean;
    learning_paths: boolean;
    analytics: boolean;
    user_delete: boolean;
}

interface SettingsResponse {
    success: boolean;
    features: AppFeatures;
}

class SettingsService {
    private static instance: SettingsService;
    private features: AppFeatures | null = null;
    private fetchPromise: Promise<AppFeatures> | null = null;

    private constructor() { }

    static getInstance(): SettingsService {
        if (!SettingsService.instance) {
            SettingsService.instance = new SettingsService();
        }
        return SettingsService.instance;
    }

    /**
     * Fetch app settings from backend
     * Only fetches once per session (cached)
     */
    async getFeatures(): Promise<AppFeatures> {
        // Return cached if available
        if (this.features) {
            return this.features;
        }

        // Return existing promise if already fetching
        if (this.fetchPromise) {
            return this.fetchPromise;
        }

        // Fetch from backend
        this.fetchPromise = api
            .get<SettingsResponse>('/api/settings/')
            .then((response) => {
                this.features = response.data.features;
                this.fetchPromise = null;
                return this.features;
            })
            .catch((error) => {
                console.error('Failed to fetch app settings:', error);
                this.fetchPromise = null;
                // Return safe defaults on error
                return {
                    ai_mentor: true,
                    code_editor: true,
                    competitions: true,
                    projects: true,
                    community: true,
                    learning_paths: true,
                    analytics: false,
                    user_delete: false,
                };
            });

        return this.fetchPromise;
    }

    /**
     * Check if a specific feature is enabled
     */
    async isFeatureEnabled(featureName: keyof AppFeatures): Promise<boolean> {
        const features = await this.getFeatures();
        return features[featureName] ?? false;
    }

    /**
     * Clear cached settings (call after login/logout)
     */
    clearCache(): void {
        this.features = null;
        this.fetchPromise = null;
    }

    /**
     * Refresh settings from backend
     */
    async refresh(): Promise<AppFeatures> {
        this.clearCache();
        return this.getFeatures();
    }
}

export default SettingsService.getInstance();
export type { AppFeatures };
