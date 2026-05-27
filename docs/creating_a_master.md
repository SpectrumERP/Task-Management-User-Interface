# Task Management System: Architecture, UI Library, & Creating a Master Module

This documentation provides an in-depth analysis of the Task Management workspace and details the exact developer steps required to implement or extend a **Master Module**.

---

## 1. Project Architecture Overview

The application is built on a modern, high-performance web stack featuring:
*   **Core**: React (v18+) & TypeScript.
*   **Bundler & Dev Server**: Vite (highly optimized).
*   **Styling**: Tailwind CSS for custom utility styling alongside premium custom stylesheets (`App.css`, `index.css`).
*   **Routing**: `react-router-dom` handles page navigation and dynamic sub-routing (e.g., `/master/:form`).
*   **State Management**: Zustand-powered stores (`useAuthStore`, `useTaskStore`, `useMasterStore`) providing local persistence overlays (`glacier_masters_persistence` in `localStorage`).
*   **Icons**: `lucide-react` for premium micro-icons.
*   **API Interceptor**: An centralized API service (`src/services/apiService.ts`) for axios-like GET/POST/DELETE handling.

---

## 2. Shared Components in `src/components/ui/`

The `ui` directory houses highly reusable, polished components customized for the application's unique visual system (featuring rounded gradients, HSL hues, deep shadows, and subtle animations).

### Custom / Specialized Widgets
| Component | File Path | Description |
| :--- | :--- | :--- |
| **Combobox** | `ui/Combobox.tsx` | Elegant searchable dropdown field supporting custom selections. |
| **DatePicker** | `ui/DatePicker.tsx` | Calendar popover wrapper optimized for single date captures. |
| **DateRangePicker** | `ui/DateRangePicker.tsx` | Double-calendar selection widget mapping date boundaries. |
| **DateTimePicker** | `ui/DateTimePicker.tsx` | Date-time combination picker mapping timestamp dates. |
| **TagInput** | `ui/TagInput.tsx` | Interactive chip/badge list input for multi-tag assignments. |
| **UserAvatar** | `ui/UserAvatar.tsx` | Display widget rendering initials/avatar images with status rings. |
| **UserCombobox** | `ui/UserCombobox.tsx` | Contextual combobox linking search behaviors directly to company user indexes. |

### Standard Radix UI / Shadcn Elements
*   **Accordion** (`ui/accordion.tsx`): Expandable vertically-stacked content cards.
*   **Avatar** (`ui/avatar.tsx`): Raw visual container for profile graphics.
*   **Badge** (`ui/badge.tsx`): Sleek colorful chips displaying status markers.
*   **Button** (`ui/button.tsx`): Standardized buttons utilizing visual variations (`ghost`, `outline`, `destructive`, etc.).
*   **Calendar** (`ui/calendar.tsx`): Custom date-grid panel powered by `react-day-picker`.
*   **Card** (`ui/card.tsx`): Standard modular panels containing header, content, and footer layout sections.
*   **Checkbox** (`ui/checkbox.tsx`): Interactive toggles conforming to dark/light variants.
*   **Command** (`ui/command.tsx`): Command prompt search overlays (via `cmdk`).
*   **Dialog** (`ui/dialog.tsx`): Beautiful responsive popovers, confirm alerts, and overlay modals.
*   **DropdownMenu** (`ui/dropdown-menu.tsx`): Floating dropdown menus.
*   **Input** (`ui/input.tsx`): Customized textual input templates.
*   **Label** (`ui/label.tsx`): Accessible descriptor tags linked with inputs.
*   **Popover** (`ui/popover.tsx`): Anchored pop-out floating panels.
*   **ScrollArea** (`ui/scroll-area.tsx`): Customized modern scrollbars.
*   **Select** (`ui/select.tsx`): Select form dropdown fields.
*   **Slider** (`ui/slider.tsx`): Linear value sliders.
*   **Tabs** (`ui/tabs.tsx`): Horizontal view-switching tabs.
*   **Textarea** (`ui/textarea.tsx`): Multi-line feedback message text blocks.

---

## 3. How Masters Are Handled

