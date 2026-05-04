export type OrgType = 
  | 'university' 
  | 'school' 
  | 'college' 
  | 'corporate' 
  | 'hospital' 
  | 'manufacturing' 
  | 'retail' 
  | 'government';

export type TenantType = 'EDUCATION' | 'COMPANY' | 'HEALTHCARE' | 'GOVERNMENT' | 'OTHER';

import type { Permission } from '@/lib/auth/rbac';

export type TenantModuleKey = 
  | 'leave' 
  | 'attendance' 
  | 'payroll' 
  | 'performance' 
  | 'recruitment' 
  | 'documents'
  | 'biometric'
  | 'scheduling';

export interface TenantModules {
  leave: boolean;
  attendance: boolean;
  payroll: boolean;
  performance: boolean;
  recruitment: boolean;
  documents: boolean;
  biometric?: boolean;
  scheduling?: boolean;
}

export interface TenantBranding {
  logo_url?: string | null;
  accent_color?: string;
  app_name?: string;
}

export interface TenantHierarchySettings {
  reporting_type: 'linear' | 'matrix' | 'departmental';
  require_dept_head: boolean;
  label_vocabulary: 'university' | 'corporate' | 'healthcare' | 'custom';
  custom_labels?: {
    employee?: string;
    department?: string;
    employee_id?: string;
    level_1?: string; // e.g. Division
    level_2?: string; // e.g. Department
    level_3?: string; // e.g. Team
  };
}

/** Leave rules enforced in `/api/leave/requests` and shown on the Leave page. */
export interface LeavePolicySettings {
  /** Minimum calendar days between today and leave start (0 = same day allowed). */
  advance_notice_days?: number;
  /** Max consecutive calendar days per request (0 = no cap). */
  max_consecutive_days?: number;
  /** Max approved overlapping leaves per department for the same date window. */
  dept_max_concurrent_approved?: number;
  /** For sick leave (code SL or name contains "sick"), certificate required above this many days. */
  sick_leave_max_days_without_certificate?: number;
  /** Optional copy shown in the Leave policy panel. */
  summary_text?: string;
}

export const DEFAULT_LEAVE_POLICY: Required<
  Pick<
    LeavePolicySettings,
    | 'advance_notice_days'
    | 'max_consecutive_days'
    | 'dept_max_concurrent_approved'
    | 'sick_leave_max_days_without_certificate'
  >
> = {
  advance_notice_days: 0,
  max_consecutive_days: 0,
  dept_max_concurrent_approved: 2,
  sick_leave_max_days_without_certificate: 2,
};

/** Optional tenant defaults (users can override per device in Appearance settings). */
export interface TenantAppearanceSettings {
  /** Suggested accent preset id for onboarding docs only; client uses local `hr-appearance` store. */
  suggested_color_preset?: 'navy' | 'ocean' | 'emerald' | 'violet' | 'amber';
}

export interface TenantSettings {
  hierarchy: TenantHierarchySettings;
  modules: TenantModules;
  branding: TenantBranding;
  roles?: Record<string, Permission[]>; // Custom role-permission overrides
  leave_policy?: LeavePolicySettings;
  appearance?: TenantAppearanceSettings;
  onboarding?: {
    structure_source: string;
    template_used: string | null;
    completed: boolean;
  };
}
