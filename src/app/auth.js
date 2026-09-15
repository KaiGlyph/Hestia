// src/app/auth.js
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';

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
};

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Email y contraseña son obligatorios');
      return;
    }
    if (!isLogin && !username.trim()) {
      Alert.alert('Error', 'El nombre de usuario es obligatorio');
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    const result = isLogin 
      ? await login(email, password) 
      : await register(email, password, username);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Error', result.error);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image source={require('../../assets/Hestia.png')} style={styles.logo} resizeMode="contain" onError={() => {}} />
          <Ionicons name="flame" size={40} color={COLORS.accent} style={styles.logoFallback} />
          <Text style={styles.title}>Hestia</Text>
          <Text style={styles.subtitle}>{isLogin ? 'Inicia sesión' : 'Crea tu cuenta'}</Text>
        </View>

        <View style={styles.formCard}>
          {!isLogin && (
            <TextInput
              style={styles.input}
              placeholder="Nombre de usuario"
              placeholderTextColor={COLORS.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View style={styles.passwordContainer}>
            <TextInput style={styles.passwordInput} placeholder="Contraseña" placeholderTextColor={COLORS.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <View style={styles.passwordContainer}>
              <TextInput style={styles.passwordInput} placeholder="Confirmar contraseña" placeholderTextColor={COLORS.textMuted} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={[styles.primaryButton, loading && styles.disabledButton]} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? 'Procesando...' : isLogin ? 'Iniciar sesión' : 'Registrarse'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.switchButton} onPress={() => { setIsLogin(!isLogin); setUsername(''); setConfirmPassword(''); }}>
          <Text style={styles.switchButtonText}>
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 100, height: 100 },
  logoFallback: { position: 'absolute', top: 30, opacity: 0.3 },
  title: { fontSize: 36, fontWeight: 'bold', color: COLORS.accent, marginTop: 10 },
  subtitle: { fontSize: 18, color: COLORS.textSecondary, marginTop: 5 },
  formCard: { backgroundColor: COLORS.card, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  input: { backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 14, marginBottom: 15, color: COLORS.text, fontSize: 15 },
  passwordContainer: { position: 'relative', marginBottom: 15 },
  passwordInput: { backgroundColor: COLORS.cardLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 14, paddingRight: 50, color: COLORS.text, fontSize: 15 },
  eyeIcon: { position: 'absolute', right: 15, top: 14, padding: 5 },
  primaryButton: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.accent, marginTop: 10 },
  primaryButtonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  disabledButton: { opacity: 0.5 },
  switchButton: { marginTop: 20, alignItems: 'center' },
  switchButtonText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
});