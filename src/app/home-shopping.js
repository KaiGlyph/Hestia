// src/app/home-shopping.js
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { HomeDataProvider, useHomeData } from '../context/HomeDataContext';

const COLORS = {
  background: '#1a1a1a', card: '#2a2a2a', cardLight: '#3a3a3a',
  primary: '#9b59b6', accent: '#d4af37', text: '#ffffff',
  textSecondary: '#b0b0b0', textMuted: '#707070', border: '#404040',
  success: '#27ae60', danger: '#e74c3c', warning: '#f39c12',
};

const UNITS = ['unidades', 'kg', 'L'];

function ShoppingContent() {
  const router = useRouter();
  const { homeName } = useLocalSearchParams();
  const { shoppingList, addManualShoppingItem, removeManualShoppingItem, confirmPurchase } = useHomeData();
  
  const [manualItemName, setManualItemName] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [itemToBuy, setItemToBuy] = useState(null);
  const [buyQuantity, setBuyQuantity] = useState('');
  const [buyUnit, setBuyUnit] = useState('unidades');

  const filteredList = shoppingList.filter(item => 
    item.name.toLowerCase().includes(searchText.toLowerCase())
  );

  console.log(' Lista filtrada:', filteredList.length, 'items');

  const handleAddManual = async () => {
    if (!manualItemName.trim()) return;
    await addManualShoppingItem(manualItemName.trim());
    setManualItemName('');
  };

  const openBuyModal = (item) => {
    console.log('🛒 Abriendo modal para:', item.name, 'ID:', item.id);
    setItemToBuy(item);
    setBuyQuantity('');
    setBuyUnit(item.unit || 'unidades');
    setShowBuyModal(true);
  };

  const handleConfirmPurchase = async () => {
    if (!itemToBuy || !buyQuantity) return;
    const result = await confirmPurchase(itemToBuy, buyQuantity, buyUnit);
    if (result.success) {
      setShowBuyModal(false);
      setItemToBuy(null);
      setBuyQuantity('');
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const renderItem = ({ item }) => {
    console.log(' Renderizando item:', item.name, 'ID:', item.id, 'Manual:', item.manual);
    
    return (
      <TouchableOpacity 
        style={styles.item}
        onPress={() => openBuyModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemContent}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.manual && (
            <View style={styles.manualBadge}>
              <Text style={styles.manualBadgeText}>Manual</Text>
            </View>
          )}
          {!item.manual && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockBadgeText}>Stock bajo</Text>
            </View>
          )}
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity 
            style={styles.boughtBtn} 
            onPress={() => openBuyModal(item)}
          >
            <Ionicons name="cart" size={18} color={COLORS.text} />
          </TouchableOpacity>
          {item.manual && (
            <TouchableOpacity 
              style={styles.removeBtn} 
              onPress={() => {
                Alert.alert('Eliminar', `¿Quitar "${item.name}" de la lista?`, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Eliminar', style: 'destructive', onPress: () => removeManualShoppingItem(item.id) }
                ]);
              }}
            >
              <Ionicons name="trash" size={18} color={COLORS.text} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.replace('/homes')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{homeName} - Compra</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.formBox}>
        <Text style={styles.label}>Añadir item manual</Text>
        <View style={styles.inputRow}>
          <TextInput 
            style={styles.input} 
            placeholder="Nombre del producto" 
            placeholderTextColor={COLORS.textMuted} 
            value={manualItemName} 
            onChangeText={setManualItemName} 
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddManual}>
            <Ionicons name="add" size={22} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput} 
          placeholder="Buscar en la lista..." 
          placeholderTextColor={COLORS.textMuted} 
          value={searchText} 
          onChangeText={setSearchText} 
          autoCapitalize="none" 
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearchBtn}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredList}
        keyExtractor={(item) => {
          const key = item.id || `item-${Math.random()}`;
          console.log('🔑 KeyExtractor:', key, 'para item:', item.name);
          return key;
        }}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              {searchText ? 'No se encontraron resultados' : 'Lista vacía'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchText ? 'Prueba con otro término' : 'Añade productos o espera a que haya stock bajo'}
            </Text>
          </View>
        }
      />

      <Modal visible={showBuyModal} animationType="fade" transparent={true} onRequestClose={() => setShowBuyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmar compra</Text>
              <TouchableOpacity onPress={() => setShowBuyModal(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalText}>
              ¿Cuánto has comprado de{' '}
              <Text style={styles.modalTextHighlight}>{itemToBuy?.name}</Text>?
            </Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="Cantidad (ej: 1.5)" 
              placeholderTextColor={COLORS.textMuted} 
              value={buyQuantity} 
              onChangeText={setBuyQuantity} 
              keyboardType="decimal-pad" 
              autoFocus 
            />
            <Text style={styles.label}>Unidad</Text>
            <View style={styles.unitChipsContainer}>
              {UNITS.map(u => (
                <TouchableOpacity 
                  key={u} 
                  style={[styles.unitChip, buyUnit === u && styles.unitChipSelected]} 
                  onPress={() => setBuyUnit(u)}
                >
                  <Text style={[styles.unitChipText, buyUnit === u && styles.unitChipTextSelected]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowBuyModal(false)}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleConfirmPurchase}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.text} />
                <Text style={styles.primaryButtonText}>Confirmar compra</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function HomeShoppingScreen() {
  const { homeId } = useLocalSearchParams();
  return (
    <HomeDataProvider homeId={homeId}>
      <ShoppingContent />
    </HomeDataProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 5, marginRight: 10 },
  topBarTitle: { flex: 1, fontSize: 16, fontWeight: 'bold', color: COLORS.accent },
  formBox: { backgroundColor: COLORS.card, padding: 15, margin: 15, marginBottom: 10, borderRadius: 8 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: COLORS.textSecondary },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.text, fontSize: 15 },
  addButton: { backgroundColor: COLORS.primary, width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, marginHorizontal: 15, marginTop: 5, marginBottom: 10, borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 12 },
  clearSearchBtn: { padding: 5 },
  listContent: { paddingBottom: 20 },
  item: { backgroundColor: COLORS.card, marginHorizontal: 15, marginBottom: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, minHeight: 60 },
  itemContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  manualBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginLeft: 10 },
  manualBadgeText: { fontSize: 11, color: COLORS.text, fontWeight: '600' },
  lowStockBadge: { backgroundColor: COLORS.warning, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginLeft: 10 },
  lowStockBadgeText: { fontSize: 11, color: COLORS.text, fontWeight: '600' },
  itemActions: { flexDirection: 'row' },
  boughtBtn: { backgroundColor: COLORS.success, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  removeBtn: { backgroundColor: COLORS.danger, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  emptyState: { padding: 60, alignItems: 'center' },
  emptyText: { fontSize: 18, color: COLORS.text, fontWeight: '600', marginTop: 15 },
  emptySubtext: { fontSize: 14, color: COLORS.textMuted, marginTop: 8, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.card, borderRadius: 20, padding: 25, width: '85%', borderWidth: 1, borderColor: COLORS.accent },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.accent },
  modalText: { fontSize: 16, color: COLORS.text, marginBottom: 15, lineHeight: 22 },
  modalTextHighlight: { color: COLORS.accent, fontWeight: 'bold' },
  modalInput: { backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 14, color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  unitChipsContainer: { flexDirection: 'row', marginBottom: 20 },
  unitChip: { flex: 1, backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 8 },
  unitChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.accent },
  unitChipText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  unitChipTextSelected: { color: COLORS.text },
  modalActions: { flexDirection: 'row', marginTop: 10, alignItems: 'stretch' },
  secondaryButton: { flex: 1, backgroundColor: COLORS.cardLight, paddingVertical: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, marginRight: 10 },
  secondaryButtonText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  primaryButton: { flex: 1.5, backgroundColor: COLORS.success, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 1, borderColor: COLORS.accent },
  primaryButtonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});