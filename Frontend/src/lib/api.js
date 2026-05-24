import { getApiUrl } from "./apiConfig";

class KundliAPI {
    baseUrl = getApiUrl("/api/kundli");
    async generateKundli(formData) {
        const response = await fetch(`${this.baseUrl}/generate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to generate Kundli");
        }
        return response.json();
    }
    async getKundli(id) {
        const response = await fetch(`${this.baseUrl}/${id}`);
        if (!response.ok) {
            throw new Error("Failed to fetch Kundli");
        }
        return response.json();
    }
    async getUserKundlis() {
        const response = await fetch(`${this.baseUrl}/user`);
        if (!response.ok) {
            throw new Error("Failed to fetch user Kundlis");
        }
        return response.json();
    }
}
export const kundliAPI = new KundliAPI();
