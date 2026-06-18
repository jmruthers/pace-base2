export interface UnitRow {
  [key: string]: unknown;
  id: string;
  unit_number: number;
  unit_name: string | null;
  subcamp: string | null;
  contingent: string | null;
  parent_unit_id: string | null;
  event_id: string;
  capacity?: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UnitRoleTypeRow {
  [key: string]: unknown;
  id: string;
  role_title: string;
  event_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface PersonReference {
  preferred_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export interface ApprovedApplicationRow {
  id: string;
  status: 'approved';
  person: PersonReference | null;
}

export interface UnitRoleAssignmentRow {
  id: string;
  unit_id: string;
  application_id: string;
  role_type_id: string | null;
  role_type: {
    id: string;
    role_title: string;
  } | null;
  application: {
    id: string;
    status: string;
    person: PersonReference | null;
  } | null;
}

export interface UnitAssignmentTableRow {
  [key: string]: unknown;
  id: string;
  application_id: string;
  applicant_name: string;
  applicant_email: string;
  application_status: string;
  assigned_role: string | null;
  role_assignment_id: string | null;
  role_type_id: string | null;
}

export interface ActivitySessionRow {
  id: string;
  session_name: string | null;
  start_time: string | null;
  end_time: string | null;
  offering_id: string | null;
  capacity: number | null;
}

export interface ActivityPreferenceRow {
  id: string;
  unit_id: string;
  session_id: string;
  rank: number;
  submitted_at: string | null;
  submitted_by: string | null;
  event_id: string;
}

export interface SubmitPreferencesResult {
  unit_id: string;
  event_id: string;
  submitted_at: string;
  submitted_by: string;
  preferences_submitted: number;
}
