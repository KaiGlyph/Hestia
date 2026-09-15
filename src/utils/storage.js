// src/utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TASKS: '@boo_tasks',
  INVENTORY: '@boo_inventory',
  RECIPES: '@boo_recipes',
  SHOPPING: '@boo_shopping',
};

export const storage = {
  // Tareas
  async loadTasks() {
    try {
      const data = await AsyncStorage.getItem(KEYS.TASKS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error cargando tareas:', e);
      return [];
    }
  },
  async saveTasks(tasks) {
    try {
      await AsyncStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error('Error guardando tareas:', e);
    }
  },

  // Inventario
  async loadInventory() {
    try {
      const data = await AsyncStorage.getItem(KEYS.INVENTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error cargando inventario:', e);
      return [];
    }
  },
  async saveInventory(inventory) {
    try {
      await AsyncStorage.setItem(KEYS.INVENTORY, JSON.stringify(inventory));
    } catch (e) {
      console.error('Error guardando inventario:', e);
    }
  },

  // Recetas
  async loadRecipes() {
    try {
      const data = await AsyncStorage.getItem(KEYS.RECIPES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error cargando recetas:', e);
      return [];
    }
  },
  async saveRecipes(recipes) {
    try {
      await AsyncStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes));
    } catch (e) {
      console.error('Error guardando recetas:', e);
    }
  },

  // Lista de la compra
  async loadShopping() {
    try {
      const data = await AsyncStorage.getItem(KEYS.SHOPPING);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error cargando lista de compra:', e);
      return [];
    }
  },
  async saveShopping(shopping) {
    try {
      await AsyncStorage.setItem(KEYS.SHOPPING, JSON.stringify(shopping));
    } catch (e) {
      console.error('Error guardando lista de compra:', e);
    }
  },
};