"""
Timetable Scheduler — Constraint-based timetable generation.

Constraints enforced:
1. Monday–Friday, 8 AM – 6 PM
2. No classes Wednesday 10 AM – 12 PM
3. 1-unit → 1 hr, 2-unit → 2 hr, 3+ → multiple sessions (max 2 hr each)
4. Hall capacity must fit TOTAL student count of the session
5. Hall must match course department(s)
6. No double-booking of halls or lecturers
7. Lecturers cannot teach on their unavailable days
8. Cross-listed courses (shared_session_id) share the same slot and hall
"""

from django.db import models as db_models
from .models import (
    Course, LectureHall, Lecturer, TimeSlot, TimetableEntry,
    LecturerUnavailability, Department
)

CAPACITY_UPPER_MULTIPLIER = 3


def generate_time_slots():
    """Create all valid time slots in the database."""
    TimeSlot.objects.all().delete()
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    created = []

    for day in days:
        for start in range(8, 18):
            for duration in [1, 2]:
                end = start + duration
                if end > 18:
                    continue
                # Wednesday: skip anything overlapping 10-12
                if day == 'Wednesday' and start < 12 and end > 10:
                    continue
                slot, is_new = TimeSlot.objects.get_or_create(
                    day=day, start_hour=start, end_hour=end
                )
                if is_new:
                    created.append(slot)
    return created


def get_suitable_halls(total_student_count, department_ids):
    """Find halls matching capacity and department constraints for a group."""
    suitable = []
    for hall in LectureHall.objects.prefetch_related('departments').all():
        # Capacity check
        if hall.capacity < total_student_count:
            continue
        if hall.capacity > total_student_count * CAPACITY_UPPER_MULTIPLIER:
            continue

        # Department compatibility
        if hall.hall_type == 'general':
            suitable.append(hall)
        elif hall.hall_type in ('shared', 'department'):
            hall_dept_ids = set(hall.departments.values_list('id', flat=True))
            if department_ids & hall_dept_ids:
                suitable.append(hall)

    suitable.sort(key=lambda h: h.capacity)
    return suitable


def is_lecturer_available(lecturer, time_slot, existing_entries):
    if LecturerUnavailability.objects.filter(
        lecturer=lecturer, day=time_slot.day
    ).exists():
        return False

    for entry in existing_entries:
        if entry.lecturer_id == lecturer.id and entry.time_slot.day == time_slot.day:
            if (time_slot.start_hour < entry.time_slot.end_hour and
                    time_slot.end_hour > entry.time_slot.start_hour):
                return False
    return True


def is_hall_available(hall, time_slot, existing_entries):
    for entry in existing_entries:
        if entry.hall_id == hall.id and entry.time_slot.day == time_slot.day:
            if (time_slot.start_hour < entry.time_slot.end_hour and
                    time_slot.end_hour > entry.time_slot.start_hour):
                return False
    return True


def is_student_group_available(course, time_slot, existing_entries):
    """Check if the student group (department + level) is already busy."""
    course_depts = set(course.get_all_departments().values_list('id', flat=True))
    course_level = course.level
    
    for entry in existing_entries:
        if entry.course.level == course_level and entry.time_slot.day == time_slot.day:
            if (time_slot.start_hour < entry.time_slot.end_hour and
                    time_slot.end_hour > entry.time_slot.start_hour):
                entry_depts = set(entry.course.get_all_departments().values_list('id', flat=True))
                if course_depts & entry_depts:
                    return False
    return True


def generate_timetable():
    """Generate timetable handling cross-listed course groups."""
    TimetableEntry.objects.all().delete()
    generate_time_slots()

    # 1. Fetch all courses and group them
    all_courses = Course.objects.filter(
        lecturer__isnull=False
    ).select_related('lecturer', 'department').prefetch_related('shared_departments')

    if not all_courses.exists():
        return False, "No courses with assigned lecturers found.", []

    groups = {}
    for course in all_courses:
        gid = course.shared_session_id if course.shared_session_id else f"SINGLE_{course.id}"
        if gid not in groups:
            groups[gid] = []
        groups[gid].append(course)

    # 2. Convert groups to list and order by hardest to place (largest total student count)
    group_list = []
    for gid, courses in groups.items():
        total_students = sum(c.student_count for c in courses)
        # All courses in a group must have the same hours/units usually. 
        # We'll take the max hours just in case.
        max_hours = max(c.hours for c in courses)
        group_list.append({
            'id': gid,
            'courses': courses,
            'total_students': total_students,
            'max_hours': max_hours,
            'lecturer': courses[0].lecturer # Same lecturer for all in group
        })

    group_list.sort(key=lambda g: g['total_students'], reverse=True)

    existing_entries = []
    unscheduled = []
    scheduled_count = 0
    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

    for group in group_list:
        courses = group['courses']
        lecturer = group['lecturer']
        total_students = group['total_students']
        
        # Get session durations from the group (assuming they all match)
        # If they don't match, we take the FIRST course as the master for sessions
        session_durations = courses[0].get_session_durations()
        
        # Collect all department IDs involved in this session
        all_dept_ids = set()
        for c in courses:
            all_dept_ids.update(c.get_all_departments().values_list('id', flat=True))

        suitable_halls = get_suitable_halls(total_students, all_dept_ids)

        if not suitable_halls:
            unscheduled.append({
                'course': courses[0],
                'reason': f"No suitable halls for group {group['id']} (Cap: {total_students})"
            })
            continue

        for sess_idx, duration in enumerate(session_durations):
            placed = False
            slots = TimeSlot.objects.annotate(
                dur=db_models.F('end_hour') - db_models.F('start_hour')
            ).filter(dur=duration).order_by('start_hour')

            days_to_try = list(day_order)
            if sess_idx > 0:
                # Avoid same day for sessions of the same course
                used = [e.time_slot.day for e in existing_entries if e.course_id == courses[0].id]
                for d in used:
                    if d in days_to_try:
                        days_to_try.remove(d)
                        days_to_try.append(d)

            for day in days_to_try:
                if placed:
                    break
                for slot in slots.filter(day=day):
                    # Check lecturer availability
                    if not is_lecturer_available(lecturer, slot, existing_entries):
                        continue
                        
                    # Check student group availability for EVERY course in the cross-listing
                    possible = True
                    for c in courses:
                        if not is_student_group_available(c, slot, existing_entries):
                            possible = False
                            break
                    if not possible:
                        continue

                    # Check hall availability
                    for hall in suitable_halls:
                        if is_hall_available(hall, slot, existing_entries):
                            # SUCCESS! Create entries for ALL courses in the group
                            for c in courses:
                                entry = TimetableEntry.objects.create(
                                    course=c, lecturer=lecturer,
                                    hall=hall, time_slot=slot,
                                    session_number=sess_idx + 1
                                )
                                existing_entries.append(entry)
                                scheduled_count += 1
                            placed = True
                            break
                    if placed:
                        break

            if not placed:
                unscheduled.append({
                    'course': courses[0],
                    'reason': f"No slot for group {group['id']} session {sess_idx+1}"
                })

    total_sessions = 0
    for g in group_list:
        total_sessions += len(g['courses']) * len(g['courses'][0].get_session_durations())

    msg = f"Scheduled {scheduled_count}/{total_sessions} course sessions."
    if unscheduled:
        msg += f" {len(unscheduled)} groups could not be scheduled."

    return len(unscheduled) == 0, msg, unscheduled
