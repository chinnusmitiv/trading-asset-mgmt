# UX Specification & Design System

## 1. Design Philosophy: Fintech Dark & Premium Light

The Asset Management Mobile App is an operational command center. It must feel **trustworthy, precise, fast, and modern**.
- **Dark Mode First**: Optimized for trading desks and high data density.
- **Deep Contrast & Color Harmony**: Slate foundations with vibrant status indicators.

---

## 2. Color Palette & Design Tokens

| Token | Hex Value | Semantic Usage |
| :--- | :--- | :--- |
| `background.primary` | `#0B0F19` | Deepest background (Dark Slate) |
| `background.secondary`| `#111827` | Screen secondary background |
| `background.card` | `#161F36` | Card background & elevated containers |
| `background.elevated` | `#1E293B` | Modals, bottom sheets, search inputs |
| `border.subtle` | `#2D3748` | Card borders, dividers |
| `text.primary` | `#F8FAFC` | Primary headings, KPI figures |
| `text.secondary` | `#94A3B8` | Labels, captions, metadata |
| `text.muted` | `#64748B` | Subtle hints, timestamps |
| `accent.primary` | `#10B981` | Emerald Green (Positive P&L, Success, Paid) |
| `accent.cyan` | `#06B6D4` | Cyan (Capital, Trading, Information) |
| `accent.amber` | `#F59E0B` | Amber (Pending, Warning, Approvals) |
| `accent.rose` | `#F43F5E` | Rose / Crimson (Loss, Expense, Cancelled) |
| `accent.indigo` | `#6366F1` | Indigo / Violet (Investors, Staff, Policies) |

---

## 3. Typography & Formats

- **Headers / Large KPIs**: Bold, high contrast, clean sans-serif (Inter / System Font).
- **Currency Format**: Indian Rupee format with proper comma separators (`₹1,25,00,000`, `₹4,50,000`, `₹25,000`).
- **Date Format**: `02 Sep 2026` or `02 Sep 2026, 03:45 PM`.

---

## 4. Reusable Component Hierarchy

```text
src/components/common/
  ├── AppHeader.tsx          (Title, user avatar, environment badge, notifications)
  ├── KpiCard.tsx            (Metric label, large formatted value, delta badge, icon)
  ├── FinancialCard.tsx      (Structured multi-row financial breakdown with highlight bar)
  ├── Button.tsx             (Primary, Secondary, Outline, Danger variants with loading state)
  ├── Input.tsx              (Clean labeled input with error state and icon support)
  ├── CurrencyInput.tsx      (Auto-formatting INR input with ₹ prefix)
  ├── PercentageInput.tsx    (Input with % suffix and 0-100 clamping)
  ├── StatusBadge.tsx        (Pill badge with colored background and dot: Active, Paid, Pending, etc.)
  ├── SummaryRow.tsx         (Label-value row with optional bolding or colored values)
  ├── SearchBar.tsx          (Debounced search bar with clear button)
  ├── EmptyState.tsx         (Icon, message, call to action)
  ├── LoadingState.tsx       (Skeleton / spinner loader)
  ├── ErrorState.tsx         (Error icon, clear financial error explanation, retry button)
  └── ConfirmationDialog.tsx (Action confirmation modal showing exact amount before mutating)
```

---

## 5. Navigation & Ergonomics

- **Bottom Navigation**: 6 intuitive tabs: `Dashboard`, `Investors`, `Trading`, `Staff`, `Finance`, `More`.
- **One-Hand Accessibility**: Large touch targets (minimum 44x44 pt), key actions placed in lower screen third.
- **Micro-Interactions**: Smooth active states, pull-to-refresh indicators, clear feedback toasts.
