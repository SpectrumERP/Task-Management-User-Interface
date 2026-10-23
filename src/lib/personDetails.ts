import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';
import { employeeService } from '@/services/employeeService';
import { asUserDetails, type UserDetails } from '@/lib/userProfile';
import type { Employee } from '@/types/employee';

/** Who a profile card is about: a login user (security users) or a payroll employee. */
export type PersonRef = { kind: 'user'; loginNo: number } | { kind: 'employee'; empNo: number };

/** Builds a PersonRef from whatever id a screen has; null when there is no usable id. */
export function userRef(loginNo: unknown): PersonRef | null {
  const n = Number(loginNo);
  return Number.isFinite(n) && n > 0 ? { kind: 'user', loginNo: n } : null;
}

export function employeeRef(empNo: unknown): PersonRef | null {
  const n = Number(empNo);
  return Number.isFinite(n) && n > 0 ? { kind: 'employee', empNo: n } : null;
}

export type PersonDetails = { kind: 'user'; user: UserDetails } | { kind: 'employee'; employee: Employee };

// One request per person per session: hovering the same name again (or another avatar of the same
// person) reuses it. A failed request is dropped from the cache, so the next hover tries again.
const cache = new Map<string, Promise<PersonDetails | null>>();
const keyOf = (person: PersonRef) => (person.kind === 'user' ? `u${person.loginNo}` : `e${person.empNo}`);

function fetchPerson(person: PersonRef): Promise<PersonDetails | null> {
  if (person.kind === 'user') {
    return apiService
      .get<{ success: boolean; data: unknown }>(`/api/security/users/load-data/${person.loginNo}`, { silent: true })
      .then((response) => {
        const user = response?.success === false ? null : asUserDetails(response?.data);
        return user ? { kind: 'user' as const, user } : null;
      });
  }
  return employeeService
    .getEmployee(person.empNo, { silent: true })
    .then((employee) => (employee ? { kind: 'employee' as const, employee } : null));
}

export function loadPersonDetails(person: PersonRef): Promise<PersonDetails | null> {
  const key = keyOf(person);
  let pending = cache.get(key);
  if (!pending) {
    pending = fetchPerson(person);
    cache.set(key, pending);
    pending.catch(() => cache.delete(key));
  }
  return pending;
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; details: PersonDetails | null }
  | { status: 'error' };

/** Loads a person's details once `enabled` turns true (the card opened). */
export function usePersonDetails(person: PersonRef | null, enabled: boolean): LoadState {
  const key = person ? keyOf(person) : '';
  const [state, setState] = useState<{ key: string; value: LoadState }>({ key: '', value: { status: 'idle' } });

  useEffect(() => {
    if (!person || !enabled) return;
    let cancelled = false;
    loadPersonDetails(person).then(
      (details) => {
        if (!cancelled) setState({ key, value: { status: 'ready', details } });
      },
      () => {
        if (!cancelled) setState({ key, value: { status: 'error' } });
      }
    );
    return () => {
      cancelled = true;
    };
    // `key` identifies the person; the object itself is rebuilt every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  if (state.key !== key) return enabled && person ? { status: 'loading' } : { status: 'idle' };
  return state.value;
}
