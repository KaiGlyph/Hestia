// src/app/recipes.js
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useApp } from '../context/AppContext';
import { HomeDataProvider, useHomeData } from '../context/HomeDataContext';
import { useHomes } from '../context/HomesContext';
import { db } from '../utils/firebase';

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
  warning: '#f39c12',
};

const UNITS = ['unidades', 'kg', 'L'];

// --- Componente Autocomplete ---
function AutocompleteInput({ value, onChangeText, suggestions, placeholder }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const filtered = suggestions.filter(s => 
    s.toLowerCase().includes(value.toLowerCase()) && value.length >= 2
  );

  return (
    <View style={styles.autocompleteContainer}>
      <TextInput
        style={styles.autocompleteInput}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={(text) => { onChangeText(text); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
      />
      {showSuggestions && filtered.length > 0 && (
        <View style={styles.suggestionsList}>
          {filtered.slice(0, 5).map((suggestion, index) => (
            <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => { onChangeText(suggestion); setShowSuggestions(false); }}>
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// --- Componente UnitChips ---
function UnitChips({ selected, onSelect }) {
  return (
    <View style={styles.unitChipsContainer}>
      {UNITS.map(unit => (
        <TouchableOpacity key={unit} style={[styles.unitChip, selected === unit && styles.unitChipSelected]} onPress={() => onSelect(unit)}>
          <Text style={[styles.unitChipText, selected === unit && styles.unitChipTextSelected]}>{unit}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// --- LÓGICA DE COCINADO (Con acceso al inventario de la casa) ---
function CookingSession({ recipe, homeId, onFinish, onBack }) {
  const { inventory, updateQuantity } = useHomeData();
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState(null);

  const checkMissing = () => {
    const missing = [];
    recipe.ingredients.forEach(ing => {
      const product = inventory.find(p => p.name.toLowerCase() === ing.name.toLowerCase());
      if (!product || product.quantity < ing.quantity) missing.push(ing.name);
    });
    return missing;
  };

  const handleNext = async () => {
    if (stepIndex < recipe.steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      const missing = checkMissing();
      if (missing.length > 0) {
        setResult({ success: false, message: `Faltan: ${missing.join(', ')}` });
        return;
      }
      const deducted = [];
      for (const ing of recipe.ingredients) {
        const product = inventory.find(p => p.name.toLowerCase() === ing.name.toLowerCase());
        if (product) {
          await updateQuantity(product.id, product.quantity - ing.quantity);
          deducted.push(`${ing.name} (-${ing.quantity} ${ing.unit})`);
        }
      }
      setResult({ success: true, deducted });
    }
  };

  if (result) {
    return (
      <View style={styles.cookModalContent}>
        <View style={styles.cookModalHeader}>
          <Ionicons name={result.success ? 'checkmark-circle' : 'alert-circle'} size={48} color={result.success ? COLORS.success : COLORS.danger} />
          <Text style={styles.cookModalTitle}>
            {result.success ? '¡Receta cocinada!' : 'Error'}
          </Text>
        </View>
        {result.success ? (
          <View style={styles.cookResultBox}>
            <Text style={styles.cookResultLabel}>Ingredientes descontados:</Text>
            {result.deducted.map((item, idx) => (
              <View key={idx} style={styles.cookResultItem}>
                <Ionicons name="checkmark" size={16} color={COLORS.success} />
                <Text style={styles.cookResultText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.cookResultBox}>
            <Text style={styles.cookResultLabel}>Faltan ingredientes:</Text>
            <Text style={styles.cookResultTextDanger}>{result.message}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.primaryButton} onPress={() => onFinish(result)}>
          <Text style={styles.primaryButtonText}>Entendido</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const missing = checkMissing();
  const canFinish = missing.length === 0;

  return (
    <View style={styles.cookingModalContent}>
      <View style={styles.cookingModalHeader}>
        <Text style={styles.cookingRecipeName}>{recipe.name}</Text>
        <Text style={styles.cookingStepCounter}>Paso {stepIndex + 1} de {recipe.steps.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.cookingStepContent}>
        <Text style={styles.cookingStepDescription}>{recipe.steps[stepIndex].description}</Text>
        {recipe.steps[stepIndex].ingredientsUsed?.length > 0 && (
          <View style={styles.cookingStepIngredientsBox}>
            <Text style={styles.cookingStepIngLabel}>Necesitas para este paso:</Text>
            <View style={styles.cookingStepIngChips}>
              {recipe.steps[stepIndex].ingredientsUsed.map((ingName, idx) => {
                const ingData = recipe.ingredients.find(i => i.name.toLowerCase() === ingName.toLowerCase());
                return (
                  <View key={idx} style={styles.cookingIngChip}>
                    <Ionicons name="cube" size={14} color={COLORS.accent} />
                    <Text style={styles.cookingIngChipText}>{ingData ? `${ingData.quantity} ${ingData.unit}` : ''} {ingName}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.cookingNavigation}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => stepIndex === 0 ? onBack() : setStepIndex(stepIndex - 1)}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          <Text style={styles.navButtonText}>
            {stepIndex === 0 ? 'Cambiar casa' : 'Anterior'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navButton, styles.navButtonNext, !canFinish && stepIndex === recipe.steps.length - 1 && styles.disabledBtn]} 
          onPress={handleNext}
          disabled={!canFinish && stepIndex === recipe.steps.length - 1}
        >
          <Text style={styles.navButtonText}>{stepIndex === recipe.steps.length - 1 ? 'Finalizar' : 'Siguiente'}</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- Componente para modo EXTERNO (sin HomeDataProvider) ---
function CookingSessionExternal({ recipe, onFinish, onBack }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState(null);

  const handleNext = () => {
    if (stepIndex < recipe.steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      setResult({ success: true, external: true });
    }
  };

  if (result) {
    return (
      <View style={styles.cookModalContent}>
        <View style={styles.cookModalHeader}>
          <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
          <Text style={styles.cookModalTitle}>¡Receta cocinada (Externo)!</Text>
        </View>
        <View style={styles.cookResultBox}>
          <Text style={styles.cookResultLabel}>Cocinado en lugar externo</Text>
          <Text style={styles.cookResultText}>El inventario no ha sido modificado.</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={() => onFinish(result)}>
          <Text style={styles.primaryButtonText}>Entendido</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.cookingModalContent}>
      <View style={styles.cookingModalHeader}>
        <Text style={styles.cookingRecipeName}>{recipe.name}</Text>
        <Text style={styles.cookingStepCounter}>Paso {stepIndex + 1} de {recipe.steps.length}</Text>
        <View style={styles.externalBadge}>
          <Ionicons name="airplane" size={12} color={COLORS.accent} />
          <Text style={styles.externalBadgeText}>Modo Externo</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.cookingStepContent}>
        <Text style={styles.cookingStepDescription}>{recipe.steps[stepIndex].description}</Text>
        {recipe.steps[stepIndex].ingredientsUsed?.length > 0 && (
          <View style={styles.cookingStepIngredientsBox}>
            <Text style={styles.cookingStepIngLabel}>Necesitas para este paso:</Text>
            <View style={styles.cookingStepIngChips}>
              {recipe.steps[stepIndex].ingredientsUsed.map((ingName, idx) => {
                const ingData = recipe.ingredients.find(i => i.name.toLowerCase() === ingName.toLowerCase());
                return (
                  <View key={idx} style={styles.cookingIngChip}>
                    <Ionicons name="cube" size={14} color={COLORS.accent} />
                    <Text style={styles.cookingIngChipText}>{ingData ? `${ingData.quantity} ${ingData.unit}` : ''} {ingName}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.cookingNavigation}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => stepIndex === 0 ? onBack() : setStepIndex(stepIndex - 1)}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          <Text style={styles.navButtonText}>
            {stepIndex === 0 ? 'Cambiar casa' : 'Anterior'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navButton, styles.navButtonNext]} onPress={handleNext}>
          <Text style={styles.navButtonText}>{stepIndex === recipe.steps.length - 1 ? 'Finalizar' : 'Siguiente'}</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- Componente para verificar ingredientes por casa ---
function HomeIngredientChecker({ recipe, homes, onSelectHome }) {
  const [homeStatuses, setHomeStatuses] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAllHomes = async () => {
      const statuses = {};
      
      for (const home of homes) {
        try {
          const inventoryRef = collection(db, 'homes', home.id, 'inventory');
          const snapshot = await getDocs(query(inventoryRef));
          const inventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          const missing = [];
          recipe.ingredients.forEach(ing => {
            const product = inventory.find(p => p.name.toLowerCase() === ing.name.toLowerCase());
            if (!product || product.quantity < ing.quantity) {
              missing.push(ing.name);
            }
          });
          
          statuses[home.id] = { missing, complete: missing.length === 0 };
        } catch (error) {
          console.error(`Error checking home ${home.name}:`, error);
          statuses[home.id] = { missing: [], complete: false, error: true };
        }
      }
      
      setHomeStatuses(statuses);
      setLoading(false);
    };

    checkAllHomes();
  }, [recipe, homes]);

  if (loading) {
    return (
      <View style={styles.checkerLoading}>
        <Text style={styles.checkerLoadingText}>Verificando inventario...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
      <TouchableOpacity style={styles.homeOptionExternal} onPress={() => onSelectHome(null)}>
        <View style={styles.homeOptionIconBoxExternal}>
          <Ionicons name="airplane" size={24} color={COLORS.accent} />
        </View>
        <View style={styles.homeOptionInfo}>
          <Text style={styles.homeOptionName}>Otro lugar (Casa ajena, hotel...)</Text>
          <Text style={styles.homeOptionSub}>No se descontará stock del inventario</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
      </TouchableOpacity>

      <View style={styles.separator} />
      <Text style={styles.sectionLabel}>Tus casas</Text>

      {homes.length === 0 ? (
        <Text style={styles.noHomesText}>No tienes casas registradas.</Text>
      ) : (
        homes.map((home) => {
          const status = homeStatuses[home.id];
          const isComplete = status?.complete;
          const missing = status?.missing || [];
          
          return (
            <TouchableOpacity 
              key={home.id} 
              style={[styles.homeOption, !isComplete && styles.homeOptionIncomplete]} 
              onPress={() => onSelectHome(home.id)}
            >
              <View style={[styles.homeOptionIconBox, !isComplete && styles.homeOptionIconBoxIncomplete]}>
                <Ionicons 
                  name={isComplete ? "checkmark-circle" : "warning"} 
                  size={24} 
                  color={isComplete ? COLORS.success : COLORS.warning} 
                />
              </View>
              <View style={styles.homeOptionInfo}>
                <Text style={styles.homeOptionName}>{home.name}</Text>
                {isComplete ? (
                  <Text style={styles.homeOptionSubComplete}>✅ Todos los ingredientes disponibles</Text>
                ) : (
                  <Text style={styles.homeOptionSubMissing}>
                    ⚠️ Faltan: {missing.slice(0, 3).join(', ')}{missing.length > 3 ? '...' : ''}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

export default function RecipesScreen() {
  const { recipes, addRecipe, deleteRecipe } = useApp();
  const { homes } = useHomes();
  
  const [searchText, setSearchText] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '', unit: 'unidades' }]);
  const [steps, setSteps] = useState([{ description: '', ingredientsUsed: [] }]);
  
  const [showHomeModal, setShowHomeModal] = useState(false);
  const [pendingRecipe, setPendingRecipe] = useState(null);
  const [activeHomeId, setActiveHomeId] = useState(null);
  const [showCookingModal, setShowCookingModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const inventoryNames = recipes.reduce((acc, r) => {
    r.ingredients.forEach(i => { if (!acc.includes(i.name)) acc.push(i.name); });
    return acc;
  }, []);

  const addIngredientRow = () => setIngredients([...ingredients, { name: '', quantity: '', unit: 'unidades' }]);
  const updateIngredient = (index, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };
  const removeIngredient = (index) => {
    if (ingredients.length === 1) { Alert.alert('Atención', 'La receta debe tener al menos un ingrediente'); return; }
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addStep = () => setSteps([...steps, { description: '', ingredientsUsed: [] }]);
  const updateStep = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };
  const toggleStepIngredient = (stepIndex, ingredientName) => {
    const newSteps = [...steps];
    const currentUsed = newSteps[stepIndex].ingredientsUsed;
    const alreadyUsed = currentUsed.includes(ingredientName);
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      ingredientsUsed: alreadyUsed ? currentUsed.filter(n => n !== ingredientName) : [...currentUsed, ingredientName]
    };
    setSteps(newSteps);
  };
  const removeStep = (index) => {
    if (steps.length === 1) { Alert.alert('Atención', 'La receta debe tener al menos un paso'); return; }
    setSteps(steps.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setRecipeName('');
    setIngredients([{ name: '', quantity: '', unit: 'unidades' }]);
    setSteps([{ description: '', ingredientsUsed: [] }]);
  };

  const handleAddRecipe = () => {
    if (!recipeName.trim()) { Alert.alert('Atención', 'El nombre de la receta es obligatorio'); return; }
    const validIngredients = ingredients.filter(i => i.name.trim() && i.quantity);
    if (validIngredients.length === 0) { Alert.alert('Atención', 'Añade al menos un ingrediente con cantidad'); return; }
    const validSteps = steps.filter(s => s.description.trim());
    if (validSteps.length === 0) { Alert.alert('Atención', 'Añade al menos un paso con descripción'); return; }

    validIngredients.forEach(ing => {
      const exists = inventoryNames.some(n => n.toLowerCase() === ing.name.trim().toLowerCase());
      if (!exists) inventoryNames.push(ing.name.trim());
    });

    addRecipe({
      name: recipeName.trim(),
      ingredients: validIngredients.map(i => ({ name: i.name.trim(), quantity: parseFloat(i.quantity), unit: i.unit })),
      steps: validSteps.map(s => ({ description: s.description.trim(), ingredientsUsed: s.ingredientsUsed }))
    });

    resetForm();
    setShowForm(false);
  };

  const openHomeSelection = (recipe) => {
    setPendingRecipe(recipe);
    setShowHomeModal(true);
  };

  const selectHomeAndCook = (homeId) => {
    setActiveHomeId(homeId);
    setShowHomeModal(false);
    setShowCookingModal(true);
  };

  const handleCookFinish = (result) => {
    setShowCookingModal(false);
    setActiveHomeId(null);
    setPendingRecipe(null);
  };

  const handleCookBack = () => {
    setShowCookingModal(false);
    setShowHomeModal(true);
  };

  const renderRecipe = ({ item }) => (
    <View style={styles.recipeItem}>
      <TouchableOpacity 
        style={styles.recipeTouchableContent} 
        onPress={() => setSelectedRecipe(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.recipeName}>{item.name}</Text>
        <Text style={styles.recipeIngredients} numberOfLines={1}>
          {item.ingredients.map(i => `${i.quantity} ${i.unit} de ${i.name}`).join(' • ')}
        </Text>
        <Text style={styles.recipeStepsCount}>
          {item.steps?.length || 0} paso{(item.steps?.length || 0) !== 1 ? 's' : ''}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.recipeActions}>
        <TouchableOpacity style={styles.cookBtn} onPress={() => openHomeSelection(item)}>
          <Ionicons name="flame" size={18} color={COLORS.text} />
          <Text style={styles.cookBtnText}>Cocinar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => {
          Alert.alert('Confirmar eliminación', `¿Seguro que quieres eliminar "${item.name}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => deleteRecipe(item.id) }
          ]);
        }}>
          <Ionicons name="trash" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topBarButton}>
          <Ionicons name="restaurant" size={22} color={COLORS.accent} />
          <Text style={styles.topBarButtonText}>{recipes.length} recetas</Text>
        </View>
        <TouchableOpacity style={[styles.topBarButton, styles.addButton]} onPress={() => setShowForm(true)}>
          <Ionicons name="add-circle" size={22} color={COLORS.text} />
          <Text style={styles.topBarButtonText}>Añadir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholder="Buscar receta o ingrediente..." placeholderTextColor={COLORS.textMuted} value={searchText} onChangeText={setSearchText} autoCapitalize="none" />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearchBtn}>
            <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={recipes.filter(recipe => {
          if (searchText === '') return true;
          const search = searchText.toLowerCase();
          const matchName = recipe.name.toLowerCase().includes(search);
          const matchIngredients = recipe.ingredients.some(ing => ing.name.toLowerCase().includes(search));
          return matchName || matchIngredients;
        })}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRecipe}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{searchText ? 'No se encontraron recetas' : 'No hay recetas guardadas'}</Text>
          </View>
        }
      />

      {/* MODAL: DETALLE DE RECETA */}
      <Modal visible={selectedRecipe !== null} animationType="slide" transparent={true} onRequestClose={() => setSelectedRecipe(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedRecipe?.name}</Text>
              <TouchableOpacity onPress={() => setSelectedRecipe(null)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.detailSectionTitle}>Ingredientes ({selectedRecipe?.ingredients.length})</Text>
              {selectedRecipe?.ingredients.map((ing, idx) => (
                <View key={idx} style={styles.detailIngredientRow}>
                  <View style={styles.detailIngIconBox}>
                    <Ionicons name="cube-outline" size={18} color={COLORS.accent} />
                  </View>
                  <View style={styles.detailIngInfo}>
                    <Text style={styles.detailIngName}>{ing.name}</Text>
                    <Text style={styles.detailIngQty}>{ing.quantity} {ing.unit}</Text>
                  </View>
                </View>
              ))}

              <Text style={[styles.detailSectionTitle, { marginTop: 20 }]}>Pasos ({selectedRecipe?.steps.length})</Text>
              {selectedRecipe?.steps.map((step, idx) => (
                <View key={idx} style={styles.detailStepRow}>
                  <View style={styles.detailStepNumber}>
                    <Text style={styles.detailStepNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.detailStepText}>{step.description}</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.cookFromDetailBtn} onPress={() => {
              const recipeToCook = selectedRecipe;
              setSelectedRecipe(null);
              openHomeSelection(recipeToCook);
            }}>
              <Ionicons name="flame" size={20} color={COLORS.text} />
              <Text style={styles.cookFromDetailText}>Cocinar esta receta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 1: SELECCIÓN DE CASA */}
      <Modal visible={showHomeModal} animationType="slide" transparent={true} onRequestClose={() => setShowHomeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.homeSelectModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>¿Dónde vas a cocinar?</Text>
              <TouchableOpacity onPress={() => setShowHomeModal(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {pendingRecipe && (
              <HomeIngredientChecker 
                recipe={pendingRecipe} 
                homes={homes} 
                onSelectHome={selectHomeAndCook} 
              />
            )}

            <TouchableOpacity 
              style={styles.cancelHomeBtn} 
              onPress={() => setShowHomeModal(false)}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
              <Text style={styles.cancelHomeBtnText}>Volver a las recetas</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: COCINADO */}
      <Modal visible={showCookingModal} animationType="slide" transparent={true} onRequestClose={() => setShowCookingModal(false)}>
        <View style={styles.cookingModalOverlay}>
          {activeHomeId ? (
            <HomeDataProvider homeId={activeHomeId}>
              <CookingSession recipe={pendingRecipe} homeId={activeHomeId} onFinish={handleCookFinish} onBack={handleCookBack} />
            </HomeDataProvider>
          ) : (
            <CookingSessionExternal recipe={pendingRecipe} onFinish={handleCookFinish} onBack={handleCookBack} />
          )}
        </View>
      </Modal>

      {/* MODAL 3: AÑADIR RECETA */}
      <Modal visible={showForm} animationType="slide" transparent={true} onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva receta</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formScroll}>
              <TextInput style={styles.input} placeholder="Nombre de la receta" placeholderTextColor={COLORS.textMuted} value={recipeName} onChangeText={setRecipeName} autoCapitalize="sentences" />
              <Text style={styles.sectionTitle}>Ingredientes</Text>
              {ingredients.map((ing, index) => (
                <View key={index} style={styles.ingredientBlock}>
                  <View style={styles.ingredientRowTop}>
                    <View style={styles.ingredientNameContainer}>
                      <AutocompleteInput value={ing.name} onChangeText={(val) => updateIngredient(index, 'name', val)} suggestions={inventoryNames} placeholder="Ingrediente" />
                    </View>
                    <TouchableOpacity style={styles.removeIngBtn} onPress={() => removeIngredient(index)}>
                      <Ionicons name="close" size={20} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.ingredientRowBottom}>
                    <TextInput style={styles.ingredientQuantity} placeholder="Cant." placeholderTextColor={COLORS.textMuted} value={ing.quantity} onChangeText={(val) => updateIngredient(index, 'quantity', val)} keyboardType="decimal-pad" />
                    <UnitChips selected={ing.unit} onSelect={(unit) => updateIngredient(index, 'unit', unit)} />
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.addIngBtn} onPress={addIngredientRow}>
                <Ionicons name="add" size={18} color={COLORS.text} />
                <Text style={styles.addIngBtnText}>Añadir otro ingrediente</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Pasos de la receta</Text>
              {steps.map((step, index) => (
                <View key={index} style={styles.stepBlock}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <TouchableOpacity style={styles.removeStepBtn} onPress={() => removeStep(index)}>
                      <Ionicons name="close" size={18} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>
                  <TextInput style={styles.stepInput} placeholder="Describe este paso..." placeholderTextColor={COLORS.textMuted} value={step.description} onChangeText={(val) => updateStep(index, 'description', val)} multiline />
                  {ingredients.filter(i => i.name.trim()).length > 0 && (
                    <View style={styles.stepIngredientsSection}>
                      <Text style={styles.stepIngredientsLabel}>Ingredientes usados en este paso:</Text>
                      <View style={styles.stepIngredientsChips}>
                        {ingredients.filter(i => i.name.trim()).map((ing, idx) => {
                          const isSelected = step.ingredientsUsed.includes(ing.name.trim());
                          return (
                            <TouchableOpacity key={idx} style={[styles.stepIngredientChip, isSelected && styles.stepIngredientChipSelected]} onPress={() => toggleStepIngredient(index, ing.name.trim())}>
                              <Text style={[styles.stepIngredientChipText, isSelected && styles.stepIngredientChipTextSelected]}>{ing.name.trim()}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              ))}
              <TouchableOpacity style={styles.addIngBtn} onPress={addStep}>
                <Ionicons name="add" size={18} color={COLORS.text} />
                <Text style={styles.addIngBtnText}>Añadir otro paso</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleAddRecipe}>
                <Text style={styles.primaryButtonText}>Guardar receta</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: COLORS.card, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  topBarButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 15 },
  addButton: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 20 },
  topBarButtonText: { color: COLORS.text, fontSize: 12, marginTop: 4, fontWeight: '600' },
  listContent: { paddingBottom: 20, paddingTop: 15 },
  recipeItem: { backgroundColor: COLORS.card, marginHorizontal: 15, marginBottom: 10, borderRadius: 8, padding: 15, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  recipeTouchableContent: { flex: 1 },
  recipeName: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 6 },
  recipeIngredients: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  recipeStepsCount: { fontSize: 12, color: COLORS.accent, marginTop: 6, fontWeight: '600' },
  recipeActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  cookBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.success, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginRight: 10 },
  cookBtnText: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginLeft: 6 },
  deleteBtn: { backgroundColor: COLORS.danger, width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  emptyState: { padding: 60, alignItems: 'center' },
  emptyText: { fontSize: 18, color: COLORS.text, fontWeight: '600', marginTop: 15 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, marginHorizontal: 15, marginTop: 10, marginBottom: 10, borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 12 },
  clearSearchBtn: { padding: 5 },

  autocompleteContainer: { position: 'relative', zIndex: 10 },
  autocompleteInput: { backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 14, color: COLORS.text, fontSize: 15, height: 48 },
  suggestionsList: { position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, maxHeight: 150, zIndex: 20 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  suggestionText: { color: COLORS.text, fontSize: 14 },

  unitChipsContainer: { flexDirection: 'row', flex: 1 },
  unitChip: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginRight: 6 },
  unitChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.accent },
  unitChipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  unitChipTextSelected: { color: COLORS.text },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.accent, flex: 1 },
  formScroll: { paddingBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.accent, marginBottom: 12, marginTop: 10 },
  input: { backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 14, marginBottom: 15, color: COLORS.text, fontSize: 15 },
  ingredientBlock: { backgroundColor: COLORS.cardLight, padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  ingredientRowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  ingredientNameContainer: { flex: 1, marginRight: 10 },
  removeIngBtn: { backgroundColor: COLORS.danger, width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  ingredientRowBottom: { flexDirection: 'row', alignItems: 'center' },
  ingredientQuantity: { width: 90, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, height: 40, color: COLORS.text, fontSize: 15, marginRight: 10 },
  stepBlock: { backgroundColor: COLORS.cardLight, padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  stepNumber: { backgroundColor: COLORS.primary, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  removeStepBtn: { backgroundColor: COLORS.danger, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  stepInput: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, color: COLORS.text, fontSize: 14, marginBottom: 10, minHeight: 60, textAlignVertical: 'top' },
  stepIngredientsSection: { marginTop: 5 },
  stepIngredientsLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  stepIngredientsChips: { flexDirection: 'row', flexWrap: 'wrap' },
  stepIngredientChip: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginRight: 6, marginBottom: 6 },
  stepIngredientChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.accent },
  stepIngredientChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  stepIngredientChipTextSelected: { color: COLORS.text },
  addIngBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cardLight, padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.textSecondary },
  addIngBtnText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  primaryButton: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.accent, flexDirection: 'row', justifyContent: 'center' },
  primaryButtonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

  // Detalle de receta
  detailModalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', padding: 20 },
  detailScroll: { paddingBottom: 20 },
  detailSectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.accent, marginBottom: 15 },
  detailIngredientRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardLight, padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  detailIngIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  detailIngInfo: { flex: 1 },
  detailIngName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  detailIngQty: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  detailStepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  detailStepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
  detailStepNumberText: { color: COLORS.text, fontSize: 14, fontWeight: 'bold' },
  detailStepText: { flex: 1, fontSize: 15, color: COLORS.text, lineHeight: 22 },
  cookFromDetailBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.success, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: COLORS.accent, marginTop: 10 },
  cookFromDetailText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

  // Modal selección casa
  homeSelectModalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: 20 },
  homeOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  homeOptionIncomplete: { backgroundColor: 'rgba(243, 156, 18, 0.05)' },
  homeOptionExternal: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, backgroundColor: 'rgba(212, 175, 55, 0.1)', borderRadius: 12, paddingHorizontal: 10, marginBottom: 10 },
  homeOptionIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.cardLight, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  homeOptionIconBoxIncomplete: { backgroundColor: 'rgba(243, 156, 18, 0.2)' },
  homeOptionIconBoxExternal: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(212, 175, 55, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  homeOptionInfo: { flex: 1 },
  homeOptionName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  homeOptionSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  homeOptionSubComplete: { fontSize: 12, color: COLORS.success, marginTop: 2, fontWeight: '600' },
  homeOptionSubMissing: { fontSize: 12, color: COLORS.warning, marginTop: 2, fontWeight: '600' },
  separator: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  sectionLabel: { fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 10, fontWeight: '600' },
  noHomesText: { color: COLORS.textMuted, textAlign: 'center', fontStyle: 'italic' },
  checkerLoading: { padding: 40, alignItems: 'center' },
  checkerLoadingText: { color: COLORS.textSecondary, fontSize: 14 },
  cancelHomeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 8, backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border, marginTop: 15 },
  cancelHomeBtnText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600', marginLeft: 8 },

  // Cocinado
  cookingModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  cookingModalContent: { backgroundColor: COLORS.card, borderRadius: 20, width: '90%', maxHeight: '80%', overflow: 'hidden', borderWidth: 1, borderColor: COLORS.accent },
  cookingModalHeader: { backgroundColor: COLORS.primaryDark, padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cookingRecipeName: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 5, textAlign: 'center' },
  cookingStepCounter: { fontSize: 16, color: COLORS.accent, fontWeight: '600' },
  externalBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212, 175, 55, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 10 },
  externalBadgeText: { color: COLORS.accent, fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
  cookingStepContent: { padding: 25, flexGrow: 1 },
  cookingStepDescription: { fontSize: 20, color: COLORS.text, lineHeight: 28, marginBottom: 25, fontWeight: '500' },
  cookingStepIngredientsBox: { backgroundColor: COLORS.cardLight, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  cookingStepIngLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 10, fontWeight: '600' },
  cookingStepIngChips: { flexDirection: 'row', flexWrap: 'wrap' },
  cookingIngChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: COLORS.accent },
  cookingIngChipText: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginLeft: 6 },
  cookingNavigation: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.card },
  navButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, marginHorizontal: 5 },
  navButtonDisabled: { backgroundColor: COLORS.cardLight, opacity: 0.5 },
  navButtonNext: { backgroundColor: COLORS.success, borderWidth: 1, borderColor: COLORS.accent },
  disabledBtn: { opacity: 0.5 },
  navButtonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginHorizontal: 8 },
  navButtonTextDisabled: { color: COLORS.textMuted },

  cookModalContent: { backgroundColor: COLORS.card, borderRadius: 20, padding: 25, margin: 20, alignItems: 'center' },
  cookModalHeader: { alignItems: 'center', marginBottom: 20 },
  cookModalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginTop: 10 },
  cookResultBox: { width: '100%', backgroundColor: COLORS.cardLight, padding: 15, borderRadius: 12, marginBottom: 20 },
  cookResultLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10 },
  cookResultItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cookResultText: { fontSize: 15, color: COLORS.text, marginLeft: 8 },
  cookResultTextDanger: { fontSize: 15, color: COLORS.danger, fontWeight: '600', marginBottom: 10 },
}); 