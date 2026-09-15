// src/app/profile.js
import { Ionicons } from '@expo/vector-icons';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../utils/firebase';

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
  danger: '#e74c3c',
  success: '#27ae60',
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  
  // Estados para el nombre
  const [displayName, setDisplayName] = useState(user?.displayName || 'Usuario');
  const [newName, setNewName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [savingName, setSavingName] = useState(false);

  // Estados para ajustes
  const [settings, setSettings] = useState({
    defaultLocation: 'Despensa',
    notifications: true,
  });

  // Cargar ajustes al abrir la pantalla
  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().settings) {
        setSettings(userDoc.data().settings);
      }
    } catch (error) {
      console.error("Error cargando ajustes:", error);
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    setSavingName(true);
    try {
      // 1. Actualizar en Firebase Auth
      await updateProfile(auth.currentUser, { displayName: newName.trim() });
      // 2. Actualizar en Firestore
      await updateDoc(doc(db, 'users', user.uid), { displayName: newName.trim() });
      
      setDisplayName(newName.trim());
      setShowNameModal(false);
      setNewName('');
      Alert.alert('¡Listo!', 'Tu nombre de usuario se ha actualizado.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el nombre.');
    } finally {
      setSavingName(false);
    }
  };

  const handleUpdateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Guardar en Firestore
    try {
      await updateDoc(doc(db, 'users', user.uid), { settings: newSettings });
    } catch (error) {
      console.error("Error guardando ajuste:", error);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Cabecera del Perfil */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={COLORS.accent} />
        </View>
        <Text style={styles.username}>{displayName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        
        <TouchableOpacity style={styles.editNameBtn} onPress={() => { setNewName(displayName); setShowNameModal(true); }}>
          <Ionicons name="pencil" size={16} color={COLORS.primary} />
          <Text style={styles.editNameText}>Cambiar nombre</Text>
        </TouchableOpacity>
      </View>

      {/* Sección: Ajustes Generales */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ajustes de la app</Text>
        
        {/* Ajuste: Ubicación por defecto */}
        <View style={styles.settingRow}>
          <View style={styles.settingIconBox}>
            <Ionicons name="cube-outline" size={22} color={COLORS.accent} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Ubicación por defecto</Text>
            <Text style={styles.settingValue}>{settings.defaultLocation}</Text>
          </View>
          <TouchableOpacity 
            style={styles.changeBtn}
            onPress={() => {
              const locations = ['Despensa', 'Nevera', 'Congelador'];
              const currentIndex = locations.indexOf(settings.defaultLocation);
              const nextIndex = (currentIndex + 1) % locations.length;
              handleUpdateSetting('defaultLocation', locations[nextIndex]);
            }}
          >
            <Ionicons name="refresh" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Ajuste: Notificaciones */}
        <View style={styles.settingRow}>
          <View style={styles.settingIconBox}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.accent} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Notificaciones</Text>
            <Text style={styles.settingValue}>Avisos de stock bajo</Text>
          </View>
          <Switch
            value={settings.notifications}
            onValueChange={(val) => handleUpdateSetting('notifications', val)}
            trackColor={{ false: COLORS.cardLight, true: COLORS.primary }}
            thumbColor={COLORS.accent}
          />
        </View>
      </View>

      {/* Sección: Cuenta */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cuenta</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
          <Text style={[styles.menuText, { color: COLORS.danger }]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Modal para cambiar nombre */}
      <Modal visible={showNameModal} animationType="fade" transparent={true} onRequestClose={() => setShowNameModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Nuevo nombre de usuario"
              placeholderTextColor={COLORS.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowNameModal(false)}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleUpdateName} disabled={savingName}>
                <Text style={styles.primaryButtonText}>{savingName ? 'Guardando...' : 'Guardar'}</Text>
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
  
  header: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 2, borderColor: COLORS.accent },
  username: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  email: { fontSize: 14, color: COLORS.textSecondary, marginTop: 5, marginBottom: 15 },
  editNameBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(155, 89, 182, 0.15)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary },
  editNameText: { color: COLORS.primary, fontSize: 14, fontWeight: '600', marginLeft: 6 },

  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 5, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, paddingHorizontal: 15, paddingVertical: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  settingIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.cardLight, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 16, color: COLORS.text, fontWeight: '500' },
  settingValue: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  changeBtn: { padding: 10 },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 15 },

  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 8 },
  menuText: { flex: 1, fontSize: 16, fontWeight: '500', marginLeft: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.card, borderRadius: 16, padding: 25, width: '85%', borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.accent, marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 14, color: COLORS.text, fontSize: 15, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  secondaryButton: { padding: 12, marginRight: 15 },
  secondaryButtonText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  primaryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.accent },
  primaryButtonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
});