Rather than separating code across separate files for Category, Type, Priority, etc., this codebase implements a **single, unified, polymorphic controller**: **`MasterManager.tsx`** (located in `src/components/master/`).

It routes a variable `type` parameter matching this TS signature:
```typescript
interface MasterManagerProps {
  type: 'category' | 'type' | 'priority' | 'folder' | 'user-group' | 'benefit-type' | 'location';
}
```

The component automatically handles:
1.  **State Management**: Dynamic list binding and pagination.
2.  **Polymorphic API Orchestration**: Fetches lists via unique backend endpoints (`/api/master/task-categories/search-data`, `/api/master/task-locations/search-data`, etc.) based on the active `type`.
3.  **Dynamic Rendering**: Form components render dynamic input configurations via `renderFormContent()` depending on whether the current route dictates location fields, duration lists, parent folder drop-downs, or user selection grids.

---

## 4. Step-by-Step Guide to Creating a Master Module

Suppose we want to add a brand new Master module, e.g., **"Division Master"** (`division`):

### Step 1: Update Route Configurations in `App.tsx`
Open `src/App.tsx` and add your new master key (e.g., `'division'`) to the valid routing lists:

```typescript
// 1. Locate the valid forms array in MasterPageRoute()
const validForms = ['category', 'type', 'priority', 'folder', 'user-group', 'benefit-type', 'location', 'division'];

// 2. The routing structure will automatically process this key
//    Route path "/master/:form" -> triggers <MasterPageRoute /> -> renders <MasterManager type="division" />
```

### Step 2: Extend the Zustand Master Store
Open `src/store/useMasterStore.ts` to add type definitions and local persistence fallbacks (useful for offline support and mocking UI):

1.  **Define the Interface**:
    ```typescript
    export interface DivisionMaster {
      id: string;
      code: string;
      name: string;
      inactive: boolean;
      // Add other division-specific fields here
    }
    ```
2.  **Extend State Signature**:
    ```typescript
    interface MasterState {
      divisions: DivisionMaster[];
      addDivision: (item: Omit<DivisionMaster, 'id' | 'code'>) => void;
      updateDivision: (id: string, item: Partial<DivisionMaster>) => void;
      deleteDivision: (id: string) => void;
      // ...existing CRUD signatures
    }
    ```
3.  **Implement the Mutations inside the Zustand Creator**:
    ```typescript
    divisions: [
      { id: 'div-1', code: 'DIV-0001', name: 'West Division', inactive: false },
      { id: 'div-2', code: 'DIV-0002', name: 'East Division', inactive: false }
    ],
    addDivision: (item) => set((state) => {
      const id = `div-${Date.now()}`;
      const code = generateCode('DIV', state.divisions.length);
      return { divisions: [...state.divisions, { ...item, id, code }] };
    }),
    updateDivision: (id, item) => set((state) => ({
      divisions: state.divisions.map((d) => (d.id === id ? { ...d, ...item } : d))
    })),
    deleteDivision: (id) => set((state) => ({
      divisions: state.divisions.filter((d) => d.id !== id)
    })),
    ```

### Step 3: Integrate Prop Types inside `MasterManager.tsx`
Open `src/components/master/MasterManager.tsx` and modify the parameter interface:

```typescript
interface MasterManagerProps {
  type: 'category' | 'type' | 'priority' | 'folder' | 'user-group' | 'benefit-type' | 'location' | 'division';
}
```

### Step 4: Setup State and API Binding in `MasterManager.tsx`
Add specific hooks and API call triggers to communicate with Division endpoints:

1.  **Declare State Variables**:
    ```typescript
    const [apiDivisions, setApiDivisions] = useState<any[]>([]);
    const [isLoadingDivisions, setIsLoadingDivisions] = useState(false);
    ```
2.  **Create Fetches**:
    ```typescript
    const fetchDivisions = async () => {
      setIsLoadingDivisions(true);
      try {
        const response = await apiService.get<any>(`/api/master/divisions/search-data?companyNo=${companyNo}`);
        if (response) {
          const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
          const mapped = rawItems.map((d: any) => ({
            id: (d.divisionNo ?? '').toString(),
            code: d.code || '',
            name: d.divisionName || '',
            inactive: d.inactive,
            createdBy: d.createdByName || 'System',
            createdDate: d.createdDate || ''
          }));
          setApiDivisions(mapped);
        }
      } catch (error) {
        console.error("Failed to fetch API divisions:", error);
      } finally {
        setIsLoadingDivisions(false);
      }
    };
    ```
