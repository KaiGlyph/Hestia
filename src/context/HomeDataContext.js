// src/context/HomeDataContext.js
import {
  addDoc,
  collection,
  deleteDoc, doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc
} from 'firebase/firestore';
import React, { createContext, useContext, useState } from 'react';
import { db } from '../utils/firebase';

const HomeDataContext = createContext();

export function HomeDataProvider({ children, homeId }) {
  const [inventory, setInventory] = useState([]);
  const [manualShoppingItems, setManualShoppingItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- INVENTARIO: Escucha en tiempo real ---
  React.useEffect(() => {
    if (!homeId) {
      setInventory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const inventoryRef = collection(db, 'homes', homeId, 'inventory');
    const q = query(inventoryRef, orderBy('name'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('📦 Inventario actualizado:', items.length, 'productos');
      setInventory(items);
      setLoading(false);
    }, (error) => {
      console.error("Error escuchando inventario:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [homeId]);

  // --- ITEMS MANUALES DE COMPRA: Escucha en tiempo real ---
  React.useEffect(() => {
    if (!homeId) {
      setManualShoppingItems([]);
      return;
    }

    const shoppingRef = collection(db, 'homes', homeId, 'shopping');
    const unsubscribe = onSnapshot(shoppingRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('🛒 Items manuales actualizados:', items.length);
      setManualShoppingItems(items);
    }, (error) => {
      console.error("Error escuchando lista de compra:", error);
    });

    return () => unsubscribe();
  }, [homeId]);

  // --- LISTA DE COMPRA COMBINADA (stock bajo + manuales) ---
  const shoppingList = React.useMemo(() => {
    // Productos con stock bajo del inventario
    const lowStockItems = inventory
      .filter(p => p.quantity <= p.threshold)
      .map(p => ({
        id: `inv-${p.id}`,
        name: p.name,
        unit: p.unit,
        manual: false,
        currentQuantity: p.quantity,
        threshold: p.threshold
      }));

    // Items manuales
    const manualItems = manualShoppingItems.map(item => ({
      ...item,
      manual: true
    }));

    // Combinar y ordenar alfabéticamente
    const combined = [...lowStockItems, ...manualItems].sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    console.log('📋 Lista de compra generada:', combined.length, 'items');
    console.log('Items:', combined.map(i => `${i.name} (${i.manual ? 'manual' : 'stock bajo'})`));

    return combined;
  }, [inventory, manualShoppingItems]);

  // --- FUNCIONES DE INVENTARIO ---
  const addProduct = async (product) => {
    try {
      const docRef = await addDoc(collection(db, 'homes', homeId, 'inventory'), {
        ...product,
        createdAt: new Date()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    try {
      await updateDoc(doc(db, 'homes', homeId, 'inventory', productId), {
        quantity: Math.max(0, parseFloat(newQuantity) || 0)
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteProduct = async (productId) => {
    try {
      await deleteDoc(doc(db, 'homes', homeId, 'inventory', productId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // --- FUNCIONES DE LISTA DE COMPRA ---
  const addManualShoppingItem = async (name) => {
    try {
      await addDoc(collection(db, 'homes', homeId, 'shopping'), {
        name,
        manual: true,
        unit: 'unidades',
        createdAt: new Date()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const removeManualShoppingItem = async (itemId) => {
    try {
      await deleteDoc(doc(db, 'homes', homeId, 'shopping', itemId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const confirmPurchase = async (item, quantity, unit) => {
    try {
      const qty = parseFloat(quantity);
      
      if (item.manual) {
        // Es un item manual: buscar si existe en inventario
        const existingProduct = inventory.find(p => 
          p.name.toLowerCase() === item.name.toLowerCase()
        );

        if (existingProduct) {
          // Sumar a la cantidad existente
          await updateQuantity(existingProduct.id, existingProduct.quantity + qty);
        } else {
          // Crear nuevo producto en el inventario
          await addProduct({
            name: item.name,
            quantity: qty,
            unit: unit || 'unidades',
            location: 'Despensa',
            threshold: 0
          });
        }

        // Eliminar el item manual de la lista
        await removeManualShoppingItem(item.id);
      } else {
        // Es un producto con stock bajo: actualizar inventario
        const productId = item.id.replace('inv-', '');
        const existingProduct = inventory.find(p => p.id === productId);
        
        if (existingProduct) {
          await updateQuantity(productId, existingProduct.quantity + qty);
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    inventory,
    shoppingList,
    loading,
    addProduct,
    updateQuantity,
    deleteProduct,
    addManualShoppingItem,
    removeManualShoppingItem,
    confirmPurchase,
  };

  return (
    <HomeDataContext.Provider value={value}>
      {children}
    </HomeDataContext.Provider>
  );
}

export function useHomeData() {
  const ctx = useContext(HomeDataContext);
  if (!ctx) throw new Error('useHomeData debe usarse dentro de HomeDataProvider');
  return ctx;
}