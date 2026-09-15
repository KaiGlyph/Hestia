// src/app/homes.js
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useHomes } from '../context/HomesContext';
import { db } from '../utils/firebase';

const COLORS = {
  background: '#1a1a1a',
  card: '#2a2a2a',
  cardLight: '#3a3a3a',
  primary: '#9b59b6',
  accent: '#d4af37',
  text: '#ffffff',
  textSecondary: '#b0b0b0',
  textMuted: '#707070',
  border: '#404040',
  success: '#27ae60',
  danger: '#e74c3c',
};

function Toast({ message, type, visible }) {
  if (!visible) return null;
  const bgColor = type === 'success' ? COLORS.success : COLORS.danger;
  const iconName = type === 'success' ? 'checkmark-circle' : 'alert-circle';

  return (
    <View style={[styles.toast, { backgroundColor: bgColor }]}>
      <Ionicons name={iconName} size={20} color={COLORS.text} />
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

export default function HomesScreen() {
  const { user } = useAuth();
  const { homes, loading, createHome, addMemberByEmail, removeMember, deleteHome, refreshHomes } = useHomes();
  const router = useRouter();
  
  const [selectedHome, setSelectedHome] = useState(null);
  const [membersData, setMembersData] = useState([]);
  
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHomeName, setNewHomeName] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ ...toast, visible: false }), 3000);
  };

  useEffect(() => {
    if (selectedHome) {
      fetchMembers(selectedHome.members);
    }
  }, [selectedHome]);

  const fetchMembers = async (membersUids) => {
    try {
      const q = query(collection(db, 'users'), where('uid', 'in', membersUids));
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map(doc => doc.data());
      setMembersData(members);
    } catch (error) {
      console.error("Error cargando miembros:", error);
    }
  };

  const handleCreateHome = async () => {
    if (!newHomeName.trim()) return showToast('El nombre es obligatorio', 'error');
    const result = await createHome(newHomeName.trim());
    if (result.success) {
      setNewHomeName('');
      setShowCreateModal(false);
      showToast('¡Casa creada con éxito!');
    } else {
      showToast(result.error, 'error');
    }
  };

  const handleAddMember = async () => {
    if (!memberEmail.trim()) return showToast('Introduce un email', 'error');
    setAddingMember(true);
    const result = await addMemberByEmail(selectedHome.id, memberEmail.trim().toLowerCase());
    setAddingMember(false);
    
    if (result.success) {
      showToast('Miembro añadido correctamente');
      setMemberEmail('');
      setShowAddMemberModal(false);
      
      const updatedHome = { 
        ...selectedHome, 
        members: [...selectedHome.members, result.newMemberUid] 
      };
      setSelectedHome(updatedHome);
      fetchMembers(updatedHome.members);
      await refreshHomes();
    } else {
      showToast(result.error, 'error');
    }
  };

  const handleRemoveMember = (memberUid, memberName) => {
    Alert.alert(
      'Eliminar miembro',
      `¿Seguro que quieres eliminar a "${memberName}" de esta casa? Perderá acceso al inventario y la lista de la compra.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const result = await removeMember(selectedHome.id, memberUid);
            if (result.success) {
              showToast('Miembro eliminado correctamente');
              const updatedMembers = selectedHome.members.filter(uid => uid !== memberUid);
              setSelectedHome({ ...selectedHome, members: updatedMembers });
              fetchMembers(updatedMembers);
              await refreshHomes();
            } else {
              showToast(result.error, 'error');
            }
          }
        }
      ]
    );
  };

  const handleDeleteHome = () => {
    Alert.alert(
      'Eliminar casa',
      `¿Seguro que quieres eliminar "${selectedHome.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Continuar', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '️ ADVERTENCIA',
              'Al eliminar esta casa se borrará también todo el inventario y la lista de la compra asociados. Esta acción no se puede deshacer.\n\n¿Estás completamente seguro?',
              [
                { text: 'No, cancelar', style: 'cancel' },
                { 
                  text: 'Sí, eliminar definitivamente', 
                  style: 'destructive',
                  onPress: async () => {
                    const result = await deleteHome(selectedHome.id);
                    if (result.success) {
                      showToast('Casa eliminada correctamente');
                      setSelectedHome(null);
                      setMembersData([]);
                    } else {
                      showToast(result.error, 'error');
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  // --- VISTA INTERIOR DE LA CASA ---
  if (selectedHome) {
    const isCreator = selectedHome.createdBy === user.uid;

    return (
      <View style={styles.container}>
        <Toast message={toast.message} type={toast.type} visible={toast.visible} />
        
        <View style={styles.homeTopBar}>
          <TouchableOpacity onPress={() => setSelectedHome(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.accent} />
          </TouchableOpacity>
          <Text style={styles.homeTopBarTitle}>{selectedHome.name}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.insideHomeContent}>
          <Text style={styles.sectionTitle}>Gestión</Text>
          
          <TouchableOpacity 
            style={styles.bigActionCard} 
            onPress={() => router.push({ pathname: '/home-inventory', params: { homeId: selectedHome.id, homeName: selectedHome.name } })}
          >
            <Ionicons name="cube" size={40} color={COLORS.accent} />
            <Text style={styles.bigActionText}>Inventario</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.bigActionCard} 
            onPress={() => router.push({ pathname: '/home-shopping', params: { homeId: selectedHome.id, homeName: selectedHome.name } })}
          >
            <Ionicons name="cart" size={40} color={COLORS.accent} />
            <Text style={styles.bigActionText}>Lista de la Compra</Text>
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
            Miembros ({membersData.length})
          </Text>
          
          {isCreator && (
            <Text style={styles.creatorNote}>Eres el propietario de esta casa</Text>
          )}
          
          {membersData.map((m, idx) => {
            const isCurrentUser = m.uid === user.uid;
            
            return (
              <View key={idx} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Ionicons name="person" size={20} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.memberName}>{m.displayName || 'Usuario'}</Text>
                  <Text style={styles.memberEmail}>{m.email}</Text>
                </View>
                
                {isCurrentUser && <Text style={styles.ownerBadge}>Tú</Text>}
                
                {isCreator && !isCurrentUser && (
                  <TouchableOpacity 
                    style={styles.removeMemberBtn} 
                    onPress={() => handleRemoveMember(m.uid, m.displayName || m.email)}
                  >
                    <Ionicons name="trash" size={18} color={COLORS.danger} />
                    <Text style={styles.removeMemberText}>Eliminar</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          <TouchableOpacity style={styles.addMemberButton} onPress={() => setShowAddMemberModal(true)}>
            <Ionicons name="person-add" size={20} color={COLORS.primary} />
            <Text style={styles.addMemberText}>Añadir miembro por email</Text>
          </TouchableOpacity>

          {/* NUEVO: Solo el creador puede ver y pulsar el botón de eliminar casa */}
          {isCreator && (
            <TouchableOpacity style={styles.deleteHomeButton} onPress={handleDeleteHome}>
              <Ionicons name="trash" size={20} color={COLORS.danger} />
              <Text style={styles.deleteHomeText}>Eliminar esta casa</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <Modal visible={showAddMemberModal} animationType="fade" transparent={true} onRequestClose={() => setShowAddMemberModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Añadir Miembro</Text>
              <Text style={styles.modalSubtitle}>Introduce el email con el que se registró en Hestia.</Text>
              <TextInput
                style={styles.input}
                placeholder="email@ejemplo.com"
                placeholderTextColor={COLORS.textMuted}
                value={memberEmail}
                onChangeText={setMemberEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowAddMemberModal(false)}>
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleAddMember} disabled={addingMember}>
                  <Text style={styles.primaryButtonText}>{addingMember ? 'Buscando...' : 'Añadir'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // --- VISTA PRINCIPAL (LISTA DE CASAS) ---
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
      
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, {user?.displayName || 'Usuario'}</Text>
        <Text style={styles.subGreeting}>Tus hogares compartidos</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : homes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="home-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No tienes casas registradas</Text>
        </View>
      ) : (
        homes.map((home) => (
          <TouchableOpacity key={home.id} style={styles.homeCard} onPress={() => setSelectedHome(home)}>
            <View style={styles.homeHeader}>
              <Ionicons name="home" size={28} color={COLORS.accent} />
              <View style={styles.homeInfo}>
                <Text style={styles.homeName}>{home.name}</Text>
                <Text style={styles.homeMembers}>{home.members.length} miembros</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity style={styles.addHomeButton} onPress={() => setShowCreateModal(true)}>
        <Ionicons name="add-circle" size={24} color={COLORS.primary} />
        <Text style={styles.addHomeText}>Crear nueva casa</Text>
      </TouchableOpacity>

      <Modal visible={showCreateModal} animationType="slide" transparent={true} onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nueva Casa</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre (ej: Mi Piso)"
              placeholderTextColor={COLORS.textMuted}
              value={newHomeName}
              onChangeText={setNewHomeName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleCreateHome}>
                <Text style={styles.primaryButtonText}>Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 25 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
  subGreeting: { fontSize: 16, color: COLORS.textSecondary, marginTop: 5 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 15 },
  homeCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border },
  homeHeader: { flexDirection: 'row', alignItems: 'center' },
  homeInfo: { flex: 1, marginLeft: 15 },
  homeName: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  homeMembers: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  addHomeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.primary, marginTop: 10 },
  addHomeText: { color: COLORS.primary, fontWeight: '600', fontSize: 16, marginLeft: 8 },
  
  homeTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  homeTopBarTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.accent },
  insideHomeContent: { padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 15 },
  bigActionCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 25, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: COLORS.border },
  bigActionText: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 10 },
  
  creatorNote: { 
    fontSize: 13, 
    color: COLORS.accent, 
    fontStyle: 'italic', 
    marginBottom: 10 
  },
  
  memberRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardLight, padding: 12, borderRadius: 8, marginBottom: 10 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center' },
  memberName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  memberEmail: { fontSize: 12, color: COLORS.textSecondary },
  ownerBadge: { fontSize: 12, color: COLORS.accent, fontWeight: 'bold' },
  addMemberButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 8, backgroundColor: COLORS.cardLight, marginTop: 10 },
  addMemberText: { color: COLORS.primary, fontWeight: '600', fontSize: 16, marginLeft: 8 },

  removeMemberBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  removeMemberText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  deleteHomeButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 15, 
    borderRadius: 8, 
    backgroundColor: 'rgba(231, 76, 60, 0.15)', 
    borderWidth: 1, 
    borderColor: COLORS.danger,
    marginTop: 30,
    marginBottom: 20,
  },
  deleteHomeText: { 
    color: COLORS.danger, 
    fontWeight: '600', 
    fontSize: 16, 
    marginLeft: 8 
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.card, borderRadius: 16, padding: 25, width: '85%', borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.accent, marginBottom: 10, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 14, color: COLORS.text, fontSize: 15, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  secondaryButton: { padding: 12, marginRight: 15 },
  secondaryButtonText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  primaryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.accent },
  primaryButtonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },

  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: COLORS.success,
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  toastText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
});