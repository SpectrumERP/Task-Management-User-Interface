# Agent UI/UX Development Guidelines

When developing or modifying forms, tables, and UI components in this application, agents **MUST** adhere to the following consistency and styling rules to ensure a unified user experience.

## 1. "Code" and Auto-Generated Fields
- **Never use disabled Input fields** for system-generated codes (e.g., Task Code, Master Codes).
- **Rule:** Display the code as inline text. If the code does not exist yet (e.g., during creation), display the placeholder `AUTO-GEN-CODE`.
- **Implementation:** 
  ```tsx
  <div className="flex items-center gap-1.5 h-full pt-4">
    <label className="text-[11px] font-medium text-slate-200 normal-case ml-1">Code:</label>
    <div className="text-xs font-medium text-slate-500 select-none">
      {code || 'AUTO-GEN-CODE'}
    </div>
  </div>
  ```

## 2. Date and Time Formatting
- **Created Date/Time:** Whenever displaying a "Created Date" or "Created On" field, you must **always** include the exact time.
- **Rule:** Use `date-fns` to format dates with the string `'MMM dd, yyyy h:mm a'`.
- **Implementation:** 
  ```tsx
  format(new Date(task.createdDate), 'MMM dd, yyyy h:mm a') 
  // Output: May 25, 2026 10:30 AM
  ```
- **Standard Dates:** For generic dates without time requirements (like Due Date), use `'MMM dd, yyyy'`.

## 3. Table Headers and Typography
- **Column Names:** All dynamic or static table headers must be rendered in Title Case.
- **Rule:** Apply the `capitalize` Tailwind class to `<th>` elements to ensure consistent capitalization.
- **Implementation:**
  ```tsx
  <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-300 capitalize">
    {type} Name
  </th>
  ```

## 4. Dropdowns and Checklists
- **Scrollable Checklists:** When a dropdown contains a checklist of items (like column toggles) with action buttons (Apply/Cancel), the buttons must **always be visible** at the bottom.
- **Rule:** Wrap the checklist items in a scrollable container with a maximum height, and place the action buttons outside the scrollable area.
- **Implementation:**
  ```tsx
  <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
    {/* map items here */}
  </div>
  <DropdownMenuSeparator />
  <div className="flex justify-end gap-0.5 p-2">
    <Button>Cancel</Button>
    <Button>Apply</Button>
  </div>
  ```
- **Searchable Dropdowns:** Long lists in dropdowns should include an inline search `<Input>` at the top to quickly filter options.

## 5. Scrollbars
- **Hidden Scrollbars:** If a scrollbar overlaps UI elements (like sidebar icons) or looks ugly, hide it visually while maintaining scroll functionality.
- **Rule:** Apply the `scrollbar-hide` class to the container instead of `scrollbar-thin`.

## 6. Action Elements Placement (Checkboxes & Filters)
- **Immediate Actions:** Toggles like "Search All Folders" that directly affect list results should be placed in the **top action bar** alongside search inputs, rather than buried inside filter modals.
- **Rule:** Toggling these checkboxes should instantly trigger the search/refresh API call without requiring the user to click "Apply".

## 7. Modal and Dialog Sizing
- **Consistent Widths:** Related modals (e.g., "Add Location", "Add Contact Person") must use the exact same width constraints (e.g., `max-w-4xl`) so they don't visually jump in size.
- **Whitespace Reduction:** Do not use excessively large dialogs for small forms, and conversely, use large dialogs for complex forms to avoid unnecessary internal scrolling. Eliminate excessive margins/padding.

## 8. Typography Consistency
- **Standard Classes:** Use consistent text colors and weights throughout the UI.
- **Rule:** 
  - Section Headers: `text-sm font-medium text-slate-100`
  - Form Labels: `text-[11px] font-medium text-slate-200`
  - Form Values/Inputs: `text-xs text-slate-50`
  - Helper/Minor Text: `text-[10px] text-slate-500`
- Do not mix text sizes arbitrarily. Stick to the predefined Tailwind scales (`text-xs`, `text-sm`) or specific small scales used in the app (`text-[10px]`, `text-[11px]`).

## 9. Common Components
- **Reusability:** Always use the predefined UI components from `@/components/ui` (e.g., `<Input>`, `<Label>`, `<Button>`, `<Select>`, `<Card>`, `<DropdownMenu>`).
- **Rule:** Do not use raw HTML elements like standard `<button>`, `<input>`, or native `<select>` dropdowns unless absolutely necessary. Rely on the Shadcn/Radix primitives customized for this project to ensure a consistent, accessible experience.

## 10. Theme-Based Design
- **Color Palette:** Use the application's standard color scales rather than hardcoding hex values. 
- **Rule:** 
  - **Theme:** Dark by default. Page `#0B1220`, surfaces `#121A2B` / `#151D2E`, borders `#2A3548`, primary `#0EA5E9` (`hover:bg-[#0284C7]`), warm accent `#F59E0B`.
  - **Primary Accents:** Use sky blue `bg-[#0EA5E9]` or `text-[#0EA5E9]` / `text-[#38BDF8]` for primary buttons and brand accents.
  - **Warm Accent:** Use amber `#F59E0B` for high priority badges, pending/open status chips, and attention markers (`bg-[#F59E0B]`, `bg-[#F59E0B]/15 text-[#F59E0B]`).
  - **Neutrals:** Use `slate` scales (`slate-50` to `slate-900`) for all borders, backgrounds, and text, rather than generic `gray`.
  - **Glassmorphism/Depth:** Use modern translucent effects for floating panels or main content areas: `bg-[#121A2B]/80 backdrop-blur-md` or `bg-[#1A2438]/90 backdrop-blur-md shadow-xl`.
  - **Border Radius:** Use heavily rounded corners (`rounded-xl`, `rounded-2xl`, or `rounded-[24px]`) to maintain the modern, soft aesthetic of the application's UI.
