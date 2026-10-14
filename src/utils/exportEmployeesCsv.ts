import type { Employee } from '@/types/employee';

const COLUMNS: { header: string; value: (e: Employee) => string }[] = [
  { header: 'Employee Name', value: (e) => e.empName },
  { header: 'Employee ID', value: (e) => e.empCode },
  { header: 'Department', value: (e) => e.department },
  { header: 'Job Description', value: (e) => e.jobDescription },
  { header: 'Company Name', value: (e) => e.companyName },
  { header: 'Work Location', value: (e) => e.workLocation },
  { header: 'Email', value: (e) => e.email },
  { header: 'Phone No.', value: (e) => e.phone },
  { header: 'Extension Number', value: (e) => e.extension },
];

function csvCell(value: string): string {
  // Neutralise spreadsheet formulas, then quote per RFC 4180.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function exportEmployeesCsv(employees: Employee[], filename = 'Employees.csv') {
  if (employees.length === 0) return;
  const lines = [
    COLUMNS.map((c) => csvCell(c.header)).join(','),
    ...employees.map((e) => COLUMNS.map((c) => csvCell(c.value(e) || '')).join(',')),
  ];
  // BOM so Excel opens UTF-8 names correctly.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
