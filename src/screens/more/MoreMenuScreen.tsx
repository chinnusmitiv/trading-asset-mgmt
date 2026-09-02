import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { useAuth } from '../../store/AuthContext';
import { useSettings } from '../../store/SettingsContext';

export const MoreMenuScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout, switchRole } = useAuth();
  const { useMockData } = useSettings();

  const handleLogout = () => {
    logout();
  };

  const menuSections = [
    {
      title: 'FINANCIAL & OPERATIONS',
      items: [
        { title: 'Office Expenses', icon: '💳', subtitle: 'Submit and approve bills', route: 'Finance' },
        { title: 'Staff Salaries', icon: '💰', subtitle: 'Payroll calculation and slips', route: 'Finance' },
        { title: 'Document Vault', icon: '📁', subtitle: 'Agreements, KYC, Bank proofs on Drive' },
        { title: 'Financial Reports', icon: '📊', subtitle: 'Export P&L, Investor statements' },
        { title: 'Business Policies', icon: '📜', subtitle: 'Versioned return and commission rates' }
      ]
    },
    {
      title: 'SECURITY & GOVERNANCE',
      items: [
        { title: 'Audit Trail', icon: '🛡️', subtitle: 'Immutable transaction ledger', route: 'AuditLog' },
        { title: 'Settings & Backend', icon: '⚙️', subtitle: 'API endpoints, Database mode', route: 'Settings' }
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="More Operations"
        subtitle="Governance, Settings & Controls"
        user={user}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* User Role Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.fullName || 'Active User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'admin@assetmgmt.internal'}</Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>ROLE: {user?.role.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Quick Role Tester in Dev Mode */}
        {useMockData ? (
          <View style={styles.roleSwitcherBox}>
            <Text style={styles.roleSwitcherLabel}>Switch Role (Testing/QA Mode):</Text>
            <View style={styles.roleButtonsRow}>
              {(['Admin', 'Manager', 'Staff'] as const).map(role => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleBtn,
                    user?.role === role && styles.roleBtnActive
                  ]}
                  onPress={() => switchRole(role)}
                >
                  <Text
                    style={[
                      styles.roleBtnText,
                      user?.role === role && styles.roleBtnTextActive
                    ]}
                  >
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {/* Menu Items */}
        {menuSections.map((section, sIdx) => (
          <View key={sIdx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, iIdx) => (
                <TouchableOpacity
                  key={iIdx}
                  style={[
                    styles.menuItem,
                    iIdx < section.items.length - 1 && styles.menuItemBorder
                  ]}
                  onPress={() => {
                    if (item.route) {
                      navigation.navigate(item.route);
                    } else {
                      Alert.alert(item.title, `${item.title} module will be available in next phase.`);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <View style={styles.menuTextGroup}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>🚪 Log Out Operator Session</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Asset Management Operations v1.0.0 (Phase 1)</Text>
          <Text style={styles.archText}>Google Apps Script + React Native Engine</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background.primary
  },
  container: {
    flex: 1
  },
  scrollContent: {
    padding: THEME.spacing.md,
    paddingBottom: THEME.spacing.xxl
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    marginBottom: THEME.spacing.md
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.colors.accent.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.md
  },
  avatarTextLarge: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800'
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  userEmail: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    marginTop: 2
  },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6
  },
  roleTagText: {
    color: THEME.colors.accent.indigo,
    fontSize: 10,
    fontWeight: '800'
  },
  roleSwitcherBox: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    marginBottom: THEME.spacing.md
  },
  roleSwitcherLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted,
    marginBottom: 8
  },
  roleButtonsRow: {
    flexDirection: 'row',
    gap: 8
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.background.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  roleBtnActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  roleBtnText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '600'
  },
  roleBtnTextActive: {
    color: '#FFF',
    fontWeight: '700'
  },
  section: {
    marginBottom: THEME.spacing.lg
  },
  sectionTitle: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 0.8,
    marginBottom: THEME.spacing.xs,
    marginLeft: 4
  },
  sectionCard: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    overflow: 'hidden'
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.background.divider
  },
  menuIcon: {
    fontSize: 20,
    marginRight: THEME.spacing.md
  },
  menuTextGroup: {
    flex: 1
  },
  menuTitle: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  menuSubtitle: {
    fontSize: 11,
    color: THEME.colors.text.secondary,
    marginTop: 2
  },
  chevron: {
    fontSize: 20,
    color: THEME.colors.text.muted,
    marginLeft: 8
  },
  logoutButton: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: THEME.spacing.md,
    alignItems: 'center',
    marginVertical: THEME.spacing.md
  },
  logoutText: {
    color: THEME.colors.accent.rose,
    fontWeight: '700',
    fontSize: THEME.typography.fontSize.sm
  },
  footer: {
    alignItems: 'center',
    marginTop: THEME.spacing.sm
  },
  versionText: {
    fontSize: 11,
    color: THEME.colors.text.muted
  },
  archText: {
    fontSize: 10,
    color: THEME.colors.text.muted,
    marginTop: 2
  }
});
