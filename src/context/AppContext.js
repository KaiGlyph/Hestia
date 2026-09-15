// src/context/AppContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '../utils/storage';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [manualShoppingItems, setManualShoppingItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const [t, i, r, s] = await Promise.all([
      storage.loadTasks(),
      storage.loadInventory(),
      storage.loadRecipes(),
      storage.loadShopping(),
    ]);
    setTasks(t);
    setInventory(i);
    setRecipes(r);
    // Solo cargar items manuales de la lista de la compra
    setManualShoppingItems(s.filter(item => item.manual));
    setLoading(false);
  }

  // ---------- TAREAS ----------
  function addTask(task) {
    const newTasks = [...tasks, { ...task, id: Date.now(), done: false }];
    setTasks(newTasks);
    storage.saveTasks(newTasks);
  }

  function toggleTask(id) {
    const newTasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(newTasks);
    storage.saveTasks(newTasks);
  }

  function deleteTask(id) {
    const newTasks = tasks.filter(t => t.id !== id);
    setTasks(newTasks);
    storage.saveTasks(newTasks);
  }

  // ---------- INVENTARIO ----------
  function addProduct(product) {
    setInventory(prev => {
      const newInventory = [...prev, { ...product, id: Date.now() }];
      storage.saveInventory(newInventory);
      return newInventory;
    });
  }

  function adjustQuantity(id, delta) {
    const newInventory = inventory.map(p =>
      p.id === id ? { ...p, quantity: Math.max(0, p.quantity + delta) } : p
    );
    setInventory(newInventory);
    storage.saveInventory(newInventory);
  }

  function deleteProduct(id) {
    const newInventory = inventory.filter(p => p.id !== id);
    setInventory(newInventory);
    storage.saveInventory(newInventory);
  }

    function updateQuantity(id, newQuantity) {
    setInventory(prev => {
      const updated = prev.map(p =>
        p.id === id ? { ...p, quantity: Math.max(0, parseFloat(newQuantity) || 0) } : p
      );
      storage.saveInventory(updated);
      return updated;
    });
  }

  // ---------- RECETAS ----------
  function addRecipe(recipe) {
    const newRecipes = [...recipes, { ...recipe, id: Date.now() }];
    setRecipes(newRecipes);
    storage.saveRecipes(newRecipes);
  }

  function deleteRecipe(id) {
    const newRecipes = recipes.filter(r => r.id !== id);
    setRecipes(newRecipes);
    storage.saveRecipes(newRecipes);
  }

  function cookRecipe(recipeId) {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return { success: false, message: 'Receta no encontrada' };

    const missing = [];
    recipe.ingredients.forEach(ing => {
      const product = inventory.find(p =>
        p.name.toLowerCase() === ing.name.toLowerCase()
      );
      if (!product || product.quantity < ing.quantity) {
        missing.push(ing.name);
      }
    });

    if (missing.length > 0) {
      return { success: false, message: 'Faltan: ' + missing.join(', ') };
    }

    const deducted = [];
    const newInventory = inventory.map(p => {
      const used = recipe.ingredients.find(
        ing => ing.name.toLowerCase() === p.name.toLowerCase()
      );
      if (used) {
        deducted.push(used.quantity + ' ' + used.unit + ' de ' + used.name);
        return { ...p, quantity: p.quantity - used.quantity };
      }
      return p;
    });

    setInventory(newInventory);
    storage.saveInventory(newInventory);

    return { success: true, deducted, recipeName: recipe.name };
  }

  // ---------- LISTA DE LA COMPRA ----------
  // La lista se calcula automáticamente desde el inventario + items manuales
    function getShoppingList() {
    const lowStock = inventory
      .filter(p => p.quantity <= p.threshold)
      .map(p => ({ id: p.id, name: p.name, manual: false, unit: p.unit, threshold: p.threshold }));
    return [...lowStock, ...manualShoppingItems];
  }

  function markAsBought(id, isManual) {
    if (isManual) {
      const newManual = manualShoppingItems.filter(item => item.id !== id);
      setManualShoppingItems(newManual);
      storage.saveShopping(newManual);
    } else {
      // Reponer stock del producto
      const newInventory = inventory.map(p =>
        p.id === id ? { ...p, quantity: p.quantity + 5 } : p
      );
      setInventory(newInventory);
      storage.saveInventory(newInventory);
    }
  }

  function addManualShoppingItem(name) {
    const newManual = [...manualShoppingItems, { id: Date.now(), name, manual: true }];
    setManualShoppingItems(newManual);
    storage.saveShopping(newManual);
  }

  function removeManualShoppingItem(id) {
    const newManual = manualShoppingItems.filter(item => item.id !== id);
    setManualShoppingItems(newManual);
    storage.saveShopping(newManual);
  }

  const value = {
    loading,
    tasks, addTask, toggleTask, deleteTask,
    inventory, addProduct, adjustQuantity, updateQuantity, deleteProduct,
    recipes, addRecipe, deleteRecipe, cookRecipe,
    getShoppingList, markAsBought, addManualShoppingItem, removeManualShoppingItem,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider');
  return ctx;
}