"""
Timetable Scheduler — Constraint-based timetable generation.

Constraints enforced:
1. Monday–Friday, 8 AM – 6 PM
2. No classes Wednesday 10 AM – 12 PM
3. 1-unit → 1 hr, 2-unit → 2 hr, 3+ → multiple sessions (max 2 hr each)
4. Hall capacity must fit student count (not too small, not > 3× too large)
5. Hall must match course department(s)
6. No double-booking of halls or lecturers
7. Lecturers cannot teach on their unavailable days
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


def get_suitable_halls(course):
    """Find halls matching capacity and department constraints."""
    student_count = course.student_count
    departments = course.get_all_departments()
    dept_ids = set(departments.values_list('id', flat=True))

    suitable = []
    for hall in LectureHall.objects.prefetch_related('departments').all():
        # Capacity check
        if hall.capacity < student_count:
            continue
        if hall.capacity > student_count * CAPACITY_UPPER_MULTIPLIER:
            continue

        # Department compatibility
        if hall.hall_type == 'general':
            suitable.append(hall)
        elif hall.hall_type in ('shared', 'department'):
            hall_dept_ids = set(hall.departments.values_list('id', flat=True))
            if dept_ids & hall_dept_ids:        # intersection: at least one dept matches
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
    """
    Check if the student group (department + level) is already busy.
    """
    course_depts = set(course.get_all_departments().values_list('id', flat=True))
    course_level = course.level
    
    for entry in existing_entries:
        if entry.course.level == course_level and entry.time_slot.day == time_slot.day:
            if (time_slot.start_hour < entry.time_slot.end_hour and
                    time_slot.end_hour > entry.time_slot.start_hour):
                entry_depts = set(entry.course.get_all_departments().values_list('id', flat=True))
                # If they share any department, it's a conflict for those students!
                if course_depts & entry_depts:
                    return False
    return True


def generate_timetable():
    """
    Generate timetable using greedy constraint-satisfaction.
    Returns (success, message, unscheduled_list).
    """
    TimetableEntry.objects.all().delete()
    generate_time_slots()

    courses = Course.objects.filter(
        lecturer__isnull=False
    ).select_related('lecturer', 'department').order_by('-student_count')

    if not courses.exists():
        return False, "No courses with assigned lecturers found.", []

    existing_entries = []
    unscheduled = []
    scheduled_count = 0
    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

    for course in courses:
        lecturer = course.lecturer
        session_durations = course.get_session_durations()
        suitable_halls = get_suitable_halls(course)

        if not suitable_halls:
            unscheduled.append({
                'course': course,
                'reason': f"No suitable halls (need cap ≥ {course.student_count}, dept: {course.department.name})"
            })
            continue

        for sess_idx, duration in enumerate(session_durations):
            placed = False
            slots = TimeSlot.objects.annotate(
                dur=db_models.F('end_hour') - db_models.F('start_hour')
            ).filter(dur=duration).order_by('start_hour')

            days_to_try = list(day_order)
            # Spread multi-session courses across different days
            if sess_idx > 0:
                used = [e.time_slot.day for e in existing_entries if e.course_id == course.id]
                for d in used:
                    if d in days_to_try:
                        days_to_try.remove(d)
                        days_to_try.append(d)

            for day in days_to_try:
                if placed:
                    break
                for slot in slots.filter(day=day):
                    if not is_lecturer_available(lecturer, slot, existing_entries):
                        continue
                    if not is_student_group_available(course, slot, existing_entries):
                        continue
                    for hall in suitable_halls:
                        if is_hall_available(hall, slot, existing_entries):
                            entry = TimetableEntry.objects.create(
                                course=course, lecturer=lecturer,
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
                    'course': course,
                    'reason': f"No slot for session {sess_idx+1} ({duration}hr)"
                })

    total = sum(len(c.get_session_durations()) for c in courses)
    msg = f"Scheduled {scheduled_count}/{total} sessions."
    if unscheduled:
        msg += f" {len(unscheduled)} could not be scheduled."

    return len(unscheduled) == 0, msg, unscheduled
