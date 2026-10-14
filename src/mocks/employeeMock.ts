import type { Employee } from '@/types/employee';

/**
 * Sample employees for the Employee Directory when the payroll API is unavailable (or forced via
 * VITE_EMPLOYEE_DIRECTORY_SOURCE=mock). Deterministic, so the same data shows on every load.
 * empNo starts at MOCK_EMP_NO_START so mock ids never clash with real payroll ids.
 */
export const MOCK_EMP_NO_START = 900001;

const PEOPLE: [string, 'Male' | 'Female'][] = [
  ['Aarav Sharma', 'Male'], ['Priya Verma', 'Female'], ['Rohit Kumar', 'Male'], ['Sneha Patel', 'Female'],
  ['Vikram Singh', 'Male'], ['Ananya Iyer', 'Female'], ['Karan Mehta', 'Male'], ['Neha Gupta', 'Female'],
  ['Arjun Nair', 'Male'], ['Pooja Reddy', 'Female'], ['Siddharth Joshi', 'Male'], ['Kavya Menon', 'Female'],
  ['Rahul Desai', 'Male'], ['Isha Kapoor', 'Female'], ['Manish Agarwal', 'Male'], ['Divya Pillai', 'Female'],
  ['Amit Chauhan', 'Male'], ['Ritu Malhotra', 'Female'], ['Nikhil Bansal', 'Male'], ['Shreya Das', 'Female'],
  ['Deepak Yadav', 'Male'], ['Meera Kulkarni', 'Female'], ['Harsh Vardhan', 'Male'], ['Tanvi Saxena', 'Female'],
  ['Gaurav Mishra', 'Male'], ['Nisha Rao', 'Female'], ['Abhishek Tiwari', 'Male'], ['Swati Jain', 'Female'],
  ['Varun Khanna', 'Male'], ['Pallavi Bhatt', 'Female'], ['Sameer Qureshi', 'Male'], ['Aditi Banerjee', 'Female'],
  ['Kunal Arora', 'Male'], ['Ritika Sinha', 'Female'], ['Mohit Pandey', 'Male'], ['Simran Kaur', 'Female'],
];

const ROLES: [designation: string, department: string, grade: string, jobDescription: string][] = [
  ['Senior Software Engineer', 'Engineering', 'L4', 'Designs, builds and maintains core applications; reviews code and mentors engineers.'],
  ['Product Manager', 'Product', 'L5', 'Owns the product roadmap, gathers requirements and prioritises releases with stakeholders.'],
  ['UI/UX Designer', 'Design', 'L3', 'Creates user flows, wireframes and visual designs; runs usability reviews.'],
  ['Business Analyst', 'Business Analysis', 'L3', 'Documents business processes, writes requirements and supports user acceptance testing.'],
  ['Project Manager', 'Project Management', 'L5', 'Plans and tracks project delivery, manages risks, budgets and client communication.'],
  ['HR Executive', 'Human Resources', 'L2', 'Handles recruitment, onboarding, employee records and HR policy queries.'],
  ['Accounts Officer', 'Finance', 'L2', 'Processes invoices and payments, reconciles accounts and supports month-end closing.'],
  ['Sales Manager', 'Sales', 'L4', 'Drives regional sales targets, manages key accounts and leads the sales team.'],
  ['Procurement Executive', 'Procurement', 'L2', 'Sources vendors, raises purchase orders and follows up on deliveries.'],
  ['Quality Engineer', 'Quality Assurance', 'L3', 'Inspects material and processes against quality standards and reports deviations.'],
  ['Logistics Coordinator', 'Logistics', 'L2', 'Schedules shipments, coordinates with transporters and tracks dispatch documents.'],
  ['Software Engineer', 'Engineering', 'L3', 'Develops and tests application features and fixes reported issues.'],
];

const LOCATIONS = ['Noida', 'Gurgaon', 'Mumbai', 'Pune', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad'];
const EMPLOYMENT_TYPES = ['Permanent', 'Permanent', 'Permanent', 'Contract'];

function pad(n: number, width: number) {
  return String(n).padStart(width, '0');
}

function buildMockEmployees(): Employee[] {
  return PEOPLE.map(([name, gender], i) => {
    const [designation, department, grade, jobDescription] = ROLES[i % ROLES.length];
    const [first, last] = name.toLowerCase().split(' ');
    const empNo = MOCK_EMP_NO_START + i;
    // Every 9th employee is inactive so the status pill / filter has something to show.
    const status = i % 9 === 8 ? 'Inactive' : 'Active';
    const joinYear = 2016 + (i % 9);
    const managerIndex = i < 6 ? 4 : i % 6;

    const employee: Omit<Employee, 'raw'> = {
      empNo,
      empCode: `EMP-${pad(124 + i, 5)}`,
      empName: name,
      designation,
      department,
      jobDescription,
      companyName: 'Steel Mont',
      workLocation: LOCATIONS[i % LOCATIONS.length],
      email: `${first}.${last}@steelmont.com`,
      phone: `+91 98765 ${pad(43210 + i, 5)}`,
      extension: String(1012 + i),
      status,
      photoUrl: '',
      reportingTo: managerIndex === i ? '' : PEOPLE[managerIndex][0],
      dateOfJoining: `${joinYear}-${pad((i % 12) + 1, 2)}-${pad((i % 27) + 1, 2)}`,
      employmentType: EMPLOYMENT_TYPES[i % EMPLOYMENT_TYPES.length],
      grade,
      gender,
      dateOfBirth: `${1985 + (i % 14)}-${pad(((i * 5) % 12) + 1, 2)}-${pad(((i * 7) % 27) + 1, 2)}`,
      address: `${12 + i}, Sector ${15 + (i % 40)}, ${LOCATIONS[i % LOCATIONS.length]}`,
    };
    return { ...employee, raw: { ...employee, source: 'mock' } };
  });
}

export const MOCK_EMPLOYEES: Employee[] = buildMockEmployees();

export function isMockEmpNo(empNo: number): boolean {
  return empNo >= MOCK_EMP_NO_START && empNo < MOCK_EMP_NO_START + MOCK_EMPLOYEES.length;
}
