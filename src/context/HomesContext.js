// src/context/HomesContext.js
import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs, query,
    updateDoc,
    where
} from 'firebase/firestore';
import React, { createContext, useContext, useState } from 'react';
import { db } from '../utils/firebase';
import { useAuth } from './AuthContext';

const HomesContext = createContext();

export function HomesProvider({ children }) {
  const { user } = useAuth();
  const [homes, setHomes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHomes = React.useCallback(async () => {
    if (!user) {
      setHomes([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const q = query(collection(db, 'homes'), where('members', 'array-contains', user.uid));
      const querySnapshot = await getDocs(q);
      
      const userHomes = [];
      for (const docSnap of querySnapshot.docs) {
        const homeData = { id: docSnap.id, ...docSnap.data() };
        
        // REPARACIÓN: Si la casa no tiene createdBy, asignarle el primer miembro
        if (!homeData.createdBy && homeData.members && homeData.members.length > 0) {
          homeData.createdBy = homeData.members[0];
          await updateDoc(doc(db, 'homes', docSnap.id), { createdBy: homeData.createdBy });
        }
        
        userHomes.push(homeData);
      }
      
      setHomes(userHomes);
    } catch (error) {
      console.error("Error cargando casas:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchHomes();
  }, [fetchHomes]);

  const createHome = async (name) => {
    if (!user) return { success: false, error: 'No hay usuario' };
    try {
      await addDoc(collection(db, 'homes'), {
        name: name,
        createdBy: user.uid,
        members: [user.uid],
        createdAt: new Date()
      });
      await fetchHomes();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const addMemberByEmail = async (homeId, emailToAdd) => {
    try {
      const q = query(collection(db, 'users'), where('email', '==', emailToAdd.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { success: false, error: 'No existe ningún usuario registrado con ese email.' };
      }

      const memberData = querySnapshot.docs[0].data();
      const memberUid = memberData.uid;

      const homeDoc = await getDoc(doc(db, 'homes', homeId));
      if (homeDoc.data().members.includes(memberUid)) {
        return { success: false, error: 'Este usuario ya es miembro de la casa.' };
      }

      await updateDoc(doc(db, 'homes', homeId), {
        members: arrayUnion(memberUid)
      });

      return { success: true, newMemberUid: memberUid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const removeMember = async (homeId, memberUid) => {
    try {
      await updateDoc(doc(db, 'homes', homeId), {
        members: arrayRemove(memberUid)
      });
      // NUEVO: Recargar la lista de casas para que el contador de miembros se actualice en la vista principal
      await fetchHomes(); 
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteHome = async (homeId) => {
    try {
      await deleteDoc(doc(db, 'homes', homeId));
      await fetchHomes();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = { homes, loading, createHome, addMemberByEmail, removeMember, deleteHome, refreshHomes: fetchHomes };

  return (
    <HomesContext.Provider value={value}>
      {children}
    </HomesContext.Provider>
  );
}

export function useHomes() {
  const ctx = useContext(HomesContext);
  if (!ctx) throw new Error('useHomes debe usarse dentro de HomesProvider');
  return ctx;
}