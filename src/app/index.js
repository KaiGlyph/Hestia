// src/app/index.js
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform, ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { useApp } from '../context/AppContext';
import { db } from '../utils/firebase';

// Prueba de conexión (solo para verificar)
console.log('Firebase conectado:', db.app.name);

const COLORS = {
  background: '#1a1a1a',
  card: '#2a2a2a',
  cardLight: '#3a3a3a',
  primary: '#9b59b6',
  primaryDark: '#7d3c98',
  accent: '#d4af37',
  text: '#ffffff',
  textSecondary: '#b0b0b0',
  textMuted: '#707070',
  border: '#404040',
  success: '#27ae60',
  danger: '#e74c3c',
};

export default function TasksScreen() {
  const { tasks, addTask, toggleTask, deleteTask } = useApp();
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('Media');
  const [dueDate, setDueDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const handleAddTask = () => {
    if (!title.trim()) {
      Alert.alert('Atención', 'El título de la tarea es obligatorio');
      return;
    }
    addTask({ title: title.trim(), category, priority, dueDate });
    setTitle('');
    setDueDate('');
    setShowForm(false);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const formatted = selectedDate.toLocaleDateString('es-ES');
      setDueDate(formatted);
    }
  };

  const handleClearCompleted = () => {
    const completedCount = tasks.filter(t => t.done).length;
    if (completedCount === 0) {
      Alert.alert('Info', 'No hay tareas completadas para eliminar');
      return;
    }

    Alert.alert(
      'Limpiar completadas',
      `¿Eliminar ${completedCount} tarea${completedCount > 1 ? 's' : ''} completada${completedCount > 1 ? 's' : ''}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            tasks.filter(t => t.done).forEach(t => deleteTask(t.id));
          }
        }
      ]
    );
  };

  const filteredTasks = tasks.filter(t => {
    const matchCategory = filterCategory === 'all' || t.category === filterCategory;
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchStatus = filterStatus === 'all' || 
                       (filterStatus === 'pending' && !t.done) || 
                       (filterStatus === 'done' && t.done);
    return matchCategory && matchPriority && matchStatus;
  });

  const completedCount = tasks.filter(t => t.done).length;
  const totalCount = tasks.length;

  const renderTask = ({ item }) => {
    const priorityColor = item.priority === 'Alta' ? '#c0392b' : item.priority === 'Media' ? COLORS.accent : '#3498db';

    return (
      <View style={[styles.taskItem, item.done && styles.taskItemDone]}>
        <View style={[styles.priorityIndicator, { backgroundColor: priorityColor }]} />
        <View style={styles.taskContent}>
          <Text style={[styles.taskTitle, item.done && styles.taskTitleDone]}>{item.title}</Text>
          <View style={styles.taskMeta}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.category}</Text>
            </View>
            {item.dueDate && (
              <View style={styles.dateBadge}>
                <Text style={styles.dateText}>{item.dueDate}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.taskActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, item.done ? styles.undoBtn : styles.successBtn]} 
            onPress={() => toggleTask(item.id)}
          >
            <Ionicons 
              name={item.done ? 'arrow-undo' : 'checkmark'} 
              size={18} 
              color={COLORS.text} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.dangerBtn]} 
            onPress={() => {
              Alert.alert(
                'Confirmar eliminación',
                '¿Seguro que quieres eliminar esta tarea?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { 
                    text: 'Eliminar', 
                    style: 'destructive',
                    onPress: () => deleteTask(item.id)
                  }
                ]
              );
            }}
          >
            <Ionicons name="trash" size={18} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Barra superior */}
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.topBarButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="funnel" size={22} color={COLORS.accent} />
          <Text style={styles.topBarButtonText}>Filtrar</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.topBarButton, styles.addButton]}
          onPress={() => setShowForm(true)}
        >
          <Ionicons name="add-circle" size={22} color={COLORS.text} />
          <Text style={styles.topBarButtonText}>Añadir</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.topBarButton}
          onPress={handleClearCompleted}
        >
          <Ionicons name="trash-bin" size={22} color={COLORS.danger} />
          <Text style={styles.topBarButtonText}>Limpiar</Text>
        </TouchableOpacity>
      </View>

      {/* Resumen */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>
          {completedCount} de {totalCount} completadas
        </Text>
      </View>

      {/* Lista de tareas */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTask}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No hay tareas que coincidan</Text>
          </View>
        }
      />

      {/* Modal del formulario */}
      <Modal
        visible={showForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowForm(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva tarea</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              <TextInput
                style={styles.input}
                placeholder="Título de la tarea"
                placeholderTextColor={COLORS.textMuted}
                value={title}
                onChangeText={setTitle}
                autoCapitalize="sentences"
              />

              <Text style={styles.label}>Categoría</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={category} onValueChange={setCategory}>
                  <Picker.Item label="General" value="General" />
                  <Picker.Item label="Limpieza" value="Limpieza" />
                  <Picker.Item label="Compras" value="Compras" />
                  <Picker.Item label="Administración" value="Administración" />
                  <Picker.Item label="Personal" value="Personal" />
                </Picker>
              </View>

              <Text style={styles.label}>Prioridad</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={priority} onValueChange={setPriority}>
                  <Picker.Item label="Baja" value="Baja" />
                  <Picker.Item label="Media" value="Media" />
                  <Picker.Item label="Alta" value="Alta" />
                </Picker>
              </View>

              <Text style={styles.label}>Fecha límite</Text>
              <TouchableOpacity 
                style={styles.input} 
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={dueDate ? styles.inputText : styles.placeholderText}>
                  {dueDate || 'Seleccionar fecha (mínimo hoy)'}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={dueDate ? new Date(dueDate.split('/').reverse().join('-')) : new Date()}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={onDateChange}
                />
              )}

              <TouchableOpacity style={styles.primaryButton} onPress={handleAddTask}>
                <Text style={styles.primaryButtonText}>Crear tarea</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de filtros */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              <Text style={styles.label}>Categoría</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={filterCategory} onValueChange={setFilterCategory}>
                  <Picker.Item label="Todas" value="all" />
                  <Picker.Item label="General" value="General" />
                  <Picker.Item label="Limpieza" value="Limpieza" />
                  <Picker.Item label="Compras" value="Compras" />
                  <Picker.Item label="Administración" value="Administración" />
                  <Picker.Item label="Personal" value="Personal" />
                </Picker>
              </View>

              <Text style={styles.label}>Prioridad</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={filterPriority} onValueChange={setFilterPriority}>
                  <Picker.Item label="Todas" value="all" />
                  <Picker.Item label="Baja" value="Baja" />
                  <Picker.Item label="Media" value="Media" />
                  <Picker.Item label="Alta" value="Alta" />
                </Picker>
              </View>

              <Text style={styles.label}>Estado</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={filterStatus} onValueChange={setFilterStatus}>
                  <Picker.Item label="Todas" value="all" />
                  <Picker.Item label="Pendientes" value="pending" />
                  <Picker.Item label="Completadas" value="done" />
                </Picker>
              </View>

              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => {
                  setFilterCategory('all');
                  setFilterPriority('all');
                  setFilterStatus('all');
                }}
              >
                <Text style={styles.secondaryButtonText}>Limpiar filtros</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.primaryButtonText}>Aplicar filtros</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  topBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    alignItems: 'center',
    backgroundColor: COLORS.card, 
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topBarButton: { 
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  topBarButtonText: { 
    color: COLORS.text, 
    fontSize: 12, 
    marginTop: 4,
    fontWeight: '600',
  },
  
  summaryBox: { 
    backgroundColor: COLORS.card, 
    padding: 15, 
    margin: 15, 
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  summaryText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.accent,
  },
  
  listContent: { paddingBottom: 20 },
  taskItem: { 
    backgroundColor: COLORS.card, 
    marginHorizontal: 15, 
    marginBottom: 10, 
    borderRadius: 8, 
    flexDirection: 'row',
    overflow: 'hidden',
  },
  taskItemDone: { opacity: 0.5 },
  priorityIndicator: {
    width: 4,
  },
  taskContent: { 
    flex: 1, 
    padding: 15,
  },
  taskTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 8, 
    color: COLORS.text,
  },
  taskTitleDone: { 
    textDecorationLine: 'line-through', 
    color: COLORS.textMuted,
  },
  taskMeta: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  badge: { 
    backgroundColor: COLORS.cardLight,
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    marginRight: 8,
  },
  badgeText: { 
    fontSize: 12, 
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dateBadge: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  taskActions: { 
    flexDirection: 'row',
    padding: 10,
  },
  actionBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 8,
  },
  successBtn: { backgroundColor: COLORS.success },
  undoBtn: { backgroundColor: COLORS.primary },
  dangerBtn: { backgroundColor: COLORS.danger },
  
  emptyState: { 
    padding: 60, 
    alignItems: 'center',
  },
  emptyText: { 
    fontSize: 16, 
    color: COLORS.textMuted,
    marginTop: 15,
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  formScroll: {
    paddingBottom: 20,
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    marginBottom: 8, 
    color: COLORS.textSecondary,
  },
  input: { 
    backgroundColor: COLORS.cardLight,
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 8, 
    padding: 14, 
    marginBottom: 15, 
    color: COLORS.text,
    fontSize: 15,
  },
  inputText: { 
    fontSize: 15, 
    color: COLORS.text,
  },
  placeholderText: { 
    fontSize: 15, 
    color: COLORS.textMuted,
  },
  pickerContainer: { 
    backgroundColor: COLORS.cardLight,
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 8, 
    marginBottom: 15,
  },
  primaryButton: { 
    backgroundColor: COLORS.primary, 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  primaryButtonText: { 
    color: COLORS.text, 
    fontSize: 16, 
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: COLORS.cardLight,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});