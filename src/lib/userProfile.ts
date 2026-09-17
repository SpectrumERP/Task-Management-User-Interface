/** Shared mapping for /api/security/users/load-data/{loginNo} payloads. */

export type UserDetails = Record<string, unknown>;

export type MappedUserProfile = {
  name: string;
  userName: string;
  email: string;
  phone: string;
  userTypeName: string;
  roles: string;
  responsibility: string;
  company: string;
  location: string;
  reportTo: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function asUserDetails(value: unknown): UserDetails | null {
  return asRecord(value);
}

function firstString(...candidates: unknown[]): string {
  for (const c of candidates) {
    if (c == null) continue;
    if (typeof c === 'string' || typeof c === 'number') {
      const s = String(c).trim();
      if (s) return s;
    }
    const obj = asRecord(c);
    if (obj) {
      const nested = firstString(
        obj.displayName,
        obj.DisplayName,
        obj.printingName,
        obj.PrintingName,
        obj.loginId,
        obj.LoginId,
        obj.userName,
        obj.UserName,
        obj.name,
        obj.Name,
        obj.companyName,
        obj.CompanyName,
        obj.locationName,
        obj.LocationName,
        obj.roleName,
        obj.RoleName,
        obj.role,
        obj.Role
      );
      if (nested) return nested;
    }
  }
  return '';
}

function formatList(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => firstString(item))
      .filter(Boolean)
      .join(', ');
  }
  return firstString(value);
}

function pickField(data: UserDetails, keys: string[]): string {
  for (const key of keys) {
    if (key in data) {
      const formatted = formatList(data[key]);
      if (formatted) return formatted;
    }
  }
  return '';
}

export function getUserInitials(name?: string, initials?: string): string {
  if (initials) return initials;
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function mapUserProfile(
  data: UserDetails | null | undefined,
  fallbackDisplayName?: string
): MappedUserProfile {
  if (!data) {
    return {
      name: fallbackDisplayName || '',
      userName: '',
      email: '',
      phone: '',
      userTypeName: '',
      roles: '',
      responsibility: '',
      company: '',
      location: '',
      reportTo: '',
    };
  }

  return {
    name: firstString(
      data.displayName,
      data.DisplayName,
      data.printingName,
      data.PrintingName,
      fallbackDisplayName
    ),
    userName: firstString(data.userName, data.UserName, data.loginId, data.LoginId),
    email: firstString(data.email, data.Email),
    phone: firstString(data.phoneNo, data.PhoneNo, data.phone, data.Phone),
    userTypeName: firstString(data.userTypeName, data.UserTypeName),
    roles: pickField(data, [
      'roles',
      'Roles',
      'roleName',
      'RoleName',
      'role',
      'Role',
      'userRoles',
      'UserRoles',
      'userRole',
      'UserRole',
    ]),
    responsibility: pickField(data, [
      'responsibility',
      'Responsibility',
      'jobDescription',
      'JobDescription',
      'designation',
      'Designation',
      'jobTitle',
      'JobTitle',
      'position',
      'Position',
    ]),
    company: pickField(data, [
      'companyName',
      'CompanyName',
      'company',
      'Company',
      'organization',
      'Organization',
    ]),
    location: pickField(data, [
      'locationName',
      'LocationName',
      'location',
      'Location',
      'officeLocation',
      'OfficeLocation',
    ]),
    reportTo: pickField(data, [
      'reportTo',
      'ReportTo',
      'reportingTo',
      'ReportingTo',
      'reportToName',
      'ReportToName',
      'manager',
      'Manager',
      'reportsTo',
      'ReportsTo',
    ]),
  };
}

export function userProfilePath(loginNo: number | string): string {
  return `/users/${loginNo}`;
}
