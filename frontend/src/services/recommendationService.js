// services/recommendationService.js

import API from "../api"; // utilise ton instance existante

// 🔹 Lancer recommandation IA
export const runRecommendation = async (activityId) => {
  try {
    const response = await API.post(`/recommendations/${activityId}`);
    return response.data;
  } catch (error) {
    console.error("Erreur runRecommendation:", error);
    throw error;
  }
};

// 🔹 Récupérer recommandations
export const getRecommendations = async (activityId) => {
  try {
    const response = await API.get(`/recommendations/${activityId}`);
    return response.data;
  } catch (error) {
    console.error("Erreur getRecommendations:", error);
    throw error;
  }
};

// 🔹 Mettre à jour liste (HR modifie)
export const updateRecommendations = async (activityId, employees) => {
  try {
    const response = await API.put(`/recommendations/${activityId}`, {
      employees,
    });
    return response.data;
  } catch (error) {
    console.error("Erreur updateRecommendations:", error);
    throw error;
  }
};