# Dashboard Screen with Role-Based Stats + Bottom Navigation Implementation Plan

## Overview
Implement Dashboard Screen with role-based stats + Bottom Navigation for Alba Fintech Android app.

## Current State Analysis

**✅ Already Implemented:**
- DashboardScreen.kt - Role-based dashboards (SUPERADMIN, PIMPINAN, MANAGER, STAFF)
- DashboardViewModel.kt - loadDashboardStats(role, unitId)
- DashboardComponents.kt - SummaryCard, FinancialSummaryCard, etc.
- BottomNavigationBar.kt component (exists but NOT integrated)
- AlbaApiService - GET /api/dashboard/stats endpoint
- TransactionRepository.getDashboardStats()
- DashboardStats model with all required fields
- Navigation 3 with NavBackStack

**❌ Missing/To Implement:**
1. BottomNavigationBar integration into Navigation 3
2. ApprovalsScreen - Not created
3. ProfileScreen - Not created
4. NavKeys - Missing ApprovalsScreen, ProfileScreen keys
5. Navigation 3 integration with BottomNavigationBar (NavDisplay)
6. SUPERADMIN drawer navigation instead of bottom nav
7. @Preview annotations on all composables
6. Build and test

## Implementation Plan

### Phase 1: Core Navigation Keys & Screens
1. **Update NavKeys.kt** - Add ApprovalsScreen, ProfileScreen keys
2. **Create ApprovalsScreen.kt** - Show pending transactions for approval
3. **Create ProfileScreen.kt** - User profile with logout
4. **Update NavKeys.kt** - Add new navigation keys

### Phase 2: Navigation Integration
1. **Update AppNavigation.kt** - Integrate BottomNavigationBar with NavDisplay
2. **Update NavKeys.kt** - Add ApprovalsScreen, ProfileScreen keys
3. **Handle SUPERADMIN** - Use ModalNavigationDrawer instead of BottomNavigationBar
4. **Update NavKeys.kt** - Add ApprovalsScreen, ProfileScreen

### Phase 3: Screens & Components
1. **Update DashboardScreen.kt** - Add @Preview, ensure edge-to-edge
2. **Update BottomNavigationBar.kt** - Add proper NavItem definitions
3. **Create ApprovalsScreen** - Show pending transactions for approval
4. **Create ProfileScreen** - User profile with logout
5. **Add @Preview** to all composables

### Phase 4: Build & Verify
1. Build: `./gradlew :app:assembleDebug`
2. Verify no crashes
2. Verify all screens render correctly

## Files to Create/Modify

### New Files:
1. `ui/approvals/ApprovalsScreen.kt` - Approvals screen for pending approvals
2. `ui/profile/ProfileScreen.kt` - User profile screen
3. `ui/approvals/ApprovalsViewModel.kt` - ViewModel for approvals

### Modified Files:
1. `NavKeys.kt` - Add ApprovalsScreen, ProfileScreen
2. `AppNavigation.kt` - Integrate BottomNavigationBar with NavDisplay
3. `BottomNavigationBar.kt` - Update NavItem definitions
4. `DashboardScreen.kt` - Add @Preview, edge-to-edge support
5. `NavKeys.kt` - Add ApprovalsScreen, ProfileScreen keys
6. `AppNavigation.kt` - Integrate BottomNavigationBar with NavDisplay + SuperAdmin drawer

### New Files for Previews:
- All composables need @Preview functions

## Verification Plan
1. Run `./gradlew :app:assembleDebug` - Build must succeed
2. Verify app launches without crash
2. Verify all screens render correctly
2. Verify navigation works between Dashboard, Transactions, Approvals, Profile
2. Verify role-based dashboards display correctly
2. Verify SuperAdmin gets drawer, others get bottom nav

## Task Dependencies
1. NavKeys → AppNavigation (depends on keys)
2. ApprovalsScreen/ProfileScreen → AppNavigation (need screens for nav)
3. BottomNavigationBar → AppNavigation (needs integration)
4. DashboardScreen → Preview (already exists, just add preview)
4. Build → Run verification

## Verification Steps
1. Run `./gradlew :app:assembleDebug` - Build must succeed
2. Verify app launches without crash
2. Verify Dashboard, Transactions, Approvals, Profile navigation works
2. Verify role-based dashboards display correctly
2. Verify SuperAdmin gets drawer, others get bottom nav