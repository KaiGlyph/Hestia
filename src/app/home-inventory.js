// src/app/home-inventory.js
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { HomeDataProvider, useHomeData } from '../context/HomeDataContext';

const COLORS = {
  background: '#1a1a1a', card: '#2a2a2a', cardLight: '#3a3a3a',
  primary: '#9b59b6', primaryDark: '#7d3c98', accent: '#d4af37',
  text: '#ffffff', textSecondary: '#b0b0b0', textMuted: '#707070',
  border: '#404040', success: '#27ae60', danger: '#e74c3c', warning: '#f39c12',
};

function InventoryContent() {
  const router = useRouter();
  const { homeName } = useLocalSearchParams();
  const { inventory, addProduct, updateQuantity, deleteProduct } = useHomeData();
  
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('unidades');
  const [location, setLocation] = useState('Nevera');
  const [threshold, setThreshold] = useState('2');
  const [showForm, setShowForm] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');

  const filteredProducts = inventory
    .filter(p => {
      const matchSearch = searchText === '' || p.name.toLowerCase().includes(searchText.toLowerCase());
      return matchSearch;
    })
    .sort((a, b) => {
      const aLow = a.quantity <= a.threshold ? 1 : 0;
      const bLow = b.quantity <= b.threshold ? 1 : 0;
      return bLow - aLow;
    });

  const lowStockCount = inventory.filter(p => p.quantity <= p.threshold).length;
  const totalCount = inventory.length;

  console.log(' InventoryContent render - productos:', inventory.length, 'filtrados:', filteredProducts.length);

  const handleAddProduct = async () => {
    if (!name.trim() || !quantity) {
      Alert.alert('Atención', 'Nombre y cantidad son obligatorios');
      return;
    }
    const result = await addProduct({
      name: name.trim(),
      quantity: parseFloat(quantity),
      unit, location,
      threshold: parseFloat(threshold) || 2
    });
    if (result.success) {
      setName(''); setQuantity(''); setUnit('unidades');
      setLocation('Nevera'); setThreshold('2');
      setShowForm(false);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const renderProduct = ({ item }) => {
    console.log('🎨 Renderizando producto:', item.name, 'cantidad:', item.quantity, 'umbral:', item.threshold);
    
    const locationIcon = item.location === 'Nevera' ? 'snow' : item.location === 'Congelador' ? 'snow-outline' : 'cube-outline';
    const isLow = item.quantity <= item.threshold;

    return (
      <TouchableOpacity 
        style={[styles.productItem, isLow && styles.productItemLow]}
        onPress={() => setSelectedProduct(item)}
        activeOpacity={0.7}
      >
        <View style={styles.productContent}>
          <View style={styles.productHeader}>
            <Text style={[styles.productName, isLow && styles.productNameLow]} numberOfLines={1}>{item.name}</Text>
            {isLow && (
              <View style={styles.lowBadge}>
                <Ionicons name="alert-circle" size={14} color={COLORS.warning} />
                <Text style={styles.lowBadgeText}>Stock bajo</Text>
              </View>
            )}
          </View>
          <View style={styles.productMeta}>
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityText}>{item.quantity} {item.unit}</Text>
            </View>
            <View style={styles.locationBadge}>
              <Ionicons name={locationIcon} size={14} color={COLORS.textSecondary} />
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
          </View>
        </View>
        <View style={styles.productActions}>
          <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => {
            setEditProduct(item);
            setEditQuantity(item.quantity.toString());
            setShowEditModal(true);
          }}>
            <Ionicons name="pencil" size={18} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => {
            Alert.alert('Confirmar eliminación', `¿Seguro que quieres eliminar "${item.name}"?`, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Eliminar', style: 'destructive', onPress: () => deleteProduct(item.id) }
            ]);
          }}>
            <Ionicons name="trash" size={18} color={COLORS.text} />
          </TouchableOpacity>
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
        <Text style={styles.topBarTitle}>{homeName} - Inventario</Text>
        <TouchableOpacity style={[styles.topBarButton, styles.addButton]} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholder="Buscar producto..." placeholderTextColor={COLORS.textMuted} value={searchText} onChangeText={setSearchText} autoCapitalize="none" />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearchBtn}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.summaryBox}>
        {lowStockCount > 0 ? (
          <Text style={styles.summaryText}>{lowStockCount} producto{lowStockCount !== 1 ? 's' : ''} con stock bajo de {totalCount}</Text>
        ) : (
          <Text style={styles.summaryText}>{totalCount} producto{totalCount !== 1 ? 's' : ''} en inventario</Text>
        )}
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => `${item.id}-${item.quantity <= item.threshold}`}
        renderItem={renderProduct}
        extraData={inventory}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No hay productos</Text>
          </View>
        }
      />

      <Modal visible={showForm} animationType="slide" transparent={true} onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo producto</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formScroll}>
              <TextInput style={styles.input} placeholder="Nombre del producto" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} autoCapitalize="sentences" />
              <Text style={styles.label}>Cantidad</Text>
              <TextInput style={styles.input} placeholder="Cantidad (ej: 1.5)" placeholderTextColor={COLORS.textMuted} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
              <Text style={styles.label}>Unidad</Text>
              <View style={styles.unitChipsContainer}>
                {['unidades', 'kg', 'L'].map(u => (
                  <TouchableOpacity key={u} style={[styles.unitChip, unit === u && styles.unitChipSelected]} onPress={() => setUnit(u)}>
                    <Text style={[styles.unitChipText, unit === u && styles.unitChipTextSelected]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Ubicación</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={location} onValueChange={setLocation}>
                  <Picker.Item label="Nevera" value="Nevera" />
                  <Picker.Item label="Congelador" value="Congelador" />
                  <Picker.Item label="Despensa" value="Despensa" />
                </Picker>
              </View>
              <Text style={styles.label}>Umbral de aviso</Text>
              <TextInput style={styles.input} placeholder="Umbral (ej: 0.5)" placeholderTextColor={COLORS.textMuted} value={threshold} onChangeText={setThreshold} keyboardType="decimal-pad" />
              <TouchableOpacity style={styles.primaryButton} onPress={handleAddProduct}>
                <Text style={styles.primaryButtonText}>Añadir producto</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={selectedProduct !== null} animationType="slide" transparent={true} onRequestClose={() => setSelectedProduct(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle del producto</Text>
              <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {selectedProduct && (
              <ScrollView contentContainerStyle={styles.formScroll}>
                <View style={styles.detailRow}>
                  <Ionicons name="pricetag" size={20} color={COLORS.accent} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Nombre</Text>
                    <Text style={styles.detailValue}>{selectedProduct.name}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="cube" size={20} color={COLORS.accent} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Cantidad</Text>
                    <Text style={styles.detailValue}>{selectedProduct.quantity} {selectedProduct.unit}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name={selectedProduct.location === 'Nevera' ? 'snow' : selectedProduct.location === 'Congelador' ? 'snow-outline' : 'cube-outline'} size={20} color={COLORS.accent} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Ubicación</Text>
                    <Text style={styles.detailValue}>{selectedProduct.location}</Text>
                  </View>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalButton} onPress={() => {
                    setEditProduct(selectedProduct);
                    setEditQuantity(selectedProduct.quantity.toString());
                    setSelectedProduct(null);
                    setShowEditModal(true);
                  }}>
                    <Ionicons name="pencil" size={20} color={COLORS.text} />
                    <Text style={styles.modalButtonText}>Ajustar cantidad</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, styles.modalButtonDanger]} onPress={() => {
                    Alert.alert('Confirmar eliminación', `¿Seguro que quieres eliminar "${selectedProduct.name}"?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Eliminar', style: 'destructive', onPress: () => { deleteProduct(selectedProduct.id); setSelectedProduct(null); } }
                    ]);
                  }}>
                    <Ionicons name="trash" size={20} color={COLORS.text} />
                    <Text style={styles.modalButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showEditModal} animationType="fade" transparent={true} onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <Text style={styles.modalTitle}>Ajustar cantidad</Text>
            <Text style={styles.editModalText}>{editProduct?.name}</Text>
            <Text style={styles.editModalCurrent}>Cantidad actual: {editProduct?.quantity} {editProduct?.unit}</Text>
            <TextInput style={styles.input} placeholder="Nueva cantidad total" placeholderTextColor={COLORS.textMuted} value={editQuantity} onChangeText={setEditQuantity} keyboardType="decimal-pad" autoFocus />
            <View style={styles.editModalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowEditModal(false)}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={async () => {
                if (editProduct) {
                  await updateQuantity(editProduct.id, editQuantity);
                  setShowEditModal(false);
                }
              }}>
                <Text style={styles.primaryButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function HomeInventoryScreen() {
  const { homeId } = useLocalSearchParams();
  return (
    <HomeDataProvider homeId={homeId}>
      <InventoryContent />
    </HomeDataProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 5, marginRight: 10 },
  topBarTitle: { flex: 1, fontSize: 16, fontWeight: 'bold', color: COLORS.accent },
  topBarButton: { padding: 8 },
  addButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, marginHorizontal: 15, marginTop: 10, marginBottom: 10, borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 12 },
  clearSearchBtn: { padding: 5 },
  summaryBox: { backgroundColor: COLORS.card, padding: 15, margin: 15, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  summaryText: { fontSize: 16, fontWeight: '600', color: COLORS.warning },
  listContent: { paddingBottom: 20 },
  productItem: { backgroundColor: COLORS.card, marginHorizontal: 15, marginBottom: 10, borderRadius: 8, flexDirection: 'row', overflow: 'hidden', minHeight: 80 },
  productItemLow: { borderLeftWidth: 3, borderLeftColor: COLORS.warning },
  productContent: { flex: 1, padding: 15, minWidth: 0 },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  productName: { fontSize: 16, fontWeight: '600', color: COLORS.text, flex: 1, marginRight: 8 },
  productNameLow: { color: COLORS.warning },
  lowBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(243, 156, 18, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  lowBadgeText: { fontSize: 11, color: COLORS.warning, fontWeight: '600', marginLeft: 4 },
  productMeta: { flexDirection: 'row', alignItems: 'center' },
  quantityBadge: { backgroundColor: COLORS.cardLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  quantityText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  locationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryDark, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  locationText: { fontSize: 13, color: COLORS.text, fontWeight: '500', marginLeft: 4 },
  productActions: { flexDirection: 'row', padding: 10, alignItems: 'center' },
  actionBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  editBtn: { backgroundColor: COLORS.primary },
  dangerBtn: { backgroundColor: COLORS.danger },
  emptyState: { padding: 60, alignItems: 'center' },
  emptyText: { fontSize: 16, color: COLORS.textMuted, marginTop: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', width: '100%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.accent },
  formScroll: { paddingBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: COLORS.textSecondary },
  input: { backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 14, marginBottom: 15, color: COLORS.text, fontSize: 15 },
  pickerContainer: { backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginBottom: 15 },
  primaryButton: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.accent, flex: 1, marginHorizontal: 5 },
  primaryButtonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: COLORS.cardLight, padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, flex: 1, marginHorizontal: 5 },
  secondaryButtonText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  unitChipsContainer: { flexDirection: 'row', marginBottom: 15 },
  unitChip: { flex: 1, backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginRight: 8 },
  unitChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.accent },
  unitChipText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  unitChipTextSelected: { color: COLORS.text },
  detailRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardLight, padding: 15, borderRadius: 8, marginBottom: 10 },
  detailContent: { flex: 1, marginLeft: 15 },
  detailLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  detailValue: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
  modalActions: { flexDirection: 'row', marginTop: 20 },
  modalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, flex: 1, marginHorizontal: 5, borderWidth: 1, borderColor: COLORS.accent },
  modalButtonDanger: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  modalButtonText: { color: COLORS.text, fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  editModalContent: { backgroundColor: COLORS.card, borderRadius: 20, padding: 25, width: '85%', alignItems: 'center' },
  editModalText: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 10, marginBottom: 5, textAlign: 'center' },
  editModalCurrent: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },
  editModalActions: { flexDirection: 'row', width: '100%', marginTop: 10 },
});