3.  **Trigger in React Lifecycle (`useEffect`)**:
    ```typescript
    useEffect(() => {
      if (type === 'location') {
        // ...
      } else if (type === 'division') {
        fetchDivisions();
      }
    }, [type]);
    ```

### Step 5: Define Master Details and List Binding
Locate `getMasterInfo()` inside `MasterManager.tsx` and configure the module header details:

```typescript
const getMasterInfo = () => {
  switch (type) {
    case 'division':
      return {
        title: 'Division Master',
        desc: 'Define and manage operations divisions',
        icon: Layers, // Lucide icon reference
        list: apiDivisions
      };
    // ...
  }
}
```
Ensure that the local list binder accommodates divisions:
```typescript
const list = type === 'division' ? apiDivisions : ...;
```

### Step 6: Handle Edit / Load Details
Map the edit loading logic in the form state effect inside `MasterManager.tsx`:

```typescript
useEffect(() => {
  if (isNew) {
    // Reset forms...
  } else if (isEdit && id) {
    if (type === 'division') {
      apiService.get<any>(`/api/master/divisions/load-data/${id}?companyNo=${companyNo}`).then((response) => {
        if (response) {
          const body = response.data || response;
          const dl = body.data || body;
          if (dl) {
            setName(dl.divisionName || dl.name || '');
            // Load other division fields here...
          }
        }
      });
    }
  }
}, [isNew, isEdit, id, type]);
```

### Step 7: Handle Save / Payload Construction
Modify `handleConfirmSave()` in `MasterManager.tsx` to compile the payload and POST it:

```typescript
if (editingId) {
  // Update
  if (type === 'division') {
    const payload = {
      divisionNo: parseInt(id) || null,
      divisionName: name,
      inactive: false,
    };
    await apiService.post('/api/master/divisions/save', payload);
    await fetchDivisions();
  }
} else {
  // Add
  if (type === 'division') {
    const payload = {
      divisionNo: null,
      divisionName: name,
      inactive: false,
    };
    await apiService.post('/api/master/divisions/save', payload);
    await fetchDivisions();
  }
}
```

### Step 8: Handle Delete Operations
Modify `confirmDelete()` inside `MasterManager.tsx` to handle division deletes:

```typescript
case 'division':
  apiService.delete(`/api/master/divisions/delete`, {
    params: { divisionNo: id }
  }).then(() => fetchDivisions()).catch(err => console.error(err));
  break;
```

### Step 9: Design Form and Table Layouts
Customize input fields and grid column tables within `renderFormContent()` and the render tables:

1.  **Form fields** (in `renderFormContent()`):
    If `division` requires only a standard code and name input, it is automatically handled by the default fields!
    If custom selectors or toggles are needed:
    ```typescript
    {type === 'division' && (
      <div className="space-y-3">
        {/* Custom fields here */}
      </div>
    )}
    ```
2.  **Data Columns** (in `table` headers & rows):
    Locate the `<thead>` and `<tbody>` of `MasterManager.tsx` to output columns.
    ```typescript
    // Under Table Header <thead>:
    {type === 'division' && (
      <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Custom Field</th>
    )}

    // Under Table Body <tbody>:
    {type === 'division' && (
      <td className="px-3.5 py-2 text-[11px] text-slate-600 font-bold">{item.customField}</td>
    )}
    ```

---

## 5. Verification Checklist

To verify your new Master:
1.  Navigate to `/master/division`.
2.  Assert that the Page header matches "Division Master".
3.  Perform a search queries check on mock data rows.
4.  Click **Add Record** -> Validate fields -> Click **Save** -> Verify confirmation modal operates.
5.  Edit the added record -> Verify values load in input correctly -> Click **Update**.
6.  Click the trash icon -> Click **Delete** in verification alert -> Validate deletion succeeds.
