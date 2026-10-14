/** Employee Directory row, normalised from the payroll employees API. */
export interface Employee {
  empNo: number;
  empCode: string;
  empName: string;
  designation: string;
  department: string;
  jobDescription: string;
  companyName: string;
  workLocation: string;
  email: string;
  phone: string;
  extension: string;
  /** e.g. Active / Inactive / Resigned — empty when the API does not send one */
  status: string;
  photoUrl: string;
  reportingTo: string;
  dateOfJoining: string;
  employmentType: string;
  grade: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  /** Untouched API payload, for the full profile's "More" section */
  raw: Record<string, unknown>;
}
