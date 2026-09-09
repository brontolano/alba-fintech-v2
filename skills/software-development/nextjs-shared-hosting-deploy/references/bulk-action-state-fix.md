# Bulk Action State Management Fix - React/Next.js

## Problem Pattern: Button Click Does Nothing

### Symptom
- User clicks "Setujui Semua" / "Hapus Semua" button
- Modal appears / Action appears to run
- **Data does not change** on refresh
- No errors in console

### Root Cause
State update only removes items without updating their status. After API call completes, the UI state is out of sync with server state.

### ❌ Wrong Pattern
```tsx
const executeBulkAction = async (action) => {
  await Promise.all(selectedIds.map(id => fetch(...)));
  setApprovals(prev => prev.filter(a => !selectedIds.includes(a.id))); // Removes items, doesn't update status!
  setSelectedIds([]);
};
```

### ✅ Correct Pattern
```tsx
const executeBulkAction = async (action) => {
  // Get responses from API
  const results = await Promise.all(
    selectedIds.map(async (id) => {
      const res = await fetch('/api/endpoint', { method: 'POST', body: JSON.stringify({id, action}) });
      const result = await res.json();
      return { id, status: result.data?.status ?? (action === 'approve' ? 'APPROVED' : 'REJECTED') };
    })
  );
  
  // Update state with server response
  setItems(prev => prev.map(item => {
    const updated = results.find(r => r.id === item.id);
    return updated ? { ...item, status: updated.status } : item;
  }));
  
  // Clear selection
  setSelectedIds([]);
};
```

## Checklist Before Shipping Bulk Actions

- [ ] API returns updated data with correct status
- [ ] State update uses API response, not assumptions
- [ ] Items are removed/updated consistently
- [ ] Loading state shows during API call
- [ ] Error handling shows user feedback
- [ ] Modal closes only AFTER action completes

## Files Affected
- `src/components/shared/ApprovalsPage.tsx` - FIXED
- `src/components/shared/UsersPage.tsx` - NEEDS CHECK
- `src/components/shared/UnitsPage.tsx` - NEEDS CHECK  
- `src/components/shared/AccountsPage.tsx` - NEEDS CHECK
- `src/components/shared/InventoryPage.tsx` - NEEDS CHECK

## Session Notes
- Fix applied: 2026-09-02
- ApprovalsPage: Updated `handleAction` and `executeBulkAction`
- Single action: Now awaits response and updates state
- Bulk action: Now maps all responses and updates each item's status