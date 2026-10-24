import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  Hash,
  IdCard,
  Mail,
  MapPin,
  Network,
  Phone,
  PhoneForwarded,
  UserRound,
} from 'lucide-react';
import { AppBreadcrumbBar } from '@/components/layout/AppBreadcrumbBar';
import { Button } from '@/components/ui/button';
import { SkeletonProfile } from '@/components/ui/skeleton';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import {
  EmployeeAvatar,
  EmployeeFieldRow,
  EmployeeSection,
  EmployeeStatusPill,
} from '@/components/employee/employeeShared';
import { employeeService } from '@/services/employeeService';
import { formatDateOnly } from '@/lib/dateTime';
import type { Employee } from '@/types/employee';

export default function EmployeeProfilePage() {
  const { empNo: empNoParam } = useParams();
  const navigate = useNavigate();
  const empNo = Number(empNoParam);

  const invalid = !Number.isFinite(empNo) || empNo <= 0;

  // One result per employee + retry; loading is "no result for the current request yet".
  const [reloadNonce, setReloadNonce] = useState(0);
  const requestKey = `${empNo}:${reloadNonce}`;
  const [result, setResult] = useState<{ key: string; employee: Employee | null; error: string | null } | null>(null);

  useEffect(() => {
    if (invalid) return;
    let cancelled = false;
    employeeService
      .getEmployee(empNo)
      .then((found) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          employee: found,
          error: found ? null : 'This employee could not be found.',
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load employee:', err);
        setResult({ key: requestKey, employee: null, error: 'Could not load this employee. Please try again.' });
      });
    return () => {
      cancelled = true;
    };
  }, [empNo, invalid, requestKey]);

  const isLoading = !invalid && result?.key !== requestKey;
  const employee = isLoading ? null : result?.employee ?? null;
  const error = invalid ? 'Invalid employee.' : isLoading ? null : result?.error ?? null;
  const load = () => setReloadNonce((n) => n + 1);

  const goBack = () => navigate('/employees');
  const date = (value: string) => (value ? formatDateOnly(value, '') : '');

  return (
    <main className="page-shell gap-4">
      <AppBreadcrumbBar
        items={[
          { label: 'Employee Directory', href: '/employees' },
          { label: employee?.empName || 'Employee Profile', current: true },
        ]}
        bleed
        className="mb-[var(--page-gap)]"
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            className="h-8 px-3 text-[12px] font-semibold gap-1.5 rounded-[7px] border-[var(--tm-border)] bg-[var(--tm-surface)] text-slate-500 hover:bg-[var(--tm-muted)]"
          >
            <ArrowLeft size={14} />
            Back
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-sleek -mx-[var(--page-pad-x)] px-[var(--page-pad-x)]">
        {isLoading ? (
          <div className="min-h-[240px] rounded-[16px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)]">
            <SkeletonProfile label="Loading employee" />
          </div>
        ) : error || !employee ? (
          <LoadErrorState
            title="Couldn’t load employee"
            description={error || 'This employee could not be found.'}
            onRetry={load}
            className="h-full"
          />
        ) : (
          <div className="flex flex-col gap-4 pb-2">
            {/* Identity header */}
            <section className="flex flex-col gap-4 rounded-[8px] border border-[var(--tm-border)] bg-[var(--tm-surface)] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:flex-row sm:items-center sm:p-5">
              <EmployeeAvatar employee={employee} className="h-20 w-20 text-xl ring-2 ring-[var(--tm-border)]" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="min-w-0 text-[22px] font-bold tracking-tight text-slate-50">
                    {employee.empName || '—'}
                  </h1>
                  <EmployeeStatusPill status={employee.status} />
                </div>
                {employee.empCode ? (
                  <p className="mt-0.5 text-[13px] font-semibold text-[#1E56A0] dark:text-[#4f86d1]">{employee.empCode}</p>
                ) : null}
                <p className="mt-1 text-[13px] text-slate-300">{employee.department || '—'}</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {employee.email ? (
                  <a
                    href={`mailto:${employee.email}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[7px] border border-[var(--tm-border)] bg-[var(--tm-surface)] px-3.5 text-[13px] font-semibold text-slate-500 hover:bg-[var(--tm-muted)]"
                  >
                    <Mail size={14} />
                    Email
                  </a>
                ) : null}
                {employee.phone ? (
                  <a
                    href={`tel:${employee.phone.replace(/\s+/g, '')}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[7px] border border-[var(--tm-border)] bg-[var(--tm-surface)] px-3.5 text-[13px] font-semibold text-slate-500 hover:bg-[var(--tm-muted)]"
                  >
                    <Phone size={14} />
                    Call
                  </a>
                ) : null}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <EmployeeSection title="Overview" icon={IdCard}>
                <EmployeeFieldRow icon={Hash} label="Employee ID" value={employee.empCode} />
                <EmployeeFieldRow icon={UserRound} label="Employee Name" value={employee.empName} />
                <EmployeeFieldRow icon={Building2} label="Company Name" value={employee.companyName} />
                <EmployeeFieldRow icon={MapPin} label="Work Location" value={employee.workLocation} />
              </EmployeeSection>

              <EmployeeSection title="Job Details" icon={Briefcase}>
                <EmployeeFieldRow icon={Network} label="Department" value={employee.department} />
                <EmployeeFieldRow icon={FileText} label="Job Description" value={employee.jobDescription} />
                <EmployeeFieldRow icon={CalendarDays} label="Date of Joining" value={date(employee.dateOfJoining)} />
                <EmployeeFieldRow icon={Briefcase} label="Employment Type" value={employee.employmentType} />
                <EmployeeFieldRow icon={Hash} label="Grade" value={employee.grade} />
              </EmployeeSection>

              <EmployeeSection title="Contact" icon={Phone}>
                <EmployeeFieldRow
                  icon={Mail}
                  label="Email"
                  value={employee.email}
                  href={employee.email ? `mailto:${employee.email}` : undefined}
                />
                <EmployeeFieldRow
                  icon={Phone}
                  label="Phone No."
                  value={employee.phone}
                  href={employee.phone ? `tel:${employee.phone.replace(/\s+/g, '')}` : undefined}
                />
                <EmployeeFieldRow icon={PhoneForwarded} label="Extension Number" value={employee.extension} />
              </EmployeeSection>

              <EmployeeSection title="Personal" icon={UserRound}>
                <EmployeeFieldRow icon={UserRound} label="Gender" value={employee.gender} />
                <EmployeeFieldRow icon={CalendarDays} label="Date of Birth" value={date(employee.dateOfBirth)} />
                <EmployeeFieldRow icon={MapPin} label="Address" value={employee.address} />
              </EmployeeSection>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
