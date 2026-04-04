/**
 * Client-side API wrappers for the scheduling system.
 */

async function fetcher(url: string, method: string = 'GET', body?: any) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return await res.json();
}

export const GET_departments = () => fetcher('/api/admin/scheduling/departments');
export const POST_department = (data: any) => fetcher('/api/admin/scheduling/departments', 'POST', data);

export const GET_courses = () => fetcher('/api/admin/scheduling/courses');
export const POST_course = (data: any) => fetcher('/api/admin/scheduling/courses', 'POST', data);

export const GET_subjects = () => fetcher('/api/admin/scheduling/subjects');
export const POST_subject = (data: any) => fetcher('/api/admin/scheduling/subjects', 'POST', data);
export const DELETE_subject = (id: string) => fetcher(`/api/admin/scheduling/subjects?id=${id}`, 'DELETE');

export const GET_groups = () => fetcher('/api/admin/scheduling/groups');
export const POST_group = (data: any) => fetcher('/api/admin/scheduling/groups', 'POST', data);

export const POST_room = (data: any) => fetcher('/api/admin/scheduling/rooms', 'POST', data);
export const POST_slot = (data: any) => fetcher('/api/admin/scheduling/slots', 'POST', data